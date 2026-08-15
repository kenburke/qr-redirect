const ALERT_TO = 'kennethjburkejr@gmail.com';

export async function sendFailureEmail(run) {
  const subject = `qr-redirect auto-update: ${run.error || 'check needed'}`;

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
      text: JSON.stringify(run, null, 2)
    })
  });

  if (!res.ok) {
    throw new Error(`Resend send failed: HTTP ${res.status} ${await res.text()}`);
  }
}
