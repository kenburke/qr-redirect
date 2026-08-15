import { todayISO, nextCalendarSaturday, addDaysISO } from './dates.js';
import { sendFailureEmail } from './alerts.js';

const CASTRO_CLEANUP_ID = 19;
const BASE = 'https://cleanupthecity.org';

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(';')[0];
}

async function login() {
  const loginPageRes = await fetch(`${BASE}/users/log_in`);
  const loginPageHtml = await loginPageRes.text();
  const csrfMatch = loginPageHtml.match(/name="_csrf_token" type="hidden" hidden value="([^"]+)"/);
  if (!csrfMatch) throw new Error('login page: CSRF token not found (page structure may have changed)');
  const loginCookie = extractCookie(loginPageRes.headers.get('set-cookie'));

  const form = new URLSearchParams();
  form.set('_csrf_token', csrfMatch[1]);
  form.set('user[email]', CLEANUP_EMAIL);
  form.set('user[password]', CLEANUP_PASSWORD);
  form.set('user[remember_me]', 'false');

  const loginRes = await fetch(`${BASE}/users/log_in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': loginCookie
    },
    body: form.toString(),
    redirect: 'manual'
  });

  if (loginRes.status !== 302) {
    throw new Error(`login failed: expected redirect, got HTTP ${loginRes.status} (wrong credentials, or page structure changed)`);
  }
  const location = loginRes.headers.get('location') || '';
  if (location.includes('/users/log_in')) {
    throw new Error('login failed: redirected back to login page (wrong credentials, or page structure changed)');
  }
  const sessionCookie = extractCookie(loginRes.headers.get('set-cookie'));
  if (!sessionCookie) throw new Error('login: no session cookie returned');
  return sessionCookie;
}

async function fetchCastroEvents(cookie) {
  const res = await fetch(`${BASE}/organizer/cleanups/${CASTRO_CLEANUP_ID}`, {
    headers: { Cookie: cookie }
  });
  if (!res.ok) throw new Error(`fetching Castro events list: HTTP ${res.status}`);
  const html = await res.text();

  const events = [];
  const linkRe = /href="\/organizer\/events\/(\d+)"/g;
  const seen = new Set();
  let m;
  while ((m = linkRe.exec(html))) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const rowStart = html.lastIndexOf('<tr', m.index);
    const rowEnd = html.indexOf('</tr>', m.index);
    if (rowStart === -1 || rowEnd === -1) continue;
    const rowText = html.slice(rowStart, rowEnd).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const dateMatch = rowText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) continue;
    const [, mm, dd, yyyy] = dateMatch;
    events.push({ id, dateISO: `${yyyy}-${mm}-${dd}` });
  }
  if (events.length === 0) throw new Error('Castro events list: no events found (page structure may have changed)');
  return events;
}

async function extractCheckinUrl(eventId, cookie) {
  const res = await fetch(`${BASE}/organizer/events/${eventId}`, {
    headers: { Cookie: cookie }
  });
  if (!res.ok) throw new Error(`fetching event ${eventId}: HTTP ${res.status}`);
  const html = await res.text();
  const match = html.match(/https:\/\/cleanupthecity\.org\/event_participants\/checkin\/\d+\/[0-9a-f-]+/);
  if (!match) throw new Error(`event ${eventId}: checkin URL not found on page (structure may have changed)`);
  return match[0];
}

async function setStatus(state, currentStage, startedAt) {
  await REDIRECT_KV.put('scrapeStatus', JSON.stringify({ state, currentStage, startedAt }));
}

export async function runSync({ trigger }) {
  const startedAt = new Date().toISOString();
  await setStatus('running', 'starting', startedAt);

  const today = todayISO();
  let success = true;
  let error = null;
  let entriesFound = 0;
  let newEntriesAdded = 0;

  try {
    await setStatus('running', 'logging in', startedAt);
    const cookie = await login();

    await setStatus('running', 'fetching event list', startedAt);
    const events = await fetchCastroEvents(cookie);

    const cutoff = addDaysISO(today, -3);
    const upcoming = events.filter(e => e.dateISO >= cutoff);
    entriesFound = upcoming.length;

    const rawSchedule = await REDIRECT_KV.get('schedule');
    const schedule = rawSchedule ? JSON.parse(rawSchedule) : {};

    const toFetch = upcoming.filter(e => !(e.dateISO in schedule));
    for (let i = 0; i < toFetch.length; i++) {
      await setStatus('running', `fetching event ${i + 1}/${toFetch.length}`, startedAt);
      schedule[toFetch[i].dateISO] = await extractCheckinUrl(toFetch[i].id, cookie);
      newEntriesAdded++;
    }

    const pruneCutoff = addDaysISO(today, -60);
    for (const key of Object.keys(schedule)) {
      if (key < pruneCutoff) delete schedule[key];
    }
    await REDIRECT_KV.put('schedule', JSON.stringify(schedule));
  } catch (err) {
    success = false;
    error = (err && err.message) ? err.message : String(err);
  }

  await setStatus('running', 'promoting', startedAt);

  const expected = nextCalendarSaturday(today);
  const rawScheduleNow = await REDIRECT_KV.get('schedule');
  const scheduleNow = rawScheduleNow ? JSON.parse(rawScheduleNow) : {};
  const expectedUrl = scheduleNow[expected];
  const nextCalendarSaturdayCached = !!expectedUrl;

  let promoted = false;
  let promotedTo = null;

  if (expectedUrl) {
    const currentTarget = await REDIRECT_KV.get('target');
    if (currentTarget !== expectedUrl) {
      await REDIRECT_KV.put('target', expectedUrl);
      const histRaw = await REDIRECT_KV.get('history');
      const hist = histRaw ? JSON.parse(histRaw) : [];
      hist.unshift({ url: expectedUrl, ts: Date.now(), source: 'auto' });
      if (hist.length > 10) hist.splice(10);
      await REDIRECT_KV.put('history', JSON.stringify(hist));
      promoted = true;
      promotedTo = expectedUrl;
    }
  } else if (success) {
    success = false;
    error = `No cached URL for expected Saturday ${expected}`;
  }

  const run = {
    ranAt: new Date().toISOString(),
    trigger,
    success,
    error,
    entriesFound,
    newEntriesAdded,
    nextCalendarSaturday: expected,
    nextCalendarSaturdayCached,
    promoted,
    promotedTo
  };

  const runsRaw = await REDIRECT_KV.get('scrapeRuns');
  const runs = runsRaw ? JSON.parse(runsRaw) : [];
  runs.unshift(run);
  if (runs.length > 30) runs.splice(30);
  await REDIRECT_KV.put('scrapeRuns', JSON.stringify(runs));

  const daysUntilExpected = (Date.parse(`${expected}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000;
  if (!success || (!nextCalendarSaturdayCached && daysUntilExpected <= 2)) {
    try {
      await sendFailureEmail(run);
    } catch (emailErr) {
      console.error('sendFailureEmail failed:', emailErr);
    }
  }

  await setStatus('idle', null, startedAt);
  return run;
}
