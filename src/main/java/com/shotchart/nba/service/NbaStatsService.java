package com.shotchart.nba.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shotchart.nba.model.CareerSeasonStats;
import com.shotchart.nba.model.PlayerBio;
import com.shotchart.nba.model.PlayerInfo;
import com.shotchart.nba.model.Shot;
import com.shotchart.nba.model.ShotZoneSummary;

/**
 * Talks to the local nba_service Flask microservice (see /nba_service), which
 * wraps the nba_api Python package (https://github.com/swar/nba_api).
 * stats.nba.com blocks requests from most cloud/datacenter IPs and requires
 * brittle hand-rolled browser headers, so the actual HTTP call to stats.nba.com
 * is delegated to nba_api. This service just consumes the same
 * resultSets/headers/rowSet JSON shape stats.nba.com itself returns, proxied
 * back unchanged by the microservice.
 */
@Service
public class NbaStatsService {

    @Value("${nba.microservice.base-url}")
    private String baseUrl;

    @Autowired
    private RestTemplate restTemplate;

    private final ObjectMapper mapper = new ObjectMapper();

    // Simple in-memory cache of the full player list (all-time), refreshed on app restart.
    private List<PlayerInfo> cachedPlayers = null;

    /**
     * Fetches the full all-time player list once and caches it in memory.
     * IsOnlyCurrentSeason=0 returns every player in league history, active or
     * not.
     */
    public synchronized List<PlayerInfo> getAllPlayers() {
        if (cachedPlayers != null) {
            return cachedPlayers;
        }

        String url = baseUrl + "/commonallplayers?LeagueID=00&Season=2024-25&IsOnlyCurrentSeason=0";
        String body = fetch(url);

        List<PlayerInfo> players = new ArrayList<>();
        try {
            JsonNode root = mapper.readTree(body);
            JsonNode resultSet = root.path("resultSets").get(0);

            List<String> headers = new ArrayList<>();
            resultSet.path("headers").forEach(h -> headers.add(h.asText()));

            int idIdx = headers.indexOf("PERSON_ID");
            int nameIdx = headers.indexOf("DISPLAY_FIRST_LAST");
            int teamIdx = headers.indexOf("TEAM_ABBREVIATION");
            int activeIdx = headers.indexOf("ROSTERSTATUS");

            for (JsonNode row : resultSet.path("rowSet")) {
                int id = row.get(idIdx).asInt();
                String name = row.get(nameIdx).asText();
                String team = (teamIdx >= 0 && !row.get(teamIdx).isNull()) ? row.get(teamIdx).asText() : "";
                boolean active = activeIdx >= 0 && row.get(activeIdx).asInt() == 1;
                players.add(new PlayerInfo(id, name, team, active));
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch/parse player list from NBA stats API", e);
        }

        cachedPlayers = players;
        return players;
    }

    /**
     * Full all-time player list sorted alphabetically by name, for the
     * player-stats browse page.
     */
    public List<PlayerInfo> getAllPlayersSorted() {
        return getAllPlayers().stream()
                .sorted(Comparator.comparing(PlayerInfo::getFullName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    public List<PlayerInfo> searchPlayers(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        String q = normalize(query.trim());
        return getAllPlayers().stream()
                .filter(p -> normalize(p.getFullName()).contains(q))
                .sorted(Comparator.comparing((PlayerInfo p) -> !p.isActive())
                        .thenComparing(PlayerInfo::getFullName))
                .limit(15)
                .collect(Collectors.toList());
    }

    /**
     * Lowercases and strips diacritics (e.g. "Jokić" -> "jokic") so users can
     * search with a plain-ASCII spelling of an accented name.
     */
    private static String normalize(String s) {
        if (s == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(s, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "").toLowerCase();
    }

    /**
     * Fetches every regular season field goal attempt for a player in a given
     * season. Season format expected: "2023-24"
     */
    public List<Shot> getShotChart(int playerId, String season) {
        String url = baseUrl + "/shotchartdetail"
                + "?PlayerID=" + playerId
                + "&Season=" + season
                + "&SeasonType=Regular+Season";

        String body = fetch(url);

        List<Shot> shots = new ArrayList<>();
        try {
            JsonNode root = mapper.readTree(body);
            JsonNode resultSet = root.path("resultSets").get(0);

            List<String> headers = new ArrayList<>();
            resultSet.path("headers").forEach(h -> headers.add(h.asText()));

            Map<String, Integer> idx = new HashMap<>();
            for (int i = 0; i < headers.size(); i++) {
                idx.put(headers.get(i), i);
            }

            for (JsonNode row : resultSet.path("rowSet")) {
                Shot s = new Shot();
                s.setGameId(getText(row, idx, "GAME_ID"));
                s.setPlayerName(getText(row, idx, "PLAYER_NAME"));
                s.setTeamName(getText(row, idx, "TEAM_NAME"));
                s.setPeriod(getInt(row, idx, "PERIOD"));
                s.setMinutesRemaining(getInt(row, idx, "MINUTES_REMAINING"));
                s.setSecondsRemaining(getInt(row, idx, "SECONDS_REMAINING"));
                s.setEventType(getText(row, idx, "EVENT_TYPE"));
                s.setActionType(getText(row, idx, "ACTION_TYPE"));
                s.setShotType(getText(row, idx, "SHOT_TYPE"));
                s.setShotZoneBasic(getText(row, idx, "SHOT_ZONE_BASIC"));
                s.setShotZoneArea(getText(row, idx, "SHOT_ZONE_AREA"));
                s.setShotZoneRange(getText(row, idx, "SHOT_ZONE_RANGE"));
                s.setShotDistance(getInt(row, idx, "SHOT_DISTANCE"));
                s.setLocX(getDouble(row, idx, "LOC_X"));
                s.setLocY(getDouble(row, idx, "LOC_Y"));
                s.setShotMade(getInt(row, idx, "SHOT_MADE_FLAG") == 1);
                s.setGameDate(getText(row, idx, "GAME_DATE"));
                s.setHomeTeam(getText(row, idx, "HTM"));
                s.setVisitorTeam(getText(row, idx, "VTM"));
                shots.add(s);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch/parse shot chart data from NBA stats API", e);
        }

        return shots;
    }

    /**
     * Aggregates a player's shot chart for a season by SHOT_ZONE_BASIC, so
     * callers (e.g. the chatbot) don't have to work with a 1000+ row
     * shot-by-shot list just to answer "where does he shoot from most".
     */
    public ShotZoneSummary summarizeShotChart(int playerId, String season) {
        List<Shot> shots = getShotChart(playerId, season);

        Map<String, int[]> zoneCounts = new HashMap<>(); // zone -> [attempts, makes]
        int totalAttempts = 0;
        int totalMakes = 0;

        for (Shot shot : shots) {
            String zone = shot.getShotZoneBasic() == null || shot.getShotZoneBasic().isEmpty()
                    ? "Unknown"
                    : shot.getShotZoneBasic();
            int[] counts = zoneCounts.computeIfAbsent(zone, z -> new int[2]);
            counts[0]++;
            totalAttempts++;
            if (shot.isShotMade()) {
                counts[1]++;
                totalMakes++;
            }
        }

        List<ShotZoneSummary.ZoneStats> zones = zoneCounts.entrySet().stream()
                .map(e -> new ShotZoneSummary.ZoneStats(
                        e.getKey(),
                        e.getValue()[0],
                        e.getValue()[1],
                        e.getValue()[0] == 0 ? 0.0 : (double) e.getValue()[1] / e.getValue()[0]))
                .sorted(Comparator.comparingInt(ShotZoneSummary.ZoneStats::getAttempts).reversed())
                .collect(Collectors.toList());

        double overallFgPct = totalAttempts == 0 ? 0.0 : (double) totalMakes / totalAttempts;
        return new ShotZoneSummary(totalAttempts, totalMakes, overallFgPct, zones);
    }

    public PlayerBio getPlayerBio(int playerId) {
        String url = baseUrl + "/commonplayerinfo?PlayerID=" + playerId;

        String body = fetch(url);

        PlayerBio bio = new PlayerBio();

        try {
            JsonNode root = mapper.readTree(body);
            JsonNode resultSet = root.path("resultSets").get(0);

            List<String> headers = new ArrayList<>();
            resultSet.path("headers").forEach(h -> headers.add(h.asText()));

            Map<String, Integer> idx = new HashMap<>();
            for (int i = 0; i < headers.size(); i++) {
                idx.put(headers.get(i), i);
            }

            JsonNode rowSet = resultSet.path("rowSet");
            if (rowSet.size() == 0) {
                throw new RuntimeException("No player bio found for playerId: " + playerId);
            }

            JsonNode row = rowSet.get(0);

            bio.setId(getInt(row, idx, "PERSON_ID"));
            bio.setFirstName(getText(row, idx, "FIRST_NAME"));
            bio.setLastName(getText(row, idx, "LAST_NAME"));
            bio.setBirthDate(getText(row, idx, "BIRTHDATE"));
            bio.setHeightFeetInches(getText(row, idx, "HEIGHT"));
            bio.setWeightPounds(getInt(row, idx, "WEIGHT"));
            bio.setCountry(getText(row, idx, "COUNTRY"));
            bio.setSchool(getText(row, idx, "SCHOOL"));
            bio.setDraftYear(getInt(row, idx, "DRAFT_YEAR"));
            bio.setDraftRound(getInt(row, idx, "DRAFT_ROUND"));
            bio.setDraftNumber(getInt(row, idx, "DRAFT_NUMBER"));
            bio.setCurrentTeam(getText(row, idx, "TEAM_NAME"));
            bio.setJerseyNumber(getInt(row, idx, "JERSEY"));
            bio.setPosition(getText(row, idx, "POSITION"));
            bio.setSeasonExp(getInt(row, idx, "SEASON_EXP"));

        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch/parse player bio data from NBA stats API", e);
        }
        return bio;
    }

    /**
     * Fetches a player's regular season career stats, one row per season. Uses
     * per-game averages (Flask service requests PerMode36=PerGame).
     */
    public List<CareerSeasonStats> getCareerStats(int playerId) {
        String url = baseUrl + "/playercareerstats?PlayerID=" + playerId;
        String body = fetch(url);

        List<CareerSeasonStats> seasons = new ArrayList<>();
        try {
            JsonNode root = mapper.readTree(body);

            System.out.println("Root: " + root.toPrettyString());
            JsonNode resultSet = null;
            for (JsonNode node : root.path("resultSets")) {
                if ("SeasonTotalsRegularSeason".equals(node.path("name").asText())) {
                    resultSet = node;
                    break;
                }
            }
            if (resultSet == null) {
                throw new RuntimeException("SeasonTotalsRegularSeason resultSet not found for playerId: " + playerId);
            }

            List<String> headers = new ArrayList<>();
            resultSet.path("headers").forEach(h -> headers.add(h.asText()));
            System.out.println("Headers: " + headers);
            Map<String, Integer> idx = new HashMap<>();
            for (int i = 0; i < headers.size(); i++) {
                idx.put(headers.get(i), i);
            }

            for (JsonNode row : resultSet.path("rowSet")) {
                CareerSeasonStats s = new CareerSeasonStats();
                s.setSeasonId(getText(row, idx, "SEASON_ID"));
                s.setTeamAbbreviation(getText(row, idx, "TEAM_ABBREVIATION"));
                s.setGp(getInt(row, idx, "GP"));
                s.setMin(getDouble(row, idx, "MIN"));
                s.setPts(getDouble(row, idx, "PTS"));
                s.setReb(getDouble(row, idx, "REB"));
                s.setAst(getDouble(row, idx, "AST"));
                s.setStl(getDouble(row, idx, "STL"));
                s.setBlk(getDouble(row, idx, "BLK"));
                s.setFgPct(getDouble(row, idx, "FG_PCT"));
                s.setFg3Pct(getDouble(row, idx, "FG3_PCT"));
                s.setFtPct(getDouble(row, idx, "FT_PCT"));
                seasons.add(s);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch/parse career stats from NBA stats API", e);
        }

        return seasons;
    }

    private String fetch(String url) {
        try {
            return restTemplate.getForObject(url, String.class);
        } catch (ResourceAccessException e) {
            throw new RuntimeException(
                    "Could not reach the nba_service microservice at " + baseUrl
                    + ". Make sure it's running (see nba_service/README or run `python app.py`).", e);
        }
    }

    private String getText(JsonNode row, Map<String, Integer> idx, String key) {
        Integer i = idx.get(key);
        if (i == null || row.get(i).isNull()) {
            return "";
        }
        return row.get(i).asText();
    }

    private int getInt(JsonNode row, Map<String, Integer> idx, String key) {
        Integer i = idx.get(key);
        if (i == null || row.get(i).isNull()) {
            return 0;
        }
        return row.get(i).asInt();
    }

    private double getDouble(JsonNode row, Map<String, Integer> idx, String key) {
        Integer i = idx.get(key);
        if (i == null || row.get(i).isNull()) {
            return 0;
        }
        return row.get(i).asDouble();
    }
}
