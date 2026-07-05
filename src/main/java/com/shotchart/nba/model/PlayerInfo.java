package com.shotchart.nba.model;

public class PlayerInfo {

    private int id;
    private String fullName;
    private String teamAbbreviation;
    private boolean active;

    public PlayerInfo() {
    }

    public PlayerInfo(int id, String fullName, String teamAbbreviation, boolean active) {
        this.id = id;
        this.fullName = fullName;
        this.teamAbbreviation = teamAbbreviation;
        this.active = active;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getTeamAbbreviation() {
        return teamAbbreviation;
    }

    public void setTeamAbbreviation(String teamAbbreviation) {
        this.teamAbbreviation = teamAbbreviation;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
