// ---------- State ----------
let allPlayers = [];
let currentPage = 1;
const PAGE_SIZE = 50;

// ---------- Elements ----------
const playerTableBody = document.getElementById('playerTableBody');
const playerCountEl = document.getElementById('playerCount');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageIndicator = document.getElementById('pageIndicator');

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const res = await fetch('/api/players');
        if (!res.ok) throw new Error('players fetch failed: ' + res.status);
        allPlayers = await res.json();
    } catch (err) {
        console.error(err);
        playerCountEl.textContent = 'Could not load players.';
        return;
    }
    playerCountEl.textContent = `${allPlayers.length} players`;
    renderPage(1);
}

// ---------- Paginated browse table ----------
function renderPage(page) {
    const totalPages = Math.max(1, Math.ceil(allPlayers.length / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, page), totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pagePlayers = allPlayers.slice(start, start + PAGE_SIZE);

    const rows = pagePlayers.map(p => {
        const meta = p.active ? (p.teamAbbreviation || '') : 'Retired';
        return `<tr data-player-id="${p.id}"><td>${p.fullName}</td><td>${meta}</td></tr>`;
    });
    playerTableBody.innerHTML = rows.join('');

    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

playerTableBody.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const id = parseInt(row.dataset.playerId, 10);
    const player = allPlayers.find(p => p.id === id);
    if (player) selectPlayer(player);
});

prevPageBtn.addEventListener('click', () => renderPage(currentPage - 1));
nextPageBtn.addEventListener('click', () => renderPage(currentPage + 1));

// ---------- Player search / autocomplete ----------
const playerInput = document.getElementById('playerInput');
const suggestionsBox = document.getElementById('suggestions');

let debounceTimer = null;
let activeSuggestionIndex = -1;
let currentSuggestions = [];

playerInput.addEventListener('input', () => {
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
            selectPlayer(currentSuggestions[activeSuggestionIndex]);
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
        item.addEventListener('click', () => selectPlayer(p));
        suggestionsBox.appendChild(item);
    });
    suggestionsBox.classList.remove('hidden');
}

function hideSuggestions() {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
}

// ---------- View switching ----------
function selectPlayer(player) {
    window.location.href = `player-bio.html?playerId=${player.id}&name=${encodeURIComponent(player.fullName)}`;
}
