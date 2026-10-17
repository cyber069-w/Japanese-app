/**
 * Focus log: time tracking for lectures and self-study (the former "Focus Log" app).
 * Stored on this device by focusStore.ts (kv "focus:sessions", "focus:active", "focus:subjects").
 * Session records use the same fields as Focus Log's sessions.json, so that file imports as is.
 */
export interface FocusSession {
  id: string;
  kind: 'study' | 'lecture';
  subject: string;
  /** Local day, YYYY-MM-DD. */
  day: string;
  start: string;
  end: string;
  effectiveSec: number;
  elapsedSec: number;
  pauses: number;
  manual: boolean;
  /** Worked stretches [start, end] in ms (newer sessions) – used for the day timeline. */
  segs?: Array<[number, number]>;
  /** Last change (ms) – the newer edit wins when devices sync. */
  at?: number;
}

/** A question to you while the timer runs: computer was asleep, regular check-in, or no answer to a check-in. */
export interface FocusPrompt { reason: 'away' | 'check' | 'idle'; from: number; to?: number }

export interface ActiveFocus {
  kind: 'study' | 'lecture';
  subject: string;
  startedAt: number;
  /** Running or paused stretches; the last one has e = null while the clock runs. */
  segs: Array<{ s: number; e: number | null }>;
  pauses: number;
  /** When to ask “still working on it?” next. */
  checkAt?: number;
  prompt?: FocusPrompt | null;
}

export const FOCUS_SUBJECTS = ['Mikro', 'Mathe/Statistik', 'BWL', 'Privatrecht', 'Finanzbuchhaltung', 'Wiss. Schreiben', 'Politikwissenschaft', 'CFA', 'Japanisch', 'Python', 'Bewerbungen'];

const localDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const isRunning = (a: ActiveFocus) => a.segs[a.segs.length - 1]?.e === null;

export function effectiveMs(a: ActiveFocus, now: number): number {
  return a.segs.reduce((sum, g) => sum + ((g.e ?? now) - g.s), 0);
}

export function startFocus(kind: ActiveFocus['kind'], subject: string, now: number): ActiveFocus {
  return { kind, subject, startedAt: now, segs: [{ s: now, e: null }], pauses: 0 };
}

export function pauseFocus(a: ActiveFocus, now: number): ActiveFocus {
  if (!isRunning(a)) return a;
  const segs = a.segs.map((g, i) => (i === a.segs.length - 1 ? { ...g, e: now } : g));
  return { ...a, segs, pauses: a.pauses + 1 };
}

export const resumeFocus = (a: ActiveFocus, now: number): ActiveFocus => (isRunning(a) ? a : { ...a, segs: [...a.segs, { s: now, e: null }] });

export function finishFocus(a: ActiveFocus, now: number): FocusSession {
  const eff = Math.round(effectiveMs(a, now) / 1000);
  const last = Math.max(a.startedAt, ...a.segs.map((g) => g.e ?? now));
  return {
    id: `s${a.startedAt}`, kind: a.kind, subject: a.subject, day: localDay(a.startedAt),
    start: new Date(a.startedAt).toISOString(), end: new Date(Math.min(now, last)).toISOString(),
    effectiveSec: eff, elapsedSec: Math.max(eff, Math.round((Math.min(now, last) - a.startedAt) / 1000)), pauses: a.pauses, manual: false,
    segs: a.segs.map((g) => [g.s, g.e ?? now] as [number, number]).filter(([x, y]) => y > x),
  };
}

/** Takes [from, to] out of the running timer (time that shouldn't count), keeping it running after `to`. */
export function cutOut(a: ActiveFocus, from: number, to: number): ActiveFocus {
  const kept = a.segs.flatMap((g) => {
    const e = g.e ?? Infinity;
    if (e <= from || g.s >= to) return [g];
    const parts: ActiveFocus['segs'] = [];
    if (g.s < from) parts.push({ s: g.s, e: from });
    if (e > to) parts.push({ s: to, e: g.e });
    return parts;
  });
  return { ...a, segs: kept.length ? kept : [{ s: to, e: null }], pauses: a.pauses + 1 };
}

/** Stops the timer at `at` (e.g. when you stopped working without pressing stop). */
export function stopAt(a: ActiveFocus, at: number): ActiveFocus {
  const segs = a.segs.filter((g) => g.s < at).map((g) => ({ ...g, e: g.e === null || g.e > at ? at : g.e }));
  return { ...a, segs: segs.length ? segs : [{ s: at, e: at }] };
}

/** A session from start and end times (the add / edit dialog). */
export function sessionFromTimes(kind: FocusSession['kind'], subject: string, startMs: number, endMs: number, id = `m${startMs}`): FocusSession {
  const sec = Math.max(0, Math.round((endMs - startMs) / 1000));
  return {
    id, kind, subject, day: localDay(startMs), start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString(),
    effectiveSec: sec, elapsedSec: sec, pauses: 0, manual: true, segs: [[startMs, endMs]],
  };
}

/** Worked intervals of a session. Old records without stretches never overstate: start + effective time. */
export function sessionIntervals(s: FocusSession): Array<[number, number]> {
  if (s.segs?.length) return s.segs;
  const start = Date.parse(s.start);
  return [[start, start + s.effectiveSec * 1000]];
}

export function mergeIntervals(list: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const [a, b] of [...list].filter(([x, y]) => y > x).sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** Share of [from, to] that is covered, 0…1. */
export function coverage(intervals: Array<[number, number]>, from: number, to: number): number {
  if (to <= from) return 0;
  const covered = mergeIntervals(intervals).reduce((n, [a, b]) => n + Math.max(0, Math.min(b, to) - Math.max(a, from)), 0);
  return covered / (to - from);
}

/** Uncovered stretches of [from, to] that are at least `minMs` long. */
export function gaps(intervals: Array<[number, number]>, from: number, to: number, minMs = 10 * 60_000): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let cur = from;
  for (const [a, b] of mergeIntervals(intervals)) {
    if (b <= from) continue;
    if (a >= to) break;
    if (a - cur >= minMs) out.push([cur, Math.min(a, to)]);
    cur = Math.max(cur, b);
  }
  if (to - cur >= minMs) out.push([cur, to]);
  return out;
}

/** Sessions that overlap [start, end] (to warn before saving). */
export const overlapping = (sessions: FocusSession[], start: number, end: number, exceptId?: string) =>
  sessions.filter((s) => s.id !== exceptId && sessionIntervals(s).some(([a, b]) => a < end && b > start));

export function manualSession(kind: FocusSession['kind'], subject: string, minutes: number, now: number): FocusSession {
  // `now` = when the work ended; the session is placed before it
  const sec = Math.round(minutes * 60);
  return {
    id: `m${now}`, kind, subject, day: localDay(now), start: new Date(now - sec * 1000).toISOString(), end: new Date(now).toISOString(),
    effectiveSec: sec, elapsedSec: sec, pauses: 0, manual: true,
  };
}

/** Adds sessions from a Focus Log sessions.json (object keyed by id, or an array). Existing ids are kept. */
export function mergeSessions(existing: FocusSession[], jsonText: string): { merged: FocusSession[]; added: number } {
  const raw = JSON.parse(jsonText) as unknown;
  const list = (Array.isArray(raw) ? raw : Object.values((raw ?? {}) as object)) as Partial<FocusSession>[];
  const ids = new Set(existing.map((s) => s.id));
  const fresh = list.filter(
    (s): s is FocusSession => !!s && typeof s.id === 'string' && typeof s.subject === 'string' && typeof s.day === 'string' && typeof s.effectiveSec === 'number' && !ids.has(s.id),
  ).map((s) => ({ ...s, kind: s.kind === 'lecture' ? 'lecture' : 'study', elapsedSec: s.elapsedSec ?? s.effectiveSec, pauses: s.pauses ?? 0, manual: !!s.manual }) as FocusSession);
  return { merged: [...existing, ...fresh].sort((a, b) => a.start.localeCompare(b.start)), added: fresh.length };
}
