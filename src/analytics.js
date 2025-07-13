export async function updateAnalytics(type) {
  const AN    = 'analytics';
  const today = new Date().toISOString().slice(0,10);
  const raw   = await REDIRECT_KV.get(AN);
  const stats = raw ? JSON.parse(raw) : {};

  if (!stats[today]) {
    stats[today] = {
      success:   0,
      redirects: 0,
      failure: { captcha:0, password:0, rateLimit:0 }
    };
  }

  if (type === 'success') {
    stats[today].success++;
  } else if (type === 'redirects') {
    stats[today].redirects++;
  } else {
    stats[today].failure[type] = (stats[today].failure[type] || 0) + 1;
  }

  // cap to last 1,000 days
  const dates = Object.keys(stats).sort();
  if (dates.length > 1000) {
    for (let i = 0; i < dates.length - 1000; i++) {
      delete stats[dates[i]];
    }
  }

  await REDIRECT_KV.put(AN, JSON.stringify(stats));
}
