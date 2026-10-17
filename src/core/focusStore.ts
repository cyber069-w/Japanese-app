/**
 * Shared focus state (sessions, running timer, subject list). One module-level store, so the Focus page,
 * the widget tab and the picture-in-picture window all show the same timer; changes are persisted and
 * announced to other tabs with a BroadcastChannel.
 */
import { useSyncExternalStore } from 'react';
import { storage } from './db';
import {
  FOCUS_SUBJECTS, finishFocus, isRunning, manualSession, mergeSessions, pauseFocus, resumeFocus, startFocus, type ActiveFocus, type FocusSession,
} from './focus';

export interface FocusState {
  ready: boolean;
  sessions: FocusSession[];
  active: ActiveFocus | null;
  subjects: string[];
  /** Subject chosen for the next session (this window only). */
  selected: string;
  kind: 'study' | 'lecture';
}

let state: FocusState = { ready: false, sessions: [], active: null, subjects: FOCUS_SUBJECTS, selected: '', kind: 'study' };
const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nihongo-focus') : null;

function set(patch: Partial<FocusState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useFocus = () => useSyncExternalStore(subscribe, () => state, () => state);
export const getFocus = () => state;

async function load() {
  const [sessions, active, subjects] = await Promise.all([
    storage.get<FocusSession[]>('focus:sessions'),
    storage.get<ActiveFocus | null>('focus:active'),
    storage.get<string[]>('focus:subjects'),
  ]);
  set({ ready: true, sessions: sessions ?? [], active: active ?? null, subjects: subjects ?? FOCUS_SUBJECTS });
}
let started = false;
export function initFocus() {
  if (started) return;
  started = true;
  void load();
  channel?.addEventListener('message', () => void load());
}

async function persist(patch: Partial<Pick<FocusState, 'sessions' | 'active' | 'subjects'>>) {
  set(patch);
  if ('sessions' in patch) await storage.set('focus:sessions', patch.sessions);
  if ('active' in patch) await storage.set('focus:active', patch.active ?? null);
  if ('subjects' in patch) await storage.set('focus:subjects', patch.subjects);
  channel?.postMessage('changed');
}

const withSubject = (list: string[], s: string) => (s && !list.includes(s) ? [...list, s] : list);

export const selectSubject = (selected: string) => set({ selected });
export const selectKind = (kind: 'study' | 'lecture') => set({ kind });

export function addSubject(name: string) {
  const s = name.trim().slice(0, 40);
  if (!s) return;
  void persist({ subjects: withSubject(state.subjects, s) });
  set({ selected: s });
}
export function removeSubject(name: string) {
  void persist({ subjects: state.subjects.filter((x) => x !== name) });
  if (state.selected === name) set({ selected: '' });
}

/** Start, pause or resume the timer. Returns false if no subject is chosen yet. */
export function toggleTimer(now = Date.now()): boolean {
  const a = state.active;
  if (!a) {
    if (!state.selected) return false;
    void persist({ active: startFocus(state.kind, state.selected, now) });
  } else void persist({ active: isRunning(a) ? pauseFocus(a, now) : resumeFocus(a, now) });
  return true;
}
export function startLecture(subject: string, now = Date.now()) {
  if (state.active) return;
  void persist({ active: startFocus('lecture', subject, now), subjects: withSubject(state.subjects, subject) });
}
/** Stops and saves the timer; returns the saved session (null if it was shorter than 10 s). */
export function finishTimer(now = Date.now()): FocusSession | null {
  if (!state.active) return null;
  const s = finishFocus(state.active, now);
  void persist(s.effectiveSec >= 10 ? { active: null, sessions: [...state.sessions, s] } : { active: null });
  return s.effectiveSec >= 10 ? s : null;
}
export function addManual(kind: FocusSession['kind'], subject: string, minutes: number, endMs: number) {
  const s = manualSession(kind, subject, minutes, endMs);
  void persist({ sessions: [...state.sessions, s], subjects: withSubject(state.subjects, subject) });
}
export function deleteSession(id: string) {
  void persist({ sessions: state.sessions.filter((s) => s.id !== id) });
}
export function importSessions(json: string): number {
  const { merged, added } = mergeSessions(state.sessions, json);
  const subjects = merged.reduce((l, s) => withSubject(l, s.subject), state.subjects);
  void persist({ sessions: merged, subjects });
  return added;
}
