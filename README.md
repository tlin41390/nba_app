# NBA Shot Chart (Spring Boot)

A Spring Boot app that looks up an NBA player, pulls their shot data for a chosen
season from the NBA Stats API, and plots it on a half-court diagram. Makes are
green dots, misses are red X's. Hover any shot for details (shot type, distance,
quarter, game clock, date, opponent, make/miss).

## Requirements

- Java 17+
- Maven 3.6+
- Internet access (the app calls `stats.nba.com` directly at runtime — no API key needed)

## Run it

```bash
cd nba-shot-chart
mvn spring-boot:run
```

Then open **http://localhost:8080** in your browser.

## How it works

- **Backend** (`NbaStatsService`) calls two unofficial but public NBA Stats endpoints:
  - `commonallplayers` — full player list, cached in memory after first request, used for the search-as-you-type box
  - `shotchartdetail` — every shot attempt for a given `PlayerID` + `Season`
- These endpoints require browser-like headers (`Referer`, `Origin`, `x-nba-stats-*`)
  or they return `403`. Those are set in `NbaStatsService.buildHeaders()`.
- **Frontend** (`static/js/app.js`) draws the court on an HTML5 `<canvas>` using the
  same coordinate system the NBA API returns (`LOC_X`/`LOC_Y`, tenths of a foot,
  hoop at the origin), plots each shot, and shows a tooltip on hover by finding the
  nearest plotted point to the cursor.

## Notes / things you may want to tweak

- `season` is sent in `YYYY-YY` format, e.g. `2023-24`. The dropdown in `app.js`
  auto-generates seasons back to 1996-97 (the earliest season with shot location
  data) — bump `startYear` in `app.js` when a new season begins.
- Only **Regular Season** shots are fetched (`SeasonType=Regular+Season`). Change
  that query param in `NbaStatsService.getShotChart` if you want Playoffs instead.
- `stats.nba.com` occasionally rate-limits or times out — if a request fails, the
  UI shows a status message rather than crashing.
- There's no persistence/database; everything is fetched live and held in memory
  for the life of the request.
