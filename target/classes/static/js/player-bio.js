const params = new URLSearchParams(window.location.search);
const playerId = params.get('playerId');
const playerNameParam = params.get('name') || '';

const backBtn = document.getElementById('backBtn');
const playerHeadshot = document.getElementById('playerHeadshot');
const playerNameEl = document.getElementById('playerName');
const playerMeta = document.getElementById('playerMeta');
const statsMsg = document.getElementById('statsMsg');
const careerTableBody = document.getElementById('careerTableBody');
const chartCard = document.getElementById('chartCard');
const chartTitle = document.getElementById('chartTitle');
const statToggleRow = document.getElementById('statToggleRow');
const statChart = document.getElementById('statChart');
const statTooltip = document.getElementById('statTooltip');

const STAT_DEFS = [
    { key: 'pts', label: 'PTS', title: 'Points per game', accessor: s => s.pts, format: v => v.toFixed(1) },
    { key: 'reb', label: 'REB', title: 'Rebounds per game', accessor: s => s.reb, format: v => v.toFixed(1) },
    { key: 'ast', label: 'AST', title: 'Assists per game', accessor: s => s.ast, format: v => v.toFixed(1) },
    { key: 'stl', label: 'STL', title: 'Steals per game', accessor: s => s.stl, format: v => v.toFixed(1) },
    { key: 'blk', label: 'BLK', title: 'Blocks per game', accessor: s => s.blk, format: v => v.toFixed(1) },
    { key: 'min', label: 'MIN', title: 'Minutes per game', accessor: s => s.min, format: v => v.toFixed(1) },
    { key: 'fgPct', label: 'FG%', title: 'Field goal %', accessor: s => s.fgPct, format: v => (v * 100).toFixed(1) + '%' },
    { key: 'fg3Pct', label: '3P%', title: '3-point %', accessor: s => s.fg3Pct, format: v => (v * 100).toFixed(1) + '%' },
    { key: 'ftPct', label: 'FT%', title: 'Free throw %', accessor: s => s.ftPct, format: v => (v * 100).toFixed(1) + '%' },
];

let currentSeasons = [];
let currentStatKey = 'pts';

backBtn.addEventListener('click', () => {
    window.location.href = 'player-stats.html';
});

if (!playerId) {
    playerNameEl.textContent = 'No player selected.';
    statsMsg.textContent = 'No player selected.';
    statsMsg.classList.remove('hidden');
} else {
    playerNameEl.textContent = playerNameParam;
    loadPlayerBio(playerId);
    loadCareerStats(playerId);
}

// ---------- Bio ----------
async function loadPlayerBio(id) {
    playerHeadshot.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${id}.png`;
    playerHeadshot.onerror = () => {
        playerHeadshot.onerror = null;
        playerHeadshot.src = 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#262a33"/></svg>'
        );
    };

    try {
        const res = await fetch(`/api/playerbio?playerId=${id}`);
        if (!res.ok) throw new Error('bio fetch failed: ' + res.status);
        const bio = await res.json();
        renderPlayerBio(bio);
    } catch (err) {
        console.error(err);
    }
}

function renderPlayerBio(bio) {
    if (!playerNameParam) {
        playerNameEl.textContent = `${bio.firstName} ${bio.lastName}`.trim();
    }

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

// ---------- Career stats ----------
async function loadCareerStats(id) {
    try {
        const res = await fetch(`/api/careerstats?playerId=${id}`);
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        const seasons = await res.json();

        if (!seasons.length) {
            statsMsg.textContent = 'No career stats found for this player.';
            statsMsg.classList.remove('hidden');
            return;
        }
        currentSeasons = seasons;
        chartCard.classList.remove('hidden');
        renderStatToggle();
        renderStatChart();
        renderCareerTable(seasons);
    } catch (err) {
        statsMsg.textContent = 'Could not load career stats. The NBA stats API may be temporarily unavailable.';
        statsMsg.classList.remove('hidden');
        console.error(err);
    }
}

function renderCareerTable(seasons) {
    const rows = seasons.map(s => `<tr>
        <td>${s.seasonId}</td>
        <td>${s.teamAbbreviation}</td>
        <td>${s.gp}</td>
        <td>${s.min.toFixed(1)}</td>
        <td>${s.pts.toFixed(1)}</td>
        <td>${s.reb.toFixed(1)}</td>
        <td>${s.ast.toFixed(1)}</td>
        <td>${s.stl.toFixed(1)}</td>
        <td>${s.blk.toFixed(1)}</td>
        <td>${(s.fgPct * 100).toFixed(1)}%</td>
        <td>${(s.fg3Pct * 100).toFixed(1)}%</td>
        <td>${(s.ftPct * 100).toFixed(1)}%</td>
    </tr>`);
    careerTableBody.innerHTML = rows.join('');
}

// ---------- Career stat line chart ----------
// Single-series line chart: the toggle row picks which stat is plotted, the
// existing career table above already serves as the accessible "table view"
// twin for whatever the chart shows.

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHART_H = 260;
const CHART_PAD = { left: 46, right: 14, top: 18, bottom: 30 };

function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
}

// The chart's viewBox width is set to match its actual rendered pixel width
// (see renderStatChart) so 1 viewBox unit == 1 CSS px in both axes. Without
// that, a fixed viewBox stretched non-uniformly to fill a wider card would
// turn the point markers into ellipses instead of circles.
function getChartWidth() {
    const rect = statChart.getBoundingClientRect();
    return rect.width > 0 ? rect.width : 640;
}

// Rounds a value up to a "clean" axis maximum (1/2/5 x a power of ten).
function niceMax(value) {
    if (!isFinite(value) || value <= 0) return 1;
    const exponent = Math.floor(Math.log10(value));
    const fraction = value / Math.pow(10, exponent);
    let niceFraction;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
    return niceFraction * Math.pow(10, exponent);
}

function renderStatToggle() {
    statToggleRow.innerHTML = '';
    STAT_DEFS.forEach(def => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stat-toggle-btn' + (def.key === currentStatKey ? ' active' : '');
        btn.textContent = def.label;
        btn.addEventListener('click', () => {
            if (currentStatKey === def.key) return;
            currentStatKey = def.key;
            statToggleRow.querySelectorAll('.stat-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderStatChart();
        });
        statToggleRow.appendChild(btn);
    });
}

function renderStatChart() {
    const def = STAT_DEFS.find(d => d.key === currentStatKey);
    chartTitle.textContent = `${def.title} by season`;

    const points = currentSeasons.map(s => ({ season: s.seasonId, value: def.accessor(s) }));
    statChart.innerHTML = '';
    statTooltip.classList.add('hidden');
    if (points.length === 0) return;

    const chartWidth = getChartWidth();
    statChart.setAttribute('viewBox', `0 0 ${chartWidth} ${CHART_H}`);

    const plotW = chartWidth - CHART_PAD.left - CHART_PAD.right;
    const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

    const maxValue = Math.max(...points.map(p => p.value), 0);
    const yMax = niceMax(maxValue * 1.15);
    const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

    const xFor = i => CHART_PAD.left + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
    const yFor = v => CHART_PAD.top + plotH - (v / yMax) * plotH;

    // Gridlines + y-axis tick labels.
    yTicks.forEach(t => {
        const y = yFor(t);
        statChart.appendChild(svgEl('line', {
            x1: CHART_PAD.left, x2: chartWidth - CHART_PAD.right, y1: y, y2: y,
            class: 'stat-chart-gridline',
        }));
        const label = svgEl('text', {
            x: CHART_PAD.left - 8, y, class: 'stat-chart-tick-label',
            'text-anchor': 'end', 'dominant-baseline': 'middle',
        });
        label.textContent = def.format(t);
        statChart.appendChild(label);
    });

    // Baseline.
    statChart.appendChild(svgEl('line', {
        x1: CHART_PAD.left, x2: chartWidth - CHART_PAD.right, y1: yFor(0), y2: yFor(0),
        class: 'stat-chart-axis',
    }));

    // X-axis season labels — thin them out so they don't collide when there
    // are many seasons.
    const minLabelSpacing = 46;
    const labelStep = Math.max(1, Math.ceil((minLabelSpacing * (points.length - 1)) / Math.max(plotW, 1)));
    points.forEach((p, i) => {
        if (i % labelStep !== 0 && i !== points.length - 1) return;
        const label = svgEl('text', {
            x: xFor(i), y: CHART_H - CHART_PAD.bottom + 18,
            class: 'stat-chart-tick-label', 'text-anchor': 'middle',
        });
        label.textContent = p.season;
        statChart.appendChild(label);
    });

    // Line.
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.value)}`).join(' ');
    statChart.appendChild(svgEl('path', { d: pathD, class: 'stat-chart-line' }));

    // Points: a surface-color ring behind each dot so they stay legible
    // where the line crosses or points sit close together.
    points.forEach((p, i) => {
        const cx = xFor(i);
        const cy = yFor(p.value);
        statChart.appendChild(svgEl('circle', { cx, cy, r: 6, class: 'stat-chart-point-ring' }));
        statChart.appendChild(svgEl('circle', { cx, cy, r: 4, class: 'stat-chart-point', 'data-index': i }));
    });

    // Direct label on the endpoint only.
    const last = points[points.length - 1];
    const lastLabel = svgEl('text', {
        x: xFor(points.length - 1), y: yFor(last.value) - 12,
        class: 'stat-chart-endpoint-label',
        'text-anchor': points.length === 1 ? 'middle' : 'end',
    });
    lastLabel.textContent = def.format(last.value);
    statChart.appendChild(lastLabel);

    // Crosshair, hidden until hover.
    const crosshair = svgEl('line', {
        x1: xFor(0), x2: xFor(0), y1: CHART_PAD.top, y2: CHART_H - CHART_PAD.bottom,
        class: 'stat-chart-crosshair hidden',
    });
    statChart.appendChild(crosshair);

    // Invisible hit area spanning the whole plot, so the pointer only has to
    // be over the chart (not dead-center on a point) to trigger the tooltip.
    const hitRect = svgEl('rect', {
        x: CHART_PAD.left, y: CHART_PAD.top, width: plotW, height: plotH,
        class: 'stat-chart-hit-area',
    });
    statChart.appendChild(hitRect);

    setupChartHover(points, def, xFor, crosshair, hitRect, plotW);
}

function setupChartHover(points, def, xFor, crosshair, hitRect, plotW) {
    function pointerToIndex(evt) {
        // viewBox width == rendered width (see getChartWidth), so 1 viewBox
        // unit == 1 CSS px and no scaling factor is needed here.
        const rect = statChart.getBoundingClientRect();
        const relX = evt.clientX - rect.left;
        const t = points.length === 1 ? 0 : (relX - CHART_PAD.left) / plotW;
        const idx = Math.round(t * (points.length - 1));
        return Math.min(points.length - 1, Math.max(0, idx));
    }

    function showAt(idx, evt) {
        const p = points[idx];
        const cx = xFor(idx);
        crosshair.setAttribute('x1', cx);
        crosshair.setAttribute('x2', cx);
        crosshair.classList.remove('hidden');

        statChart.querySelectorAll('.stat-chart-point.active').forEach(dot => dot.classList.remove('active'));
        const dot = statChart.querySelector(`.stat-chart-point[data-index="${idx}"]`);
        if (dot) dot.classList.add('active');

        statTooltip.innerHTML = '';
        const valueEl = document.createElement('div');
        valueEl.className = 't-value';
        valueEl.textContent = def.format(p.value);
        const seasonEl = document.createElement('div');
        seasonEl.className = 't-season';
        seasonEl.textContent = p.season;
        statTooltip.appendChild(valueEl);
        statTooltip.appendChild(seasonEl);
        statTooltip.classList.remove('hidden');

        const wrapRect = statChart.parentElement.getBoundingClientRect();
        statTooltip.style.left = (evt.clientX - wrapRect.left + 14) + 'px';
        statTooltip.style.top = (evt.clientY - wrapRect.top - 12) + 'px';
    }

    function onLeave() {
        crosshair.classList.add('hidden');
        statChart.querySelectorAll('.stat-chart-point.active').forEach(dot => dot.classList.remove('active'));
        statTooltip.classList.add('hidden');
    }

    hitRect.addEventListener('pointermove', evt => showAt(pointerToIndex(evt), evt));
    hitRect.addEventListener('pointerleave', onLeave);
}

// Re-render on resize so the viewBox width (and therefore point/line
// geometry) stays matched to the card's actual width instead of stretching.
let statChartResizeTimer = null;
window.addEventListener('resize', () => {
    if (!currentSeasons.length) return;
    clearTimeout(statChartResizeTimer);
    statChartResizeTimer = setTimeout(renderStatChart, 120);
});
