/**
 * Focus log: time tracking for lectures and self-study (the former "Focus Log" app).
 * Stored on this device (kv "focus:sessions", running timer in "focus:active").
 * Session records use the same fields as Focus Log's sessions.json, so that file imports as is.
 */
import { storage } from './db';

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
}

export interface ActiveFocus {
  kind: 'study' | 'lecture';
  subject: string;
  startedAt: number;
  /** Running or paused stretches; the last one has e = null while the clock runs. */
  segs: Array<{ s: number; e: number | null }>;
  pauses: number;
}

export const FOCUS_SUBJECTS = ['Mikro', 'Mathe/Statistik', 'BWL', 'Privatrecht', 'Finanzbuchhaltung', 'Wiss. Schreiben', 'CFA', 'Japanisch', 'Python', 'Bewerbungen'];

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
  return {
    id: `s${a.startedAt}`, kind: a.kind, subject: a.subject, day: localDay(a.startedAt),
    start: new Date(a.startedAt).toISOString(), end: new Date(now).toISOString(),
    effectiveSec: eff, elapsedSec: Math.max(eff, Math.round((now - a.startedAt) / 1000)), pauses: a.pauses, manual: false,
  };
}

export function manualSession(kind: FocusSession['kind'], subject: string, minutes: number, now: number): FocusSession {
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

export const loadSessions = async () => (await storage.get<FocusSession[]>('focus:sessions')) ?? [];
export const saveSessions = (list: FocusSession[]) => storage.set('focus:sessions', list);
export const loadActive = async () => (await storage.get<ActiveFocus | null>('focus:active')) ?? null;
export const saveActive = (a: ActiveFocus | null) => storage.set('focus:active', a);
