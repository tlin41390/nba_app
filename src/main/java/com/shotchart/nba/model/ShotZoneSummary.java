package com.shotchart.nba.model;

import java.util.List;

/**
 * Aggregated shot-chart data for a player/season: overall shooting plus a
 * breakdown by court zone. Used by the chatbot instead of handing Claude the
 * full shot-by-shot list (which can be 1000+ rows for a season).
 */
public class ShotZoneSummary {

    private int totalAttempts;
    private int totalMakes;
    private double overallFgPct;
    private List<ZoneStats> zones;

    public ShotZoneSummary() {
    }

    public ShotZoneSummary(int totalAttempts, int totalMakes, double overallFgPct, List<ZoneStats> zones) {
        this.totalAttempts = totalAttempts;
        this.totalMakes = totalMakes;
        this.overallFgPct = overallFgPct;
        this.zones = zones;
    }

    public int getTotalAttempts() {
        return totalAttempts;
    }

    public void setTotalAttempts(int totalAttempts) {
        this.totalAttempts = totalAttempts;
    }

    public int getTotalMakes() {
        return totalMakes;
    }

    public void setTotalMakes(int totalMakes) {
        this.totalMakes = totalMakes;
    }

    public double getOverallFgPct() {
        return overallFgPct;
    }

    public void setOverallFgPct(double overallFgPct) {
        this.overallFgPct = overallFgPct;
    }

    public List<ZoneStats> getZones() {
        return zones;
    }

    public void setZones(List<ZoneStats> zones) {
        this.zones = zones;
    }

    public static class ZoneStats {
        private String zone;
        private int attempts;
        private int makes;
        private double fgPct;

        public ZoneStats() {
        }

        public ZoneStats(String zone, int attempts, int makes, double fgPct) {
            this.zone = zone;
            this.attempts = attempts;
            this.makes = makes;
            this.fgPct = fgPct;
        }

        public String getZone() {
            return zone;
        }

        public void setZone(String zone) {
            this.zone = zone;
        }

        public int getAttempts() {
            return attempts;
        }

        public void setAttempts(int attempts) {
            this.attempts = attempts;
        }

        public int getMakes() {
            return makes;
        }

        public void setMakes(int makes) {
            this.makes = makes;
        }

        public double getFgPct() {
            return fgPct;
        }

        public void setFgPct(double fgPct) {
            this.fgPct = fgPct;
        }
    }
}
