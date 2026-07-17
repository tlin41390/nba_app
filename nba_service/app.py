"""
Small Flask proxy in front of the nba_api package (https://github.com/swar/nba_api).

stats.nba.com blocks requests from most cloud/datacenter IPs, and hand-rolling
the browser-like headers it expects is brittle. nba_api already solves both
problems (maintained headers, retry-friendly session) and exposes the exact
same endpoints the Java backend used to hit directly, so this service just
forwards to it and returns the raw resultSets/headers/rowSet JSON envelope
stats.nba.com itself returns. That keeps the parsing code in
NbaStatsService.java unchanged.
"""

from flask import Flask, jsonify, request
from nba_api.stats.endpoints import commonallplayers, commonplayerinfo, playercareerstats, shotchartdetail
from requests.exceptions import RequestException

app = Flask(__name__)

REQUEST_TIMEOUT = 30


@app.route("/stats/commonallplayers")
def common_all_players():
    league_id = request.args.get("LeagueID", "00")
    season = request.args.get("Season", "2024-25")
    is_only_current_season = int(request.args.get("IsOnlyCurrentSeason", "0"))

    try:
        data = commonallplayers.CommonAllPlayers(
            league_id=league_id,
            season=season,
            is_only_current_season=is_only_current_season,
            timeout=REQUEST_TIMEOUT,
        )
    except RequestException as e:
        return jsonify(error=f"nba_api request failed: {e}"), 502

    return jsonify(data.get_dict())

@app.route("/stats/commonplayerinfo")
def common_player_info():
    player_id = request.args.get("PlayerID", type=int)
    league_id = request.args.get("LeagueID", "00")
    
    if player_id is None:
        return jsonify(error="PlayerID is required"), 400
    

    try:
        data = commonplayerinfo.CommonPlayerInfo(
            player_id=player_id,
            league_id_nullable=league_id,
            timeout=REQUEST_TIMEOUT,
        )
    except RequestException as e:
        return jsonify(error=f"nba_api request failed: {e}"), 502

    return jsonify(data.get_dict())

@app.route("/stats/playercareerstats")
def player_career_stats():
    player_id = request.args.get("PlayerID", type=int)

    if player_id is None:
        return jsonify(error="PlayerID is required"), 400

    try:
        data = playercareerstats.PlayerCareerStats(
            player_id=player_id,
            per_mode36="PerGame",
            timeout=REQUEST_TIMEOUT,
        )
    except RequestException as e:
        return jsonify(error=f"nba_api request failed: {e}"), 502

    return jsonify(data.get_dict())

@app.route("/stats/shotchartdetail")
def shot_chart_detail():
    player_id = request.args.get("PlayerID", type=int)
    season = request.args.get("Season", "2024-25")
    season_type = request.args.get("SeasonType", "Regular Season").replace("+", " ")

    if player_id is None:
        return jsonify(error="PlayerID is required"), 400

    try:
        data = shotchartdetail.ShotChartDetail(
            team_id=0,
            player_id=player_id,
            season_nullable=season,
            season_type_all_star=season_type,
            context_measure_simple="FGA",
            timeout=REQUEST_TIMEOUT,
        )
    except RequestException as e:
        return jsonify(error=f"nba_api request failed: {e}"), 502

    return jsonify(data.get_dict())


@app.route("/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
