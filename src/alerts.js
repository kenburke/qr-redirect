const ALERT_TO = 'kennethjburkejr@gmail.com';
const ADMIN_URL = 'https://qr-redirect-worker.kennethjburkejr.workers.dev/admin';

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function humanMessage(run) {
  const err = run.error || '';
  if (err.includes('login failed')) {
    return `I couldn't log into cleanupthecity.org to check for this week's link. This usually means the saved password there has changed and needs updating.`;
  }
  if (err.includes('No cached URL for expected Saturday')) {
    return `cleanupthecity.org doesn't have a check-in link published yet for Saturday, ${run.nextCalendarSaturday}. If the event is still a few days out this may just not be posted yet — but worth checking back soon, especially if Saturday is close.`;
  }
  if (err.includes('structure may have changed') || err.includes('CSRF')) {
    return `The cleanupthecity.org page layout seems to have changed, so I couldn't find the check-in link automatically anymore. The scraper will likely need a small update.`;
  }
  if (err) {
    return `Something went wrong during the automatic update: ${err}`;
  }
  return `The automatic update needs a look — no specific error was recorded.`;
}

export async function sendFailureEmail(run) {
  const subject = '⚠️ QR Redirect auto-update needs attention';
  const triggeredBy = run.trigger === 'cron' ? 'the daily automatic check' : 'a manual sync';
  const ranAt = new Date(run.ranAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 0.25rem;">⚠️ QR Redirect auto-update needs attention</h2>
      <p style="color: #777; margin-top: 0; font-size: 0.9rem;">From ${escapeHtml(triggeredBy)} at ${escapeHtml(ranAt)}</p>

      <p style="font-size: 1.05rem; line-height: 1.6;">${escapeHtml(humanMessage(run))}</p>

      <p style="line-height: 1.8;">
        <a href="${ADMIN_URL}/dash" style="color:#0070f3;">View the dashboard</a> for the full run history, or go to
        <a href="${ADMIN_URL}" style="color:#0070f3;">the admin page</a> to update the redirect manually if needed.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 1.5rem 0;">

      <p style="font-size: 0.8rem; color: #999; margin-bottom: 0.5rem;">Debug details</p>
      <pre style="background: #f5f5f5; border-radius: 6px; padding: 0.75rem; font-size: 0.78rem; line-height: 1.4; overflow-x: auto; color: #333; white-space: pre-wrap;">${escapeHtml(JSON.stringify(run, null, 2))}</pre>
    </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'QR Redirect Auto-Update <onboarding@resend.dev>',
      to: [ALERT_TO],
      subject,
      html
    })
  });

  if (!res.ok) {
    throw new Error(`Resend send failed: HTTP ${res.status} ${await res.text()}`);
  }
}
