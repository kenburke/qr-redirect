export function todayISO(base = new Date()) {
  return base.toISOString().slice(0, 10);
}

export function nextCalendarSaturday(fromISO) {
  const [y, m, d] = fromISO.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const daysUntilSaturday = (6 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilSaturday);
  return date.toISOString().slice(0, 10);
}

export function formatPacific(isoOrMs) {
  return new Date(isoOrMs).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short'
  });
}

export function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
