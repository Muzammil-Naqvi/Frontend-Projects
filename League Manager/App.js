/* ═══════════════════════════════════════
   FootLeague Manager — app.js
   Handles: routing, form submission, API calls
   Backend: Flask at http://localhost:5000
   ═══════════════════════════════════════ */

const API_BASE = 'http://localhost:5000';

// ─── PAGE ROUTER ───────────────────────────────

const pages = ['home', 'add-team', 'add-match', 'standings'];

function navigate(pageId) {
  // Update pages
  pages.forEach(id => {
    document.getElementById(`page-${id}`).classList.remove('active');
    const navBtn = document.getElementById(`nav-${id}`);
    if (navBtn) navBtn.classList.remove('active');
  });

  const targetPage = document.getElementById(`page-${pageId}`);
  const targetNav  = document.getElementById(`nav-${pageId}`);

  if (targetPage) targetPage.classList.add('active');
  if (targetNav)  targetNav.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Trigger page-specific load actions
  if (pageId === 'add-match') populateTeamDropdowns();
  if (pageId === 'standings') loadStandings();
  if (pageId === 'home')      loadQuickStats();
}

// Alias for nav-logo click
function showPage(id) { navigate(id); }


// ─── API HELPER ────────────────────────────────

async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Something went wrong');
  }
  return data;
}


// ─── ALERT HELPER ──────────────────────────────

function showAlert(alertId, type, message) {
  const el = document.getElementById(alertId);
  el.className = `alert ${type}`;
  el.textContent = message;
  el.classList.remove('hidden');

  setTimeout(() => {
    el.classList.add('hidden');
  }, 4000);
}

function hideAlert(alertId) {
  document.getElementById(alertId).classList.add('hidden');
}


// ─── Q2 — ADD TEAM ─────────────────────────────

async function submitTeam() {
  const input  = document.getElementById('team-name-input');
  const btn    = document.getElementById('add-team-btn');
  const loader = document.getElementById('team-loader');
  const name   = input.value.trim();

  hideAlert('team-alert');

  // Client-side validation
  if (!name) {
    showAlert('team-alert', 'error', '⚠️ Team name cannot be empty.');
    input.focus();
    return;
  }
  if (name.length < 2) {
    showAlert('team-alert', 'error', '⚠️ Team name must be at least 2 characters.');
    input.focus();
    return;
  }

  // Loading state
  btn.disabled = true;
  loader.classList.remove('hidden');

  try {
    const data = await apiCall('/add_team', 'POST', { team_name: name });
    showAlert('team-alert', 'success', `✅ "${name}" has been registered successfully!`);
    input.value = '';
  } catch (err) {
    showAlert('team-alert', 'error', `❌ ${err.message}`);
  } finally {
    btn.disabled = false;
    loader.classList.add('hidden');
  }
}

// Submit on Enter key in team input
document.getElementById('team-name-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') submitTeam();
});


// ─── Q3 — ADD MATCH ────────────────────────────

async function populateTeamDropdowns() {
  try {
    const data = await apiCall('/standings');
    const teams = data.standings || data.teams || [];

    const sel1 = document.getElementById('team1-select');
    const sel2 = document.getElementById('team2-select');

    // Preserve current selection
    const prev1 = sel1.value;
    const prev2 = sel2.value;

    sel1.innerHTML = '<option value="">Select team...</option>';
    sel2.innerHTML = '<option value="">Select team...</option>';

    teams.forEach(team => {
      const name = team.team_name || team.name;
      const id   = team.team_id   || team.id || name;
      const opt1 = new Option(name, id);
      const opt2 = new Option(name, id);
      sel1.appendChild(opt1);
      sel2.appendChild(opt2);
    });

    // Restore selection if possible
    if (prev1) sel1.value = prev1;
    if (prev2) sel2.value = prev2;

  } catch (err) {
    console.warn('Could not load teams for dropdowns:', err.message);
  }
}

async function submitMatch() {
  const sel1   = document.getElementById('team1-select');
  const sel2   = document.getElementById('team2-select');
  const score1 = document.getElementById('team1-score');
  const score2 = document.getElementById('team2-score');
  const btn    = document.getElementById('add-match-btn');
  const loader = document.getElementById('match-loader');

  hideAlert('match-alert');

  const t1 = sel1.value;
  const t2 = sel2.value;
  const s1 = score1.value;
  const s2 = score2.value;

  // Validation
  if (!t1 || !t2) {
    showAlert('match-alert', 'error', '⚠️ Please select both teams.');
    return;
  }
  if (t1 === t2) {
    showAlert('match-alert', 'error', '⚠️ A team cannot play against itself.');
    return;
  }
  if (s1 === '' || s2 === '') {
    showAlert('match-alert', 'error', '⚠️ Please enter scores for both teams.');
    return;
  }
  if (isNaN(s1) || isNaN(s2) || parseInt(s1) < 0 || parseInt(s2) < 0) {
    showAlert('match-alert', 'error', '⚠️ Scores must be non-negative numbers.');
    return;
  }

  // Loading state
  btn.disabled = true;
  loader.classList.remove('hidden');

  try {
    const t1Name = sel1.options[sel1.selectedIndex].text;
    const t2Name = sel2.options[sel2.selectedIndex].text;

    await apiCall('/add_match', 'POST', {
      team1_id:    t1,
      team2_id:    t2,
      team1_score: parseInt(s1),
      team2_score: parseInt(s2)
    });

    const result = parseInt(s1) > parseInt(s2)
      ? `${t1Name} wins ${s1}–${s2}`
      : parseInt(s2) > parseInt(s1)
      ? `${t2Name} wins ${s2}–${s1}`
      : `Draw ${s1}–${s2}`;

    showAlert('match-alert', 'success', `✅ Match recorded! ${result}`);

    // Reset form
    sel1.value   = '';
    sel2.value   = '';
    score1.value = '';
    score2.value = '';

  } catch (err) {
    showAlert('match-alert', 'error', `❌ ${err.message}`);
  } finally {
    btn.disabled = false;
    loader.classList.add('hidden');
  }
}


// ─── Q4 — STANDINGS ────────────────────────────

async function loadStandings() {
  const tbody = document.getElementById('standings-body');
  tbody.innerHTML = '<tr><td colspan="8" class="empty-row">⏳ Fetching standings...</td></tr>';

  try {
    const data  = await apiCall('/standings');
    const teams = data.standings || data.teams || [];

    if (teams.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No teams found. Add teams to get started.</td></tr>';
      return;
    }

    tbody.innerHTML = '';

    teams.forEach((team, index) => {
      const rank = index + 1;
      const name = team.team_name || team.name || '—';
      const mp   = team.matches_played ?? team.mp ?? 0;
      const w    = team.wins    ?? team.w   ?? 0;
      const l    = team.losses  ?? team.l   ?? 0;
      const d    = team.draws   ?? team.d   ?? 0;
      const gd   = team.goal_difference ?? team.gd ?? 0;
      const pts  = team.points  ?? team.pts ?? 0;

      const gdClass = gd > 0 ? 'gd-pos' : gd < 0 ? 'gd-neg' : 'gd-zero';
      const gdStr   = gd > 0 ? `+${gd}` : `${gd}`;

      const topClass = rank === 1 ? 'style="background:rgba(255,215,0,0.04)"' : '';

      tbody.innerHTML += `
        <tr>
          <td><span class="rank-badge">${rank}</span></td>
          <td><span class="team-name-cell">${escapeHtml(name)}</span></td>
          <td>${mp}</td>
          <td>${w}</td>
          <td>${l}</td>
          <td>${d}</td>
          <td class="${gdClass}">${gdStr}</td>
          <td class="pts-cell">${pts}</td>
        </tr>
      `;
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">❌ Could not load standings: ${escapeHtml(err.message)}</td></tr>`;
  }
}


// ─── HOME QUICK STATS ──────────────────────────

async function loadQuickStats() {
  try {
    const data  = await apiCall('/standings');
    const teams = data.standings || data.teams || [];

    document.getElementById('stat-teams').textContent = teams.length || '0';

    let totalMatches = 0;
    teams.forEach(t => { totalMatches += (t.matches_played ?? t.mp ?? 0); });
    // Each match is counted twice (once per team), so divide by 2
    document.getElementById('stat-matches').textContent = Math.floor(totalMatches / 2);

    const leader = teams[0];
    document.getElementById('stat-leader').textContent =
      leader ? (leader.team_name || leader.name) : '—';

  } catch (err) {
    // Backend might not be running yet — leave as dashes
    document.getElementById('stat-teams').textContent   = '—';
    document.getElementById('stat-matches').textContent = '—';
    document.getElementById('stat-leader').textContent  = '—';
  }
}


// ─── UTILITIES ─────────────────────────────────

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}


// ─── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  navigate('home');
});
