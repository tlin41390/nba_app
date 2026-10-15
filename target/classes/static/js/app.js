// ---------- Season dropdown setup ----------
const seasonSelect = document.getElementById('seasonSelect');
(function populateSeasons() {
    const startYear = 2024; // most recent season start year; adjust as new seasons begin
    const endYear = 1996;   // earliest season with shot location data
    for (let y = startYear; y >= endYear; y--) {
        const label = `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
        const opt = document.createElement('option');
        opt.value = label;
        opt.textContent = label;
        seasonSelect.appendChild(opt);
    }
})();

// ---------- Game picker ----------
const gameSelect = document.getElementById('gameSelect');
let allShots = [];

// Rebuilds the game dropdown from the distinct games found in a season's shots.
function populateGames(shots) {
    gameSelect.innerHTML = '<option value="">All games</option>';

    const gamesById = new Map();
    shots.forEach(s => {
        if (gamesById.has(s.gameId)) return;
        const opponent = s.teamName === s.homeTeam ? s.visitorTeam : s.homeTeam;
        const prefix = s.teamName === s.homeTeam ? 'vs' : '@';
        gamesById.set(s.gameId, { gameId: s.gameId, gameDate: s.gameDate, label: `${s.gameDate} ${prefix} ${opponent}` });
    });

    Array.from(gamesById.values())
        .sort((a, b) => b.gameDate.localeCompare(a.gameDate))
        .forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.gameId;
            opt.textContent = g.label;
            gameSelect.appendChild(opt);
        });

    gameSelect.value = '';
    gameSelect.disabled = gamesById.size === 0;
}

gameSelect.addEventListener('change', () => {
    const filtered = gameSelect.value ? allShots.filter(s => s.gameId === gameSelect.value) : allShots;
    drawChart(filtered);
    renderStats(filtered);
    updateChartTitle();
});

function updateChartTitle() {
    let title = `${selectedPlayer.fullName} — ${seasonSelect.value}`;
    if (gameSelect.value) {
        title += ` — ${gameSelect.options[gameSelect.selectedIndex].textContent}`;
    }
    document.getElementById('chartTitle').textContent = title;
}

// ---------- Player card (headshot + bio) ----------
const playerCard = document.getElementById('playerCard');
const playerHeadshot = document.getElementById('playerHeadshot');
const playerName = document.getElementById('playerName');
const playerMeta = document.getElementById('playerMeta');

async function loadPlayerBio(playerId) {
    playerHeadshot.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
    playerHeadshot.onerror = () => {
        playerHeadshot.onerror = null;
        playerHeadshot.src = 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#262a33"/></svg>'
        );
    };
    playerName.textContent = '';
    playerMeta.innerHTML = '';
    playerCard.classList.remove('hidden');

    try {
        const res = await fetch(`/api/playerbio?playerId=${playerId}`);
        if (!res.ok) throw new Error('bio fetch failed: ' + res.status);
        const bio = await res.json();
        renderPlayerCard(bio);
    } catch (err) {
        console.error(err);
    }
}

function renderPlayerCard(bio) {
    playerName.textContent = `${bio.firstName} ${bio.lastName}`.trim();

    const items = [];
    if (bio.position) items.push(`<b>${bio.position}</b>`);
    if (bio.jerseyNumber) items.push(`<b>#${bio.jerseyNumber}</b>`);
    if (bio.heightFeetInches) items.push(`<b>${bio.heightFeetInches.replace('-', "' ")}\"</b>`);
    if (bio.weightPounds) items.push(`<b>${bio.weightPounds}</b> lbs`);
    if (bio.country) items.push(bio.country);
    if (bio.birthDate) items.push(`Born ${formatBirthDate(bio.birthDate)}`);
    if (bio.seasonExp) {
        const exp = parseInt(bio.seasonExp, 10);
        items.push(exp === 0 ? 'Rookie' : `<b>${exp}</b> yr${exp === 1 ? '' : 's'} exp`);
    }

    playerMeta.innerHTML = items.map(i => `<span>${i}</span>`).join('');
}

function formatBirthDate(raw) {
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---------- Player search / autocomplete ----------
const playerInput = document.getElementById('playerInput');
const suggestionsBox = document.getElementById('suggestions');
const loadBtn = document.getElementById('loadBtn');
const statusMsg = document.getElementById('statusMsg');

let selectedPlayer = null;
let debounceTimer = null;
let activeSuggestionIndex = -1;
let currentSuggestions = [];

playerInput.addEventListener('input', () => {
    selectedPlayer = null;
    loadBtn.disabled = true;
    document.getElementById('playerCard').classList.add('hidden');
    const query = playerInput.value.trim();

    clearTimeout(debounceTimer);
    if (query.length < 2) {
        hideSuggestions();
        return;
    }
    debounceTimer = setTimeout(() => searchPlayers(query), 250);
});

playerInput.addEventListener('keydown', (e) => {
    if (suggestionsBox.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, currentSuggestions.length - 1);
        renderSuggestions();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
        renderSuggestions();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestionIndex >= 0) {
            choosePlayer(currentSuggestions[activeSuggestionIndex]);
        }
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
});

document.addEventListener('click', (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== playerInput) {
        hideSuggestions();
    }
});

async function searchPlayers(query) {
    try {
        const res = await fetch(`/api/players/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('search failed');
        currentSuggestions = await res.json();
        activeSuggestionIndex = -1;
        renderSuggestions();
    } catch (err) {
        hideSuggestions();
    }
}

function renderSuggestions() {
    if (!currentSuggestions.length) {
        hideSuggestions();
        return;
    }
    suggestionsBox.innerHTML = '';
    currentSuggestions.forEach((p, i) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item' + (i === activeSuggestionIndex ? ' active' : '');
        item.innerHTML = `<span>${p.fullName}</span><span class="suggestion-team">${p.teamAbbreviation || ''}</span>`;
        item.addEventListener('click', () => choosePlayer(p));
        suggestionsBox.appendChild(item);
    });
    suggestionsBox.classList.remove('hidden');
}

function hideSuggestions() {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
}

function choosePlayer(player) {
    selectedPlayer = player;
    playerInput.value = player.fullName;
    hideSuggestions();
    loadBtn.disabled = false;
    loadPlayerBio(player.id);
}

// ---------- Load shot chart ----------
loadBtn.addEventListener('click', loadShotChart);

async function loadShotChart() {
    if (!selectedPlayer) return;
    const season = seasonSelect.value;

    setStatus(`Loading ${selectedPlayer.fullName}'s ${season} shot chart...`);
    loadBtn.disabled = true;

    try {
        const res = await fetch(`/api/shotchart?playerId=${selectedPlayer.id}&season=${encodeURIComponent(season)}`);
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        const shots = await res.json();

        if (!shots.length) {
            setStatus(`No shot data found for ${selectedPlayer.fullName} in ${season}.`);
        } else {
            clearStatus();
        }

        allShots = shots;
        populateGames(shots);
        updateChartTitle();
        drawChart(shots);
        renderStats(shots);
    } catch (err) {
        setStatus('Could not load shot chart. The NBA stats API may be temporarily unavailable.');
        console.error(err);
    } finally {
        loadBtn.disabled = false;
    }
}

function setStatus(msg) {
    statusMsg.textContent = msg;
    statusMsg.classList.remove('hidden');
}

function clearStatus() {
    statusMsg.classList.add('hidden');
    statusMsg.textContent = '';
}

function renderStats(shots) {
    const bar = document.getElementById('statsBar');
    if (!shots.length) {
        bar.classList.add('hidden');
        return;
    }
    const makes = shots.filter(s => s.shotMade).length;
    const attempts = shots.length;
    const pct = ((makes / attempts) * 100).toFixed(1);
    bar.innerHTML = `<span><b>${attempts}</b> attempts</span><span><b>${makes}</b> makes</span><span><b>${pct}%</b> FG</span>`;
    bar.classList.remove('hidden');
}

// ---------- Court drawing + shot plotting ----------
const canvas = document.getElementById('court');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

const W = canvas.width;   // 500
const H = canvas.height;  // 470

// Convert NBA loc_x/loc_y (tenths of a foot, hoop at 0,0) to canvas pixel coords.
function toCanvasX(locX) {
    return locX + W / 2;
}
function toCanvasY(locY) {
    return (H - 47.5) - locY;
}

let plottedShots = []; // {cx, cy, shot}

function drawChart(shots) {
    ctx.clearRect(0, 0, W, H);
    drawCourt();
    plottedShots = [];

    shots.forEach(shot => {
        const cx = toCanvasX(shot.locX);
        const cy = toCanvasY(shot.locY);
        if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return; // skip wild outliers
        drawShot(cx, cy, shot.shotMade);
        plottedShots.push({ cx, cy, shot });
    });
}

function drawShot(cx, cy, made) {
    if (made) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(35, 197, 82, 0.85)';
        ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.strokeStyle = 'rgba(224, 69, 58, 0.85)';
        ctx.lineWidth = 1.6;
        const r = 3.4;
        ctx.beginPath();
        ctx.moveTo(cx - r, cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.moveTo(cx + r, cy - r);
        ctx.lineTo(cx - r, cy + r);
        ctx.stroke();
    }
}

function drawCourt() {
    ctx.strokeStyle = '#4a5162';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#1c2129';
    ctx.fillRect(0, 0, W, H);

    // Outer court boundary (half court)
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    // Hoop (rim), radius 7.5 units, centered at (0,0) -> canvas center bottom area
    circleAt(0, 0, 7.5);

    // Backboard: horizontal line, 60 units wide (-30 to 30), at loc_y = -7.5
    line(-30, -7.5, 30, -7.5);

    // Restricted area arc, radius 40, upper half (in front of basket)
    arcAt(0, 0, 40, Math.PI, 0, false);

    // Paint / key: outer box (-80 to 80 wide, from baseline to 190 units deep)
    rectFromCourt(-80, -47.5, 160, 190 + 47.5);
    // Inner free-throw lane box (-60 to 60)
    rectFromCourt(-60, -47.5, 120, 190 + 47.5);

    // Free throw circle at (0, 142.5), radius 60 — solid top half, dashed bottom half
    ctx.setLineDash([]);
    arcAt(0, 142.5, 60, Math.PI, 0, false);
    ctx.setLineDash([4, 4]);
    arcAt(0, 142.5, 60, 0, Math.PI, false);
    ctx.setLineDash([]);

    // Three point line: corner segments + arc
    // Corners at x = ±220, from baseline (y=-47.5) up to y=92.5
    line(-220, -47.5, -220, 92.5);
    line(220, -47.5, 220, 92.5);
    // Arc radius 237.5 centered at hoop, connecting the corners
    arcAt(0, 0, 237.5, degToRad(-68.0), degToRad(68.0), false, true);

    // Half court line (top edge) + center circle
    line(-250, 422.5, 250, 422.5);
    arcAt(0, 422.5, 60, 0, Math.PI * 2, false);
    arcAt(0, 422.5, 20, 0, Math.PI * 2, false);
}

function degToRad(d) {
    return (d * Math.PI) / 180;
}

function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(toCanvasX(x1), toCanvasY(y1));
    ctx.lineTo(toCanvasX(x2), toCanvasY(y2));
    ctx.stroke();
}

function circleAt(x, y, r) {
    ctx.beginPath();
    ctx.arc(toCanvasX(x), toCanvasY(y), r, 0, Math.PI * 2);
    ctx.stroke();
}

function rectFromCourt(x, y, w, h) {
    const cx1 = toCanvasX(x);
    const cy1 = toCanvasY(y + h);
    ctx.strokeRect(cx1, cy1, w, h);
}

// angle system: canvas arc uses standard math angles but our y is flipped vs court y,
// so we build the three point arc using a parametric sweep in "court space" instead
// of relying on canvas's own y-flipped arc(), to avoid mirroring issues.
function arcAt(x, y, r, startAngle, endAngle, counterClockwise, useCourtSweep) {
    if (useCourtSweep) {
        // sweep angle measured from the hoop, 0 = straight up the court (+y axis)
        ctx.beginPath();
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
            const a = startAngle + ((endAngle - startAngle) * i) / steps;
            const px = x + r * Math.sin(a);
            const py = y + r * Math.cos(a);
            const cx = toCanvasX(px);
            const cy = toCanvasY(py);
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        return;
    }
    // Standard circle in canvas space centered at the transformed court point.
    ctx.beginPath();
    ctx.arc(toCanvasX(x), toCanvasY(y), r, startAngle, endAngle, counterClockwise);
    ctx.stroke();
}

// ---------- Hover tooltip ----------
const wrap = document.querySelector('.canvas-wrap');

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let closest = null;
    let closestDist = 8; // hit radius in canvas units
    for (const p of plottedShots) {
        const d = Math.hypot(p.cx - mx, p.cy - my);
        if (d < closestDist) {
            closestDist = d;
            closest = p;
        }
    }

    if (closest) {
        showTooltip(closest, e, rect);
        canvas.style.cursor = 'pointer';
    } else {
        hideTooltip();
        canvas.style.cursor = 'crosshair';
    }
});

canvas.addEventListener('mouseleave', hideTooltip);

function showTooltip(point, mouseEvent, canvasRect) {
    const s = point.shot;
    const madeLabel = s.shotMade
        ? '<span class="t-made">MAKE</span>'
        : '<span class="t-missed">MISS</span>';
    const clock = `${s.minutesRemaining}:${String(s.secondsRemaining).padStart(2, '0')}`;

    tooltip.innerHTML = `
        <div class="t-title">${s.actionType} — ${madeLabel}</div>
        <div>${s.shotDistance} ft · ${s.shotZoneBasic}</div>
        <div>Q${s.period} · ${clock} remaining</div>
        <div>${s.gameDate} vs ${s.homeTeam === s.teamName ? s.visitorTeam : s.homeTeam}</div>
    `;

    const wrapRect = wrap.getBoundingClientRect();
    const localX = (mouseEvent.clientX - wrapRect.left);
    const localY = (mouseEvent.clientY - wrapRect.top);

    let left = localX + 14;
    let top = localY + 14;

    // keep tooltip inside the wrap box roughly
    if (left + 220 > wrapRect.width) left = localX - 234;
    if (top + 100 > wrapRect.height) top = localY - 110;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.remove('hidden');
}

function hideTooltip() {
    tooltip.classList.add('hidden');
}

// Draw an empty court on first load
drawCourt();
