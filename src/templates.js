import { formatPacific, todayISO } from './dates.js';

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function randomChallenge() {
  const ops = ['+', '*'];
  const op  = ops[Math.floor(Math.random() * ops.length)];
  const a   = Math.floor(Math.random() * 21) - 10;
  const b   = Math.floor(Math.random() * 21) - 10;
  return { a, b, op };
}

export function landingPage(target, history, qrPath, lastRun) {
  // limit to last 10 entries
  const recent = history.slice(0, 10);

  // build history rows
  const rows = recent.map(({url, ts, source}) => {
    const time = formatPacific(ts);
    const tag = source === 'auto' ? ' <span style="color:#888;font-size:0.85em;">(auto)</span>' : '';
    return `
      <tr>
        <td><a href="${url}" target="_blank">${url}</a>${tag}</td>
        <td>${time}</td>
      </tr>`;
  }).join('');

  const banner = (lastRun && !lastRun.success) ? `
    <div class="banner">
      ⚠ Auto-update issue: ${escapeHtml(lastRun.error || 'unknown error')}<br>
      Last attempt: ${formatPacific(lastRun.ranAt)}
    </div>` : '';

  let autoStatusText = 'No syncs yet';
  let autoStatusColor = '#999';
  if (lastRun) {
    if (lastRun.success && lastRun.nextCalendarSaturdayCached) {
      autoStatusText = `Synced ${formatPacific(lastRun.ranAt)}`;
      autoStatusColor = '#2f9e44';
    } else {
      autoStatusText = 'Needs attention';
      autoStatusColor = '#c92a2a';
    }
  }

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Redirect Admin</title>
<style>
  *, *::before, *::after {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    font-family: system-ui, sans-serif;
    background: #f0f2f5;
  }
  .container {
    max-width: 440px;
    margin: 2rem auto;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    padding: 1.25rem;
  }
  h1 {
    margin: 0 0 1rem;
    font-size: 1.3rem;
    text-align: center;
  }
  .btn {
    display: block;
    flex: 1;
    padding: 0.6rem;
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: white;
    background: #0070f3;
    text-decoration: none;
    border-radius: 6px;
    text-align: center;
  }
  .btn.secondary {
    background: #555;
  }
  #syncBtn {
    flex: 0 0 auto;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    border-radius: 50%;
    background: linear-gradient(135deg, #2196f3, #0070f3);
    color: white;
    cursor: pointer;
    font-size: 1.2rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,112,243,0.4);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  #syncBtn svg {
    width: 1.1rem;
    height: 1.1rem;
  }
  #syncBtn:hover:not(:disabled) {
    transform: scale(1.08);
    box-shadow: 0 3px 8px rgba(0,112,243,0.5);
  }
  #syncBtn:active:not(:disabled) {
    transform: scale(0.94);
  }
  #syncBtn:disabled {
    opacity: 0.55;
    cursor: default;
    box-shadow: none;
  }
  #syncBtn.spinning svg {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .banner {
    background: #fdecea;
    color: #c92a2a;
    border: 1px solid #f5c2c2;
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  .card {
    background: #fafbfc;
    border: 1px solid #e8eaed;
    border-radius: 8px;
    padding: 0.9rem 1rem;
    margin-bottom: 0.75rem;
  }
  .card h2 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #333;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .qr-code {
    display: block;
    margin: 0 auto;
    max-width: 180px;
    height: auto;
    cursor: zoom-in;
  }
  #qrOverlay {
    position: fixed;
    inset: 0;
    background: rgba(15,15,25,0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: zoom-out;
    padding: 5vw;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.25s ease, visibility 0s linear 0.25s;
  }
  #qrOverlay.open {
    opacity: 1;
    visibility: visible;
    transition: opacity 0.25s ease, visibility 0s;
  }
  #qrOverlay .qr-card {
    transform: scale(0.85);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: default;
  }
  #qrOverlay.open .qr-card {
    transform: scale(1);
  }
  #qrOverlay img {
    width: min(90vw, 90vh);
    height: min(90vw, 90vh);
    background: white;
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    display: block;
  }
  #qrClose {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.65;
    transition: opacity 0.15s ease, background 0.15s ease, transform 0.15s ease;
  }
  #qrClose:hover {
    opacity: 1;
    background: rgba(255,255,255,0.25);
    transform: scale(1.08);
  }
  #qrClose svg {
    width: 1.1rem;
    height: 1.1rem;
  }
  details {
    width: 100%;
    margin-top: 0.5rem;
  }
  summary {
    padding: 0.4rem 0;
    cursor: pointer;
    list-style: none;
    font-size: 0.85rem;
    color: #666;
  }
  /* hide default triangle */
  summary::-webkit-details-marker { display: none; }
  table-wrapper {
    display: block;
    overflow-x: auto;
    margin-top: 0.5rem;
  }
  table {
    width: 100%;
    min-width: 400px;
    border-collapse: collapse;
    box-sizing: border-box;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 0.5rem;
    text-align: left;
  }
  th {
    background: #fafafa;
    position: sticky;
    top: 0;
  }
  tr:nth-child(even) {
    background: #f9f9f9;
  }
</style>
</head><body>
  <div class="container">
    <h1>Redirect Admin</h1>
    ${banner}

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.6rem;">
        <h2>Auto-Update</h2>
        <span style="font-size:0.75rem;color:${autoStatusColor};">● ${escapeHtml(autoStatusText)}</span>
      </div>
      <form id="syncForm" style="display:flex;gap:0.5rem;align-items:center;margin:0;">
        <input type="password" id="syncPw" placeholder="Admin password" style="flex:1;min-width:0;padding:0.5rem;font-size:0.9rem;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;"/>
        <button type="submit" id="syncBtn" title="Sync Now">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </form>
      <div id="syncMsg" style="margin-top:0.5rem;font-size:0.82rem;color:#666;"></div>
    </div>

    <div class="card" style="text-align:center;">
      <h2 style="text-align:left;margin-bottom:0.75rem;">Current Target</h2>
      <img src="${qrPath}" alt="QR Code" class="qr-code" id="qrThumb" title="Tap to enlarge"/>
      <p style="word-break:break-all;font-size:0.82rem;margin:0.6rem 0 0;">
        <a href="${target}" target="_blank" style="color:#0070f3;text-decoration:none;">${target}</a>
      </p>
    </div>

    <div class="actions">
      <a href="/admin/update" class="btn">Update Redirect</a>
      <a href="/admin/dash" class="btn secondary">Dashboard</a>
    </div>

    <details>
      <summary>Recent history (${recent.length})</summary>
      <div style="overflow-x:auto; margin-top:0.5rem;">
        <table>
          <thead>
            <tr><th>URL</th><th>Updated At</th></tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </details>
  </div>

  <div id="qrOverlay">
    <button id="qrClose" title="Close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
    <div class="qr-card">
      <img src="${qrPath}" alt="QR Code (enlarged)"/>
    </div>
  </div>

  <script>
    const qrThumb   = document.getElementById('qrThumb');
    const qrOverlay = document.getElementById('qrOverlay');
    const qrClose   = document.getElementById('qrClose');
    const qrCard    = document.querySelector('#qrOverlay .qr-card');
    qrThumb.addEventListener('click', () => qrOverlay.classList.add('open'));
    qrOverlay.addEventListener('click', () => qrOverlay.classList.remove('open'));
    qrClose.addEventListener('click', () => qrOverlay.classList.remove('open'));
    qrCard.addEventListener('click', e => e.stopPropagation());

    const syncForm = document.getElementById('syncForm');
    const syncBtn  = document.getElementById('syncBtn');
    const syncPw   = document.getElementById('syncPw');
    const syncMsg  = document.getElementById('syncMsg');

    syncForm.addEventListener('submit', async e => {
      e.preventDefault();
      syncBtn.disabled = true;
      syncBtn.classList.add('spinning');
      syncMsg.textContent = 'Starting…';
      let res;
      try {
        res = await fetch('/admin/sync-schedule', {
          method: 'POST',
          headers: { 'X-Admin-Password': syncPw.value }
        });
      } catch (e) {
        syncMsg.textContent = '❌ Request failed';
        syncBtn.disabled = false;
        syncBtn.classList.remove('spinning');
        return;
      }
      if (res.status === 401) {
        syncMsg.textContent = '❌ Invalid password';
        syncBtn.disabled = false;
        syncBtn.classList.remove('spinning');
        return;
      }
      if (!res.ok) {
        syncMsg.textContent = '❌ Failed to start sync';
        syncBtn.disabled = false;
        syncBtn.classList.remove('spinning');
        return;
      }
      poll();
    });

    function poll() {
      const interval = setInterval(async () => {
        const r = await fetch('/admin/sync-status');
        const s = await r.json();
        if (s.state === 'running') {
          syncMsg.textContent = '⏳ ' + (s.currentStage || 'working…');
        } else {
          clearInterval(interval);
          syncBtn.disabled = false;
          syncBtn.classList.remove('spinning');
          syncMsg.textContent = '✅ Done — see the dashboard for details';
        }
      }, 1000);
    }
  </script>
</body></html>`;
}

export function updateForm() {
  const ch = randomChallenge();
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Update Redirect</title>
<style>
  html,body{height:100%;margin:0;}
  body{display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f9f9f9;}
  .box{background:white;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;width:100%;box-sizing:border-box;}
  h1{margin-top:0;font-size:1.25rem;}
  form{display:grid;gap:1rem;}
  input,button{font-size:1rem;padding:0.5rem;border-radius:4px;box-sizing:border-box;}
  input{border:1px solid #ccc;width:100%;}
  button{background:#0070f3;color:white;border:none;cursor:pointer;}
  button:hover{background:#005bb5;}
  .msg{margin-top:1rem;font-size:0.95rem;}
  .error{color:#c92a2a;}
  a{display:block;margin-top:1rem;text-align:center;color:#0070f3;text-decoration:none;font-size:0.9rem;}
</style>
</head><body>
  <div class="box">
    <h1>Update Redirect</h1>
    <form id="f">
      <input type="url"     name="url"      placeholder="https://example.com" autocomplete="off" required/>
      <input type="password" name="password" placeholder="Admin password" required/>
      <label id="challenge">
        <strong>Prove you are human!</strong><br>
        <strong>Solve: ${ch.a} ${ch.op} ${ch.b} =</strong>
        <input type="number" name="captcha" required style="width:4rem"/>
      </label>
      <input type="hidden" name="a"  value="${ch.a}"/>
      <input type="hidden" name="b"  value="${ch.b}"/>
      <input type="hidden" name="op" value="${ch.op}"/>
      <button type="submit">Save</button>
    </form>
    <div id="msg" class="msg"></div>
    <a href="/"            target="_blank" rel="noopener noreferrer">▶ Test redirect</a>
    <a href="/admin" style="margin-top:0.5rem;display:block;">← Admin Menu</a>
  </div>
  <script>
    const f   = document.getElementById("f");
    const msg = document.getElementById("msg");
    const ch  = document.getElementById("challenge");
    f.addEventListener("submit", async e => {
      e.preventDefault();

      // 0) Confirm the exact URL before sending — catches autofill/paste mistakes
      const urlValue = f.querySelector("input[name=url]").value;
      if (!confirm("Set redirect to:\n\n" + urlValue + "\n\nContinue?")) {
        return;
      }

      msg.textContent = "Updating…";
      msg.classList.remove("error");

      // 1) Submit
      const res = await fetch("/admin/update", {
        method: "POST",
        body: new FormData(f)
      });
      const txt = await res.text();

      // 2) Display result
      if (!res.ok) {
        msg.textContent = txt;
        msg.classList.add("error");
      } else {
        msg.textContent = txt;
      }

      // 3) Reset password (so they have to retype)
      f.querySelector("input[name=password]").value = "";

      // 4) New CAPTCHA
      const { a, b, op } = randomChallenge();
      ch.innerHTML =
        '<strong>Prove you are human!</strong><br>' +
        '<strong>Solve: ' + a + ' ' + op + ' ' + b + ' =</strong>' +
        '<input type="number" name="captcha" required style="width:4rem"/>';

      // 5) Store hidden inputs
      f.querySelector("input[name=a]").value  = a;
      f.querySelector("input[name=b]").value  = b;
      f.querySelector("input[name=op]").value = op;
    });

    function randomChallenge(){
      const ops = ["+","*"];
      const op  = ops[Math.floor(Math.random()*ops.length)];
      const a   = Math.floor(Math.random()*21)-10;
      const b   = Math.floor(Math.random()*21)-10;
      return {a,b,op};
    }
  </script>
</body></html>`;
}

export function dashboardPage(all, runs = [], schedule = {}) {
  // Sort & cap to last 1,000 dates
  let dates = Object.keys(all).sort();
  if (dates.length > 1000) dates = dates.slice(-1000);
  const stats = {};
  for (const d of dates) stats[d] = all[d];

  // Build table rows (newest first)
  let rows = "";
  for (const d of dates.slice().reverse()) {
    const { success=0, redirects=0, failure } = stats[d];
    const totalFail = (failure.captcha||0)
                    + (failure.password||0)
                    + (failure.rateLimit||0);
    rows += `
      <tr>
        <td>${d}</td>
        <td>${success}</td>
        <td>${totalFail}</td>
        <td>${redirects}</td>
      </tr>`;
  }

  const statsJson = JSON.stringify(stats);

  // Auto-update (scrape) run history
  const lastRun = runs[0];
  const lastRunSummary = lastRun ? `
    <p>
      Last run: ${formatPacific(lastRun.ranAt)} (${lastRun.trigger})<br>
      Status: ${lastRun.success ? '✅ OK' : '❌ ' + escapeHtml(lastRun.error || 'error')}<br>
      Next Saturday (${lastRun.nextCalendarSaturday}): ${lastRun.nextCalendarSaturdayCached ? '✅ cached' : '⚠ not cached yet'}
    </p>` : '<p>No auto-update runs yet.</p>';

  let scrapeRunRows = '';
  for (const r of runs) {
    scrapeRunRows += `
      <tr>
        <td>${formatPacific(r.ranAt)}</td>
        <td>${r.trigger}</td>
        <td>${r.success ? '✅' : '❌ ' + escapeHtml(r.error || '')}</td>
        <td>${r.entriesFound}</td>
        <td>${r.newEntriesAdded}</td>
        <td>${r.promoted ? `<span title="${escapeHtml(r.promotedTo || '')}">✅</span>` : '—'}</td>
      </tr>`;
  }

  // Upcoming cached links (schedule entries for today or later)
  const today = todayISO();
  const upcoming = Object.entries(schedule)
    .filter(([d]) => d >= today)
    .sort(([a], [b]) => a.localeCompare(b));

  const currentIndex = upcoming.findIndex(([d]) => d === today);
  const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;

  const upcomingRows = upcoming.map(([d, url], i) => {
    const dateLabel = new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC'
    });
    let badge = '';
    if (i === currentIndex) {
      badge = ' <span style="background:#2f9e44;color:white;font-size:0.65rem;font-weight:600;padding:0.15rem 0.4rem;border-radius:3px;">CURRENT</span>';
    } else if (i === nextIndex) {
      badge = ' <span style="background:#0070f3;color:white;font-size:0.65rem;font-weight:600;padding:0.15rem 0.4rem;border-radius:3px;">NEXT</span>';
    }
    return `
      <tr>
        <td style="white-space:nowrap;">${escapeHtml(dateLabel)}${badge}</td>
        <td style="word-break:break-all;font-size:0.82rem;text-align:left;"><a href="${escapeHtml(url)}" target="_blank" style="color:#0070f3;text-decoration:none;">${escapeHtml(url)}</a></td>
      </tr>`;
  }).join('');

  const upcomingSection = upcoming.length ? `
    <table>
      <colgroup><col style="width:32%"><col style="width:68%"></colgroup>
      <thead><tr><th>Date</th><th style="text-align:left;">Cached URL</th></tr></thead>
      <tbody>${upcomingRows}</tbody>
    </table>` : `<p style="color:#999;font-size:0.9rem;margin:0;">Nothing cached yet for upcoming Saturdays.</p>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Redirect Dashboard</title>
<style>
  body {
    margin: 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
  }
  /* Sidebar */
  .sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    width: 180px;
    background: #f0f0f0;
    padding: 1rem;
    box-shadow: 2px 0 4px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
  }
  .sidebar .top, .sidebar .bottom {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sidebar .spacer {
    flex: 1;
  }
  .sidebar button {
    padding: 0.5rem 1rem;
    background: #ccc;
    border: none;
    border-radius: 4px;
    font-size: 0.95rem;
    cursor: pointer;
    text-align: left;
  }
  .sidebar button:hover {
    background: #bbb;
  }
  /* Main content shifted right of sidebar */
  .content {
    margin-left: 200px;
    padding: 2rem;
    width: calc(100% - 200px);
    background: #f9f9f9;
    box-sizing: border-box;
    min-height: 100vh;
  }
  h1 { margin-top: 0; }
  .card {
    background: white;
    padding: 1rem;
    margin-bottom: 2rem;
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }
  .card h2 {
    margin-top: 0;
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  canvas { width: 100% !important; height: auto !important; }
  table {
    width: 100%;
    max-width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 0.6rem 0.75rem;
    text-align: center;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
  }
  th {
    background: #f0f0f0;
    position: sticky;
    top: 0;
  }
  tr:nth-child(even) { background: #fafafa; }
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    min-width: 0;
  }
  .two-col .card {
    min-width: 0;
  }
  @media (max-width: 700px) {
    .two-col { grid-template-columns: 1fr; }
  }
  .scroll-table {
    max-height: 280px;
    overflow-y: auto;
    overflow-x: auto;
  }
</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head><body>

  <div class="sidebar">
    <div class="top">
      <button onclick="location.href='/admin/export/analytics.csv'">Export Analytics CSV</button>
      <button onclick="location.href='/admin/export/history.csv'">Export History CSV</button>
      <button onclick="location.href='/admin/stats'">View Raw Stats (JSON)</button>
    </div>
    <div class="spacer"></div>
    <div class="bottom">
      <button onclick="location.href='/admin'">← Admin Menu</button>
    </div>
  </div>

  <div class="content">
    <h1>Redirect Dashboard</h1>

    <div class="card">
      <h2>Total Redirects Over Time</h2>
      <canvas id="redirectChart"></canvas>
    </div>

    <div class="card">
      <h2>Manual Update Attempts (Success vs. Failures)</h2>
      <canvas id="attemptChart"></canvas>
    </div>

    <div class="card">
      <h2>Upcoming Cached Links</h2>
      ${upcomingSection}
    </div>

    <div class="two-col">
      <div class="card">
        <h2>Auto-Update Status</h2>
        ${lastRunSummary}
        <div class="scroll-table">
          <table>
            <colgroup>
              <col style="width:26%"><col style="width:12%"><col style="width:28%">
              <col style="width:10%"><col style="width:10%"><col style="width:14%">
            </colgroup>
            <thead>
              <tr><th>Time</th><th>Trigger</th><th>Status</th><th>Found</th><th>Added</th><th>Promoted</th></tr>
            </thead>
            <tbody>
              ${scrapeRunRows}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h2>Daily Summary</h2>
        <div class="scroll-table">
          <table>
            <thead>
              <tr><th>Date</th><th>Success</th><th>Failures</th><th>Redirects</th></tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    const stats = ${statsJson};
    const dateKeys = Object.keys(stats).sort();

    // Real elapsed-time x-axis: days-since-epoch as a linear numeric value, so
    // gaps between dates with no data are visually proportional instead of
    // every bar/point being evenly spaced regardless of actual date gaps.
    const toDay = d => Date.parse(d) / 86400000;
    const dateTickFmt = v => new Date(v * 86400000).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC'
    });

    const point = fn => dateKeys.map(d => ({ x: toDay(d), y: fn(stats[d]) }));
    const redirectPoints = point(s => s.redirects || 0);

    // The attempts chart uses evenly-spaced categories, not real elapsed
    // time — manual updates are rare, so on a proportional-time axis the
    // bars end up as thin isolated spikes across a mostly-empty chart. A
    // line (above) reads fine across gaps; stacked bars don't.
    const dateLabels  = dateKeys.map(d => dateTickFmt(toDay(d)));
    const plain = fn => dateKeys.map(d => fn(stats[d]));
    const successData = plain(s => s.success || 0);
    const captchaData  = plain(s => s.failure.captcha || 0);
    const pwdData      = plain(s => s.failure.password || 0);
    const rlData       = plain(s => s.failure.rateLimit || 0);

    new Chart(
      document.getElementById('redirectChart').getContext('2d'),
      {
        type: 'line',
        data: {
          datasets: [{
            label: 'Redirects',
            data: redirectPoints,
            borderColor: '#4dc0b5',
            backgroundColor: 'rgba(77,192,181,0.15)',
            borderWidth: 2,
            tension: 0.25,
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: '#4dc0b5'
          }]
        },
        options: {
          scales: {
            x: { type: 'linear', ticks: { callback: dateTickFmt }, title: { display: true, text: 'Date' } },
            y: { beginAtZero: true }
          }
        }
      }
    );

    new Chart(
      document.getElementById('attemptChart').getContext('2d'),
      {
        type: 'bar',
        data: {
          labels: dateLabels,
          datasets: [
            { label: 'CAPTCHA Failures', data: captchaData, backgroundColor: 'rgba(255,99,132,0.6)', borderColor: 'rgba(255,99,132,1)', stack: 'stack1', barPercentage: 0.8 },
            { label: 'Password Failures', data: pwdData, backgroundColor: 'rgba(255,59,48,0.6)', borderColor: 'rgba(255,59,48,1)', stack: 'stack1', barPercentage: 0.8 },
            { label: 'RateLimit Failures', data: rlData, backgroundColor: 'rgba(200,50,50,0.6)', borderColor: 'rgba(200,50,50,1)', stack: 'stack1', barPercentage: 0.8 },
            { label: 'Successes', data: successData, backgroundColor: 'rgba(40,180,99,0.6)', borderColor: 'rgba(40,180,99,1)', stack: 'stack1', barPercentage: 0.8 }
          ]
        },
        options: {
          scales: {
            x: { stacked: true, ticks: { autoSkip: true, maxRotation: 0 }, title: { display: true, text: 'Date' } },
            y: { beginAtZero: true, stacked: true }
          },
          elements: { bar: { borderSkipped: false } }
        }
      }
    );
  </script>
</body></html>`;
}
