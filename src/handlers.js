import * as Analytics from './analytics.js';
import * as Templates from './templates.js';

export function serveLanding() {
  return new Response(Templates.landingPage(), {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
  });
}

export async function serveStats() {
  const raw   = await REDIRECT_KV.get('analytics');
  const stats = raw ? JSON.parse(raw) : {};
  return new Response(JSON.stringify(stats, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function serveDashboard() {
  const raw   = await REDIRECT_KV.get('analytics');
  const stats = raw ? JSON.parse(raw) : {};
  return new Response(Templates.dashboardPage(stats), {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
  });
}

export function serveUpdateForm() {
  return new Response(Templates.updateForm(), {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' }
  });
}

export async function handleUpdate(request) {
  const form = await request.formData();

  // Rate limit
  const ip    = request.headers.get('cf-connecting-ip') || 'unknown';
  const key   = `rate:${ip}`;
  const now   = Date.now();
  const rawRL = await REDIRECT_KV.get(key);
  let { count = 0, start = now } = rawRL ? JSON.parse(rawRL) : {};
  if (now - start > Number(RATE_WINDOW) * 1000) {
    count = 0; start = now;
  }
  if (count >= Number(RATE_LIMIT)) {
    const retry = Math.ceil((Number(RATE_WINDOW)*1000 - (now - start)) / 1000);
    await Analytics.updateAnalytics('rateLimit');
    return new Response(`❌ Rate limit exceeded. Try again in ${retry}s.`, { status: 429 });
  }
  count++;
  await REDIRECT_KV.put(key, JSON.stringify({ count, start }), {
    expirationTtl: Number(RATE_WINDOW)
  });

  // CAPTCHA
  const a   = parseInt(form.get('a'));
  const b   = parseInt(form.get('b'));
  const op  = form.get('op');
  const ans = parseInt(form.get('captcha'));
  const valid = (op === '+' ? ans === a + b : ans === a * b);
  if (!valid) {
    await Analytics.updateAnalytics('captcha');
    return new Response('❌ Incorrect CAPTCHA answer', { status: 400 });
  }

  // Password
  if ((form.get('password')||'').trim() !== ADMIN_PASSWORD) {
    await Analytics.updateAnalytics('password');
    return new Response('❌ Invalid password', { status: 401 });
  }

  // Save redirect
  let newUrl = (form.get('url')||'').trim();
  if (!/^https?:\/\//i.test(newUrl)) newUrl = 'https://' + newUrl;
  if (newUrl.startsWith(new URL(request.url).origin)) {
    await Analytics.updateAnalytics('rateLimit');
    return new Response('❌ Can’t redirect to this site', { status: 400 });
  }
  await REDIRECT_KV.put('target', newUrl);

  // History
  const histRaw = await REDIRECT_KV.get('history');
  const histArr = histRaw ? JSON.parse(histRaw) : [];
  histArr.unshift({ url: newUrl, ts: Date.now() });
  if (histArr.length > 10) histArr.splice(10);
  await REDIRECT_KV.put('history', JSON.stringify(histArr));

  // Analytics success
  await Analytics.updateAnalytics('success');

  return new Response('✅ Redirect updated', { status: 200 });
}

export async function handleRedirect() {
  const target = await REDIRECT_KV.get('target');
  if (!target) {
    return new Response('No redirect set. Go to /admin', { status: 404 });
  }
  await Analytics.updateAnalytics('redirects');
  return Response.redirect(target, 302);
}

// ─── CSV Exports ────────────────────────────────────────────────────────────

export async function exportAnalytics() {
  const raw   = await REDIRECT_KV.get('analytics');
  const stats = raw ? JSON.parse(raw) : {};

  let csv = 'date,success,redirects,failure_captcha,failure_password,failure_rateLimit\n';
  for (const date of Object.keys(stats).sort()) {
    const { success=0, redirects=0, failure={} } = stats[date];
    const captcha   = failure.captcha   || 0;
    const password  = failure.password  || 0;
    const rateLimit = failure.rateLimit || 0;
    csv += `${date},${success},${redirects},${captcha},${password},${rateLimit}\n`;
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=UTF-8',
      'Content-Disposition': 'attachment; filename="analytics.csv"'
    }
  });
}

export async function exportHistory() {
  const raw     = await REDIRECT_KV.get('history');
  const history = raw ? JSON.parse(raw) : [];

  let csv = 'timestamp,url\n';
  for (const { ts, url } of history) {
    csv += `${new Date(ts).toISOString()},${url}\n`;
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=UTF-8',
      'Content-Disposition': 'attachment; filename="history.csv"'
    }
  });
}
