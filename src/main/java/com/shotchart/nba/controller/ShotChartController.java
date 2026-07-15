package com.shotchart.nba.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.shotchart.nba.model.CareerSeasonStats;
import com.shotchart.nba.model.PlayerBio;
import com.shotchart.nba.model.PlayerInfo;
import com.shotchart.nba.model.Shot;
import com.shotchart.nba.service.NbaStatsService;

@RestController
@RequestMapping("/api")
public class ShotChartController {

    @Autowired
    private NbaStatsService nbaStatsService;

    @GetMapping("/players")
    public List<PlayerInfo> getAllPlayers() {
        return nbaStatsService.getAllPlayersSorted();
    }

    @GetMapping("/players/search")
    public List<PlayerInfo> searchPlayers(@RequestParam String query) {
        return nbaStatsService.searchPlayers(query);
    }

    @GetMapping("/shotchart")
    public List<Shot> getShotChart(@RequestParam int playerId, @RequestParam String season) {
        return nbaStatsService.getShotChart(playerId, season);
    }

    @GetMapping("/playerbio")
    public PlayerBio getPlayerBio(@RequestParam int playerId) {
        return nbaStatsService.getPlayerBio(playerId);
    }

    @GetMapping("/careerstats")
    public List<CareerSeasonStats> getCareerStats(@RequestParam int playerId) {
        return nbaStatsService.getCareerStats(playerId);
    }
}
