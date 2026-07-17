package com.shotchart.nba.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.ContentBlock;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.Tool;
import com.anthropic.models.messages.ToolResultBlockParam;
import com.anthropic.models.messages.ToolUseBlock;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Answers free-text player questions by handing Claude a small set of tools
 * backed by {@link NbaStatsService} and running a manual tool-use loop:
 * Claude decides which player and which tool(s) to call, this service
 * executes them against the same data the browse pages use, and Claude turns
 * the JSON result into a natural-language answer.
 */
@Service
public class ChatService {

    private static final int MAX_TURNS = 5;

    private static final String SYSTEM_PROMPT = """
            You are a helpful assistant that answers questions about NBA players using the provided tools.
            Whenever the user refers to a player by name, call search_player first to resolve their name to a
            numeric player ID before calling any other tool. If search_player returns multiple plausible matches,
            pick the most likely one (prefer active players) rather than asking the user to disambiguate, unless
            the matches are genuinely ambiguous. Answer in plain, conversational language - do not dump raw JSON
            back to the user. If a tool call fails or a player can't be found, say so clearly instead of guessing.

            Format your answer with Markdown when it improves readability:
            - Use a Markdown table with a header row whenever you present multi-row data, such as season-by-season
              career stats or a shot-zone breakdown. Do not use a table for a single fact or a short sentence.
            - Use **bold** around the specific number or fact that most directly answers the user's question, so it
              stands out (e.g. "He averaged **24.5** points per game in 2023-24").
            Don't overuse formatting - only reach for a table when there are genuinely multiple rows to compare, and
            only bold the one or two key figures per answer, not entire sentences.
            """;

    @Autowired
    private NbaStatsService nbaStatsService;

    private final ObjectMapper mapper = new ObjectMapper();
    private final AnthropicClient client = AnthropicOkHttpClient.fromEnv();

    private final Tool searchPlayerTool = Tool.builder()
            .name("search_player")
            .description("Search for an NBA player by (partial) name and get back candidate matches with "
                    + "their numeric player ID. Call this first whenever the user refers to a player by name.")
            .inputSchema(Tool.InputSchema.builder()
                    .properties(Tool.InputSchema.Properties.builder()
                            .putAdditionalProperty("query", JsonValue.from(Map.of(
                                    "type", "string",
                                    "description", "Player name or partial name, e.g. 'Jalen Brunson'")))
                            .build())
                    .required(List.of("query"))
                    .build())
            .build();

    private final Tool getPlayerBioTool = Tool.builder()
            .name("get_player_bio")
            .description("Get a player's biographical info: height, weight, position, birthplace, college, "
                    + "draft info, current team, jersey number, and years of experience. Call this for questions "
                    + "about any of those topics.")
            .inputSchema(Tool.InputSchema.builder()
                    .properties(Tool.InputSchema.Properties.builder()
                            .putAdditionalProperty("playerId", JsonValue.from(Map.of(
                                    "type", "integer",
                                    "description", "Numeric NBA player ID, from search_player")))
                            .build())
                    .required(List.of("playerId"))
                    .build())
            .build();

    private final Tool getCareerStatsTool = Tool.builder()
            .name("get_career_stats")
            .description("Get a player's regular season career stats, one row per season (games played, minutes, "
                    + "points, rebounds, assists, steals, blocks, shooting percentages - all per-game averages). "
                    + "Call this for questions about stats, averages, or performance across seasons.")
            .inputSchema(Tool.InputSchema.builder()
                    .properties(Tool.InputSchema.Properties.builder()
                            .putAdditionalProperty("playerId", JsonValue.from(Map.of(
                                    "type", "integer",
                                    "description", "Numeric NBA player ID, from search_player")))
                            .build())
                    .required(List.of("playerId"))
                    .build())
            .build();

    private final Tool getShotSummaryTool = Tool.builder()
            .name("get_shot_summary")
            .description("Get a summary of where a player shoots from on the court for a given season: total "
                    + "attempts/makes/FG% overall, and a breakdown by court zone (e.g. Restricted Area, Mid-Range, "
                    + "Above the Break 3). Call this for questions about shot selection, shooting tendencies, or "
                    + "where a player shoots from most.")
            .inputSchema(Tool.InputSchema.builder()
                    .properties(Tool.InputSchema.Properties.builder()
                            .putAdditionalProperty("playerId", JsonValue.from(Map.of(
                                    "type", "integer",
                                    "description", "Numeric NBA player ID, from search_player")))
                            .putAdditionalProperty("season", JsonValue.from(Map.of(
                                    "type", "string",
                                    "description", "Season in the format 'YYYY-YY', e.g. '2023-24'. Default to "
                                            + "the most recently completed NBA season if the user doesn't "
                                            + "specify one.")))
                            .build())
                    .required(List.of("playerId", "season"))
                    .build())
            .build();

    public String answer(String userMessage) {
        List<MessageParam> messages = new ArrayList<>();
        messages.add(MessageParam.builder()
                .role(MessageParam.Role.USER)
                .content(userMessage)
                .build());

        MessageCreateParams.Builder builder = MessageCreateParams.builder()
                .model(Model.CLAUDE_HAIKU_4_5)
                .maxTokens(1024L)
                .system(SYSTEM_PROMPT)
                .addTool(searchPlayerTool)
                .addTool(getPlayerBioTool)
                .addTool(getCareerStatsTool)
                .addTool(getShotSummaryTool);

        for (int turn = 0; turn < MAX_TURNS; turn++) {
            Message response = client.messages().create(builder.messages(messages).build());

            messages.add(MessageParam.builder()
                    .role(MessageParam.Role.ASSISTANT)
                    .contentOfBlockParams(toAssistantBlockParams(response.content()))
                    .build());

            List<ContentBlockParam> toolResults = new ArrayList<>();
            for (ContentBlock block : response.content()) {
                block.toolUse().ifPresent(toolUse -> toolResults.add(toolResultParam(toolUse)));
            }

            if (toolResults.isEmpty()) {
                return extractText(response);
            }

            messages.add(MessageParam.builder()
                    .role(MessageParam.Role.USER)
                    .contentOfBlockParams(toolResults)
                    .build());
        }

        return "Sorry, I couldn't finish answering that - it took too many steps. Try rephrasing your question.";
    }

    private List<ContentBlockParam> toAssistantBlockParams(List<ContentBlock> blocks) {
        List<ContentBlockParam> params = new ArrayList<>();
        for (ContentBlock block : blocks) {
            params.add(block.toParam());
        }
        return params;
    }

    private String extractText(Message response) {
        StringBuilder sb = new StringBuilder();
        for (ContentBlock block : response.content()) {
            block.text().ifPresent(t -> sb.append(t.text()));
        }
        return sb.length() == 0 ? "I don't have an answer for that." : sb.toString();
    }

    private ContentBlockParam toolResultParam(ToolUseBlock toolUse) {
        String resultJson;
        boolean isError = false;
        try {
            resultJson = executeTool(toolUse);
        } catch (Exception e) {
            resultJson = "Error: " + e.getMessage();
            isError = true;
        }
        return ContentBlockParam.ofToolResult(ToolResultBlockParam.builder()
                .toolUseId(toolUse.id())
                .content(resultJson)
                .isError(isError)
                .build());
    }

    private String executeTool(ToolUseBlock toolUse) throws Exception {
        JsonNode input = toolUse._input().convert(JsonNode.class);
        switch (toolUse.name()) {
            case "search_player": {
                String query = input.path("query").asText();
                return mapper.writeValueAsString(nbaStatsService.searchPlayers(query));
            }
            case "get_player_bio": {
                int playerId = input.path("playerId").asInt();
                return mapper.writeValueAsString(nbaStatsService.getPlayerBio(playerId));
            }
            case "get_career_stats": {
                int playerId = input.path("playerId").asInt();
                return mapper.writeValueAsString(nbaStatsService.getCareerStats(playerId));
            }
            case "get_shot_summary": {
                int playerId = input.path("playerId").asInt();
                String season = input.path("season").asText();
                return mapper.writeValueAsString(nbaStatsService.summarizeShotChart(playerId, season));
            }
            default:
                throw new IllegalArgumentException("Unknown tool: " + toolUse.name());
        }
    }
}
