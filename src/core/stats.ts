/** Derived statistics for Home and Stats screens. */
import type { DayLog } from './db';
import { parseCardId } from './types';
import type { CardState } from './srs';
import { addDays, dayKey } from '../lib/date';

/** Consecutive days with at least one answer. Today counts once you study; until then yesterday keeps the streak alive. */
export function streak(days: Record<string, DayLog>, now = Date.now()): number {
  let key = dayKey(now);
  if (!days[key]?.reviews) key = addDays(key, -1);
  let n = 0;
  while (days[key]?.reviews) {
    n++;
    key = addDays(key, -1);
  }
  return n;
}

export function bestStreak(days: Record<string, DayLog>): number {
  const keys = Object.keys(days).filter((k) => days[k].reviews > 0).sort();
  let best = 0, run = 0, prev = '';
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export function totals(days: Record<string, DayLog>) {
  let reviews = 0, correct = 0, ms = 0;
  for (const d of Object.values(days)) { reviews += d.reviews; correct += d.correct; ms += d.ms; }
  return { reviews, correct, ms, accuracy: reviews ? correct / reviews : 0 };
}

export function moduleTotals(days: Record<string, DayLog>, moduleId: string) {
  let reviews = 0, correct = 0, ms = 0;
  for (const d of Object.values(days)) {
    const m = d.modules[moduleId];
    if (m) { reviews += m.reviews; correct += m.correct; ms += m.ms; }
  }
  return { reviews, correct, ms, accuracy: reviews ? correct / reviews : 0 };
}

export interface ItemStat { seen: number; correct: number; learned: boolean }

/** Per item accuracy for one module, combined over all its exercises. */
export function itemStats(cards: Record<string, CardState>, moduleId: string): Map<string, ItemStat> {
  const out = new Map<string, ItemStat>();
  for (const c of Object.values(cards)) {
    if (!c.id.startsWith(moduleId + ':')) continue;
    const { itemId } = parseCardId(c.id);
    const s = out.get(itemId) ?? { seen: 0, correct: 0, learned: false };
    s.seen += c.seen;
    s.correct += c.correct;
    s.learned ||= c.step === -1;
    out.set(itemId, s);
  }
  return out;
}

/** Last n days for the activity chart (oldest first). */
export function lastDays(days: Record<string, DayLog>, n: number, now = Date.now()) {
  const today = dayKey(now);
  return Array.from({ length: n }, (_, i) => {
    const key = addDays(today, i - n + 1);
    return { key, reviews: days[key]?.reviews ?? 0, ms: days[key]?.ms ?? 0 };
  });
}

/** Red → green colour for an accuracy in [0, 1]. */
export function heatColor(acc: number): string {
  // oklch hue 25 = red, 70 = orange, 110 = yellow-green, 145 = green
  const hue = 25 + Math.max(0, Math.min(1, acc)) ** 1.5 * 120;
  return `oklch(0.74 0.13 ${hue.toFixed(0)})`;
}
