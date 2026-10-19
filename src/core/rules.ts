/** Measuring the "What to do next" rules: every suggestion ends as acted, dismissed or ignored. Pure helpers. */
export type Outcome = 'shown' | 'acted' | 'dismissed' | 'ignored';
export interface RuleEntry { kind: string; first: number; outcome: Outcome; at: number }
export type RuleLog = Record<string, RuleEntry>;
export const MAX_LOG = 600;

const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
/** The same suggestion on another day counts again (cards are "due" every day). */
export const entryKey = (id: string, now: number) => `${dayKey(now)}|${id}`;

export function registerShown(log: RuleLog, items: Array<{ id: string; kind: string }>, now: number): RuleLog {
  let out = log;
  for (const i of items) {
    const k = entryKey(i.id, now);
    if (!out[k]) out = { ...out, [k]: { kind: i.kind, first: now, outcome: 'shown', at: now } };
  }
  return out;
}

export const markOutcome = (log: RuleLog, id: string, outcome: Outcome, now: number): RuleLog => {
  const k = entryKey(id, now);
  const e = log[k];
  return e ? { ...log, [k]: { ...e, outcome, at: now } } : log;
};

/** Suggestions that were shown but are gone from today's list (or older than a day) and had no reaction → ignored. */
export function settleIgnored(log: RuleLog, currentKeys: string[], now: number): RuleLog {
  const cur = new Set(currentKeys);
  let out = log;
  for (const [k, e] of Object.entries(log)) if (e.outcome === 'shown' && (!cur.has(k) || now - e.first > 86_400_000) && now - e.first > 60_000) out = { ...out, [k]: { ...e, outcome: 'ignored', at: now } };
  return out;
}

export const trim = (log: RuleLog): RuleLog => {
  const keys = Object.keys(log);
  if (keys.length <= MAX_LOG) return log;
  return Object.fromEntries(keys.sort((a, b) => log[b].first - log[a].first).slice(0, MAX_LOG).map((k) => [k, log[k]]));
};

export interface RuleStat { kind: string; total: number; acted: number; dismissed: number; ignored: number; open: number; dismissRate: number | null }
export function ruleStats(log: RuleLog): RuleStat[] {
  const by: Record<string, RuleStat> = {};
  for (const e of Object.values(log)) {
    const s = (by[e.kind] ??= { kind: e.kind, total: 0, acted: 0, dismissed: 0, ignored: 0, open: 0, dismissRate: null });
    s.total++;
    if (e.outcome === 'acted') s.acted++; else if (e.outcome === 'dismissed') s.dismissed++; else if (e.outcome === 'ignored') s.ignored++; else s.open++;
  }
  return Object.values(by).map((s) => ({ ...s, dismissRate: s.total - s.open > 0 ? s.dismissed / (s.total - s.open) : null })).sort((a, b) => b.total - a.total);
}

/** ECTS → hours per week: about 27.5 h per credit over a 14-week semester, rounded to 0.5 h. */
export const ectsHoursPerWeek = (ects: number, weeks = 14) => Math.round(((ects * 27.5) / weeks) * 2) / 2;
