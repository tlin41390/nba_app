package com.shotchart.nba.model;

public class Shot {

    private String gameId;
    private String playerName;
    private String teamName;
    private int period;
    private int minutesRemaining;
    private int secondsRemaining;
    private String eventType;
    private String actionType;
    private String shotType;
    private String shotZoneBasic;
    private String shotZoneArea;
    private String shotZoneRange;
    private int shotDistance;
    private double locX;
    private double locY;
    private boolean shotMade;
    private String gameDate;
    private String homeTeam;
    private String visitorTeam;

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
        this.gameId = gameId;
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public int getPeriod() {
        return period;
    }

    public void setPeriod(int period) {
        this.period = period;
    }

    public int getMinutesRemaining() {
        return minutesRemaining;
    }

    public void setMinutesRemaining(int minutesRemaining) {
        this.minutesRemaining = minutesRemaining;
    }

    public int getSecondsRemaining() {
        return secondsRemaining;
    }

    public void setSecondsRemaining(int secondsRemaining) {
        this.secondsRemaining = secondsRemaining;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getShotType() {
        return shotType;
    }

    public void setShotType(String shotType) {
        this.shotType = shotType;
    }

    public String getShotZoneBasic() {
        return shotZoneBasic;
    }

    public void setShotZoneBasic(String shotZoneBasic) {
        this.shotZoneBasic = shotZoneBasic;
    }

    public String getShotZoneArea() {
        return shotZoneArea;
    }

    public void setShotZoneArea(String shotZoneArea) {
        this.shotZoneArea = shotZoneArea;
    }

    public String getShotZoneRange() {
        return shotZoneRange;
    }

    public void setShotZoneRange(String shotZoneRange) {
        this.shotZoneRange = shotZoneRange;
    }

    public int getShotDistance() {
        return shotDistance;
    }

    public void setShotDistance(int shotDistance) {
        this.shotDistance = shotDistance;
    }

    public double getLocX() {
        return locX;
    }

    public void setLocX(double locX) {
        this.locX = locX;
    }

    public double getLocY() {
        return locY;
    }

    public void setLocY(double locY) {
        this.locY = locY;
    }

    public boolean isShotMade() {
        return shotMade;
    }

    public void setShotMade(boolean shotMade) {
        this.shotMade = shotMade;
    }

    public String getGameDate() {
        return gameDate;
    }

    public void setGameDate(String gameDate) {
        this.gameDate = gameDate;
    }

    public String getHomeTeam() {
        return homeTeam;
    }

    public void setHomeTeam(String homeTeam) {
        this.homeTeam = homeTeam;
    }

    public String getVisitorTeam() {
        return visitorTeam;
    }

    public void setVisitorTeam(String visitorTeam) {
        this.visitorTeam = visitorTeam;
    }
}
