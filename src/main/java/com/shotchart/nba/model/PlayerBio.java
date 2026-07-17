package com.shotchart.nba.model;

public class PlayerBio {

    private int id;
    private String firstName;
    private String lastName;
    private String birthDate;
    private String heightFeetInches;
    private int weightPounds;
    private String country;
    private String school;
    private int draftYear;
    private int draftRound;
    private int draftNumber;
    private String currentTeam;
    private int jerseyNumber;
    private String position;
    private int seasonExp;

    public PlayerBio() {
    }

    public PlayerBio(int id, String firstName, String lastName, String birthDate, String heightFeetInches, int weightPounds, String country, String school, int draftYear, int draftRound, int draftNumber, String currentTeam, int jerseyNumber, String position, int seasonExp) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.birthDate = birthDate;
        this.heightFeetInches = heightFeetInches;
        this.weightPounds = weightPounds;
        this.country = country;
        this.school = school;
        this.draftYear = draftYear;
        this.draftRound = draftRound;
        this.draftNumber = draftNumber;
        this.currentTeam = currentTeam;
        this.jerseyNumber = jerseyNumber;
        this.position = position;
        this.seasonExp = seasonExp;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(String birthDate) {
        this.birthDate = birthDate;
    }

    public String getHeightFeetInches() {
        return heightFeetInches;
    }

    public void setHeightFeetInches(String heightFeetInches) {
        this.heightFeetInches = heightFeetInches;
    }

    public int getWeightPounds() {
        return weightPounds;
    }

    public void setWeightPounds(int weightPounds) {
        this.weightPounds = weightPounds;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getSchool() {
        return school;
    }

    public void setSchool(String school) {
        this.school = school;
    }

    public int getDraftYear() {
        return draftYear;
    }

    public void setDraftYear(int draftYear) {
        this.draftYear = draftYear;
    }

    public int getDraftRound() {
        return draftRound;
    }

    public void setDraftRound(int draftRound) {
        this.draftRound = draftRound;
    }

    public int getDraftNumber() {
        return draftNumber;
    }

    public void setDraftNumber(int draftNumber) {
        this.draftNumber = draftNumber;
    }

    public String getCurrentTeam() {
        return currentTeam;
    }

    public void setCurrentTeam(String currentTeam) {
        this.currentTeam = currentTeam;
    }

    public int getJerseyNumber() {
        return jerseyNumber;
    }

    public void setJerseyNumber(int jerseyNumber) {
        this.jerseyNumber = jerseyNumber;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public int getSeasonExp() {
        return seasonExp;
    }

    public void setSeasonExp(int seasonExp) {
        this.seasonExp = seasonExp;
    }
}
