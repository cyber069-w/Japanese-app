/** Weekly time targets per subject (hours) and the "block 1 h tomorrow" suggestions. */
import type { FocusSession } from './focus';

export type Targets = Record<string, number>;
export interface PlannedBlock { id: string; subject: string; start: number; end: number }

const DAY = 86_400_000;
const dayStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Monday 00:00 (local) of the week containing `t`, shifted by `offset` weeks. */
export function weekStart(t: number, offset = 0): Date {
  const d = new Date(t);
  const diff = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff + offset * 7);
}
export const weekDays = (start: Date) => Array.from({ length: 7 }, (_, i) => dayStr(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));

export function hoursBySubject(sessions: FocusSession[], start: Date): Record<string, number> {
  const days = new Set(weekDays(start));
  const out: Record<string, number> = {};
  for (const s of sessions) if (days.has(s.day)) out[s.subject] = (out[s.subject] ?? 0) + s.effectiveSec / 3600;
  return out;
}

export const roundHalf = (h: number) => Math.round(h * 2) / 2;

/** Average of the last 2 full weeks, rounded to 0.5 h; subjects below 0.25 h/week get no suggestion. */
export function suggestTargets(sessions: FocusSession[], now: number): Targets {
  const a = hoursBySubject(sessions, weekStart(now, -1));
  const b = hoursBySubject(sessions, weekStart(now, -2));
  const out: Targets = {};
  for (const s of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const h = roundHalf(((a[s] ?? 0) + (b[s] ?? 0)) / 2);
    if (h > 0) out[s] = h;
  }
  return out;
}

export interface TargetRow { subject: string; done: number; target: number; missing: number }
export function targetRows(targets: Targets, done: Record<string, number>): TargetRow[] {
  return Object.entries(targets)
    .filter(([, t]) => t > 0)
    .map(([subject, target]) => ({ subject, target, done: done[subject] ?? 0, missing: Math.max(0, target - (done[subject] ?? 0)) }))
    .sort((x, y) => y.missing - x.missing);
}

/** 1 h block tomorrow at the first full hour of the afternoon that fits the day window (else at the window start). */
export function blockTomorrow(subject: string, now: number, dayStartMin: number, dayEndMin: number, hours = 1): PlannedBlock {
  const t = new Date(now);
  const day = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1).getTime();
  const wanted = Math.max(dayStartMin, 16 * 60);
  const startMin = wanted + hours * 60 <= dayEndMin ? wanted : dayStartMin;
  const start = day + startMin * 60_000;
  return { id: `plan-${subject}-${start}`, subject, start, end: start + hours * 3_600_000 };
}

export const upcomingPlanned = (list: PlannedBlock[], now: number) => list.filter((b) => b.end > now - DAY);
