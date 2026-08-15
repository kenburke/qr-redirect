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

export function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
