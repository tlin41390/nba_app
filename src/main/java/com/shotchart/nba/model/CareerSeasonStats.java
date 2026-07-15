package com.shotchart.nba.model;

public class CareerSeasonStats {

    private String seasonId;
    private String teamAbbreviation;
    private int gp;
    private double min;
    private double pts;
    private double reb;
    private double ast;
    private double stl;
    private double blk;
    private double fgPct;
    private double fg3Pct;
    private double ftPct;

    public String getSeasonId() {
        return seasonId;
    }

    public void setSeasonId(String seasonId) {
        this.seasonId = seasonId;
    }

    public String getTeamAbbreviation() {
        return teamAbbreviation;
    }

    public void setTeamAbbreviation(String teamAbbreviation) {
        this.teamAbbreviation = teamAbbreviation;
    }

    public int getGp() {
        return gp;
    }

    public void setGp(int gp) {
        this.gp = gp;
    }

    public double getMin() {
        return min;
    }

    public void setMin(double min) {
        this.min = min;
    }

    public double getPts() {
        return pts;
    }

    public void setPts(double pts) {
        this.pts = pts;
    }

    public double getReb() {
        return reb;
    }

    public void setReb(double reb) {
        this.reb = reb;
    }

    public double getAst() {
        return ast;
    }

    public void setAst(double ast) {
        this.ast = ast;
    }

    public double getStl() {
        return stl;
    }

    public void setStl(double stl) {
        this.stl = stl;
    }

    public double getBlk() {
        return blk;
    }

    public void setBlk(double blk) {
        this.blk = blk;
    }

    public double getFgPct() {
        return fgPct;
    }

    public void setFgPct(double fgPct) {
        this.fgPct = fgPct;
    }

    public double getFg3Pct() {
        return fg3Pct;
    }

    public void setFg3Pct(double fg3Pct) {
        this.fg3Pct = fg3Pct;
    }

    public double getFtPct() {
        return ftPct;
    }

    public void setFtPct(double ftPct) {
        this.ftPct = ftPct;
    }
}
