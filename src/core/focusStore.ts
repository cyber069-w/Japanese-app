/**
 * Shared focus state (sessions, running timer, subjects, reminder settings). One module-level store,
 * so the Focus page, the widget tab and the mini window all show the same timer. Every change is
 * saved at once (IndexedDB) and announced to other tabs with a BroadcastChannel.
 *
 * Reliability: the timer is a list of timestamps, so it survives reloads, restarts and sleep.
 * One tab (Web Locks) runs a ticker that notices sleep, asks "still on it?" and reminds you
 * when no timer runs – only while the app is open somewhere (a web app can't wake itself).
 */
import { useSyncExternalStore } from 'react';
import { storage } from './db';
import {
  FOCUS_SUBJECTS, cutOut, finishFocus, isRunning, manualSession, mergeSessions, pauseFocus, resumeFocus, sessionIntervals, startFocus, stopAt,
  type ActiveFocus, type FocusPrompt, type FocusSession,
} from './focus';

export interface FocusPrefs {
  /** Remind me when no timer runs during the day window. */
  remind: boolean;
  remindMin: number;
  /** Ask "still on it?" every … minutes while a timer runs (0 = never). */
  checkMin: number;
  /** The part of the day you want to account for, HH:MM. */
  dayStart: string;
  dayEnd: string;
}

export const DEFAULT_PREFS: FocusPrefs = { remind: true, remindMin: 30, checkMin: 50, dayStart: '08:00', dayEnd: '22:00' };

export interface FocusState {
  ready: boolean;
  sessions: FocusSession[];
  active: ActiveFocus | null;
  subjects: string[];
  prefs: FocusPrefs;
  /** Subject chosen for the next session (this window only). */
  selected: string;
  kind: 'study' | 'lecture';
  /** "No timer running" reminder is showing. */
  nudge: boolean;
}

let state: FocusState = { ready: false, sessions: [], active: null, subjects: FOCUS_SUBJECTS, prefs: DEFAULT_PREFS, selected: '', kind: 'study', nudge: false };
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
  const [sessions, active, subjects, prefs] = await Promise.all([
    storage.get<FocusSession[]>('focus:sessions'),
    storage.get<ActiveFocus | null>('focus:active'),
    storage.get<string[]>('focus:subjects'),
    storage.get<Partial<FocusPrefs>>('focus:prefs'),
  ]);
  set({ ready: true, sessions: sessions ?? [], active: active ?? null, subjects: subjects ?? FOCUS_SUBJECTS, prefs: { ...DEFAULT_PREFS, ...prefs } });
}

let started = false;
export function initFocus() {
  if (started) return;
  started = true;
  void load();
  channel?.addEventListener('message', () => void load());
  startTicker();
}

async function persist(patch: Partial<Pick<FocusState, 'sessions' | 'active' | 'subjects' | 'prefs'>>) {
  set(patch);
  if ('sessions' in patch) await storage.set('focus:sessions', patch.sessions);
  if ('active' in patch) await storage.set('focus:active', patch.active ?? null);
  if ('subjects' in patch) await storage.set('focus:subjects', patch.subjects);
  if ('prefs' in patch) await storage.set('focus:prefs', patch.prefs);
  channel?.postMessage('changed');
}

const withSubject = (list: string[], s: string) => (s && !list.includes(s) ? [...list, s] : list);
const nextCheck = (now: number) => (state.prefs.checkMin > 0 ? now + state.prefs.checkMin * 60_000 : undefined);

export const selectSubject = (selected: string) => set({ selected });
export const selectKind = (kind: 'study' | 'lecture') => set({ kind });
export const setPrefs = (p: Partial<FocusPrefs>) => void persist({ prefs: { ...state.prefs, ...p } });
export const dismissNudge = () => {
  lastNudge = Date.now();
  set({ nudge: false });
};

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

/** Start a new timer (finishing a running one first, so switching subjects keeps both entries). */
export function startTimer(subject: string, kind: 'study' | 'lecture' = state.kind, now = Date.now()) {
  const sessions = state.active ? saveIfLong(finishFocus(state.active, now)) : state.sessions;
  set({ selected: subject, kind, nudge: false });
  void persist({ sessions, active: { ...startFocus(kind, subject, now), checkAt: nextCheck(now) }, subjects: withSubject(state.subjects, subject) });
}
export const startLecture = (subject: string) => !state.active && startTimer(subject, 'lecture');

export function pauseOrResume(now = Date.now()) {
  const a = state.active;
  if (!a) return;
  void persist({ active: isRunning(a) ? { ...pauseFocus(a, now), prompt: null } : { ...resumeFocus(a, now), checkAt: nextCheck(now), prompt: null } });
}

function saveIfLong(s: FocusSession): FocusSession[] {
  return s.effectiveSec >= 10 ? [...state.sessions, s] : state.sessions;
}

/** Stops and saves the timer; returns the saved session (null if it was shorter than 10 s). */
export function finishTimer(now = Date.now()): FocusSession | null {
  if (!state.active) return null;
  const s = finishFocus(state.active, now);
  lastActivity = now;
  void persist({ active: null, sessions: saveIfLong(s) });
  return s.effectiveSec >= 10 ? s : null;
}

/** Answers to the questions the ticker asks while a timer runs. */
export function answerPrompt(answer: 'count' | 'drop' | 'stop', now = Date.now()) {
  const a = state.active;
  const p = a?.prompt;
  if (!a || !p) return;
  if (answer === 'stop') {
    const s = finishFocus(stopAt(a, p.from), p.from);
    void persist({ active: null, sessions: saveIfLong(s) });
    return;
  }
  let next: ActiveFocus = { ...a, prompt: null, checkAt: nextCheck(now) };
  if (p.reason === 'away' && answer === 'drop') next = cutOut(next, p.from, p.to ?? now);
  if (p.reason === 'idle') next = answer === 'count' ? { ...next, segs: [...next.segs.slice(0, -1), { ...next.segs[next.segs.length - 1], e: null }] } : resumeFocus(next, now);
  void persist({ active: next });
}

export function addManual(kind: FocusSession['kind'], subject: string, minutes: number, endMs: number) {
  const s = manualSession(kind, subject, minutes, endMs);
  void persist({ sessions: [...state.sessions, s], subjects: withSubject(state.subjects, subject) });
}
/** Adds a session or replaces the one with the same id. */
export function saveSession(s: FocusSession) {
  const exists = state.sessions.some((x) => x.id === s.id);
  const sessions = exists ? state.sessions.map((x) => (x.id === s.id ? s : x)) : [...state.sessions, s];
  void persist({ sessions: sessions.sort((a, b) => a.start.localeCompare(b.start)), subjects: withSubject(state.subjects, s.subject) });
}
/** Deletes a session and returns it, so it can be restored (undo). */
export function deleteSession(id: string): FocusSession | undefined {
  const s = state.sessions.find((x) => x.id === id);
  void persist({ sessions: state.sessions.filter((x) => x.id !== id) });
  return s;
}
export function importSessions(json: string): number {
  const { merged, added } = mergeSessions(state.sessions, json);
  const subjects = merged.reduce((l, s) => withSubject(l, s.subject), state.subjects);
  void persist({ sessions: merged, subjects });
  return added;
}

// ---------------------------------------------------------------------------
// Ticker: sleep detection, check-ins, "no timer running" reminders
// ---------------------------------------------------------------------------

const MIN = 60_000;
let lastTick = Date.now();
let lastActivity = Date.now();
let lastNudge = 0;

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
/** Today's day window in ms. */
export function dayWindow(now = Date.now()): [number, number] {
  const d = new Date(now);
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return [base + minutesOf(state.prefs.dayStart) * MIN, base + minutesOf(state.prefs.dayEnd) * MIN];
}

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, tag: 'focus', icon: 'icons/study-192.png' });
  n.onclick = () => {
    window.focus();
    location.hash = '#/focus';
    n.close();
  };
}

export async function enableNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission === 'default' ? Notification.requestPermission() : Notification.permission;
}

function tick() {
  const now = Date.now();
  const gap = now - lastTick;
  lastTick = now;
  if (!state.ready) return;
  const a = state.active;
  if (a && isRunning(a)) {
    lastActivity = now;
    if (!a.prompt && gap > 5 * MIN) {
      void persist({ active: { ...a, prompt: { reason: 'away', from: now - gap, to: now } } });
      notify('Were you away?', `The computer was asleep while “${a.subject}” was running – should that time count?`);
    } else if (!a.prompt && a.checkAt && now >= a.checkAt) {
      void persist({ active: { ...a, prompt: { reason: 'check', from: now } } });
      notify(`Still on ${a.subject}?`, 'Tap to confirm – otherwise the timer pauses in 5 minutes.');
    } else if (a.prompt?.reason === 'check' && now - a.prompt.from > 5 * MIN) {
      // no answer: stop counting from the moment we asked
      const prompt: FocusPrompt = { reason: 'idle', from: a.prompt.from };
      void persist({ active: { ...stopAt(a, a.prompt.from), pauses: a.pauses + 1, prompt } });
    }
    return;
  }
  if (a) {
    lastActivity = now;
    return;
  }
  const last = Math.max(lastActivity, ...state.sessions.slice(-3).map((s) => Math.max(...sessionIntervals(s).map(([, e]) => e))));
  const [from, to] = dayWindow(now);
  const due = state.prefs.remind && now >= from && now <= to && now - last >= state.prefs.remindMin * MIN && now - lastNudge >= state.prefs.remindMin * MIN;
  if (due) {
    lastNudge = now;
    set({ nudge: true });
    notify('No timer running', 'What are you working on? Start a timer or log the time you missed.');
  }
}

function startTicker() {
  const run = () => {
    lastTick = Date.now();
    setInterval(tick, 20_000);
  };
  // only one tab ticks, so reminders aren't sent twice
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (locks) void locks.request('nihongo-focus-ticker', () => new Promise<void>(() => run()));
  else run();
}
