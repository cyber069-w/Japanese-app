/** Study costs: entries, default categories, semester totals, CSV. Pure helpers (the vault store is in financeStore.ts). */
export interface CostEntry {
  id: string; /** open for a later budgeting app */ kind: 'study-cost';
  date: string; amount: number; currency: string; category: string; note: string; receipt?: string;
}
export interface Meta { categories: string[]; currency: string }
export const DEFAULT_CATEGORIES = ['Semester fees', 'Books & materials', 'Software & devices', 'Courses (non-CFA)', 'Travel to uni', 'Other'];
export const DEFAULT_META: Meta = { categories: DEFAULT_CATEGORIES, currency: 'CHF' };

export const newEntry = (p: Partial<CostEntry> = {}, now = Date.now()): CostEntry => ({
  id: `e${now}${Math.random().toString(36).slice(2, 5)}`, kind: 'study-cost', date: new Date(now).toISOString().slice(0, 10), amount: 0, currency: 'CHF', category: 'Other', note: '', ...p,
});

/** St. Gallen: HS (autumn) = Sep–Feb, FS (spring) = Mar–Aug. Label like "HS 2026/27" or "FS 2027". */
export function semesterOf(date: string): string {
  const [y, m] = date.split('-').map(Number);
  if (m >= 9) return `HS ${y}/${String(y + 1).slice(2)}`;
  if (m <= 2) return `HS ${y - 1}/${String(y).slice(2)}`;
  return `FS ${y}`;
}

const add = (m: Record<string, Record<string, number>>, key: string, cur: string, amount: number) => { (m[key] ??= {})[cur] = Math.round(((m[key][cur] ?? 0) + amount) * 100) / 100; };

/** Totals per month, semester and category – each split by currency (currencies are never mixed). */
export function totals(entries: CostEntry[]) {
  const month: Record<string, Record<string, number>> = {}, semester: Record<string, Record<string, number>> = {}, category: Record<string, Record<string, number>> = {};
  for (const e of entries) {
    add(month, e.date.slice(0, 7), e.currency, e.amount);
    add(semester, semesterOf(e.date), e.currency, e.amount);
    add(category, e.category, e.currency, e.amount);
  }
  return { month, semester, category };
}

export const money = (n: number, cur: string) => `${cur} ${n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
export function entriesCsv(entries: CostEntry[]): string {
  const rows = [...entries].sort((a, b) => a.date.localeCompare(b.date)).map((e) => [e.date, e.amount.toFixed(2), e.currency, q(e.category), q(e.note), q(e.receipt ?? ''), semesterOf(e.date)].join(','));
  return ['date,amount,currency,category,note,receipt,semester', ...rows].join('\n') + '\n';
}
