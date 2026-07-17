const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    appendMessage('user', message);
    chatInput.value = '';
    setLoading(true);
    const pendingEl = appendMessage('assistant', 'Thinking…', true);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        const data = await res.json();
        pendingEl.innerHTML = renderMarkdown(data.reply);
        pendingEl.classList.remove('pending');
    } catch (err) {
        pendingEl.textContent = 'Something went wrong asking that. Please try again.';
        pendingEl.classList.remove('pending');
        pendingEl.classList.add('error');
        console.error(err);
    } finally {
        setLoading(false);
    }
});

function appendMessage(role, text, pending) {
    const row = document.createElement('div');
    row.className = 'chat-row ' + role;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + role + (pending ? ' pending' : '');
    bubble.textContent = text;

    row.appendChild(bubble);
    chatLog.appendChild(row);
    chatLog.scrollTop = chatLog.scrollHeight;
    return bubble;
}

function setLoading(isLoading) {
    chatInput.disabled = isLoading;
    chatSendBtn.disabled = isLoading;
}

// ---------- Minimal markdown rendering (tables + bold/italic only) ----------
// Everything is HTML-escaped before any markdown syntax is interpreted, so
// the model's text can never inject arbitrary HTML/scripts into the page.

function renderMarkdown(raw) {
    const lines = String(raw).replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let i = 0;

    while (i < lines.length) {
        if (isTableSeparator(lines, i)) {
            const table = parseTable(lines, i);
            html += table.html;
            i = table.next;
        } else {
            html += inlineFormat(escapeHtml(lines[i])) + '\n';
            i++;
        }
    }

    return html;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// True if lines[i] looks like "| a | b |" and lines[i+1] is a separator
// row like "|---|:--:|".
function isTableSeparator(lines, i) {
    if (i + 1 >= lines.length) return false;
    const header = lines[i].trim();
    const separator = lines[i + 1].trim();
    if (!header.startsWith('|') || !header.endsWith('|')) return false;
    return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(separator);
}

function splitTableRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function parseTable(lines, i) {
    const headerCells = splitTableRow(lines[i]);
    let j = i + 2; // skip header + separator row
    const rows = [];
    while (j < lines.length && lines[j].trim().startsWith('|')) {
        rows.push(splitTableRow(lines[j]));
        j++;
    }

    let html = '<div class="chat-table-wrap"><table class="chat-table"><thead><tr>';
    headerCells.forEach(cell => {
        html += `<th>${inlineFormat(escapeHtml(cell))}</th>`;
    });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
            html += `<td>${inlineFormat(escapeHtml(cell))}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    return { html, next: j };
}

// Operates on already-escaped text, so it's safe to insert tags directly.
function inlineFormat(escapedText) {
    return escapedText
        .replace(/\*\*(.+?)\*\*/g, '<mark>$1</mark>')
        .replace(/__(.+?)__/g, '<mark>$1</mark>')
        .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
}
