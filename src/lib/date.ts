const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(t: number | Date = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function endOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** Whole days from today until the given YYYY-MM-DD (negative if past). */
export function daysUntil(key: string, now = Date.now()): number {
  const [y, m, d] = key.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(dayKey(now) + 'T00:00:00').getTime();
  return Math.round((target - today) / 86_400_000);
}

export function formatDuration(ms: number): string {
  if (ms > 0 && ms < 59_500) return `${Math.max(1, Math.round(ms / 1000))} s`;
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${pad(min % 60)} min`;
}

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
/** e.g. 10月10日（土） */
export function japaneseDate(now = new Date()): string {
  return `${now.getMonth() + 1}月${now.getDate()}日（${WEEKDAY_JA[now.getDay()]}）`;
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago" */
export function timeAgo(t: number, now = Date.now()): string {
  const s = Math.max(0, (now - t) / 1000);
  if (s < 45) return 'just now';
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
