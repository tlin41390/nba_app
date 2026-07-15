const params = new URLSearchParams(window.location.search);
const playerId = params.get('playerId');
const playerNameParam = params.get('name') || '';

const backBtn = document.getElementById('backBtn');
const playerHeadshot = document.getElementById('playerHeadshot');
const playerNameEl = document.getElementById('playerName');
const playerMeta = document.getElementById('playerMeta');
const statsMsg = document.getElementById('statsMsg');
const careerTableBody = document.getElementById('careerTableBody');

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
