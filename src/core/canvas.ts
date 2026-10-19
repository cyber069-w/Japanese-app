/**
 * Canvas inbox: deadlines, announcements and newly fetched files from scripts/canvas/canvas_sync.py
 * (served as /canvas-inbox.json by the local dev server). What you accept, ignore, mute or have seen
 * is stored on this device.
 */
import { useSyncExternalStore } from 'react';
import { storage } from './db';
import { readSyncedFile, syncConfigured } from './sync';
import { logHistory } from './history';

export interface CanvasDeadline { id: string; course: string; subject: string; title: string; due: string | null; url?: string; kind: string }
export interface CanvasAnnouncement { id: string; course: string; subject: string; title: string; posted: string; text: string; url?: string }
export interface CanvasFile { id: string; subject: string; file: string; to: string; at: string; /** OneNote PDF export found in a Notizen folder */ kind?: 'notes' }
export interface CanvasExam { subject: string; file: string }
/** A file the Mac job thinks is a reading (rules in canvas-config.json) – accept to add it to the reading list. */
export interface CanvasReading { id: string; subject: string; title: string; where: string }
export interface CanvasExamDate { id: string; subject: string; date: string; snippet: string; source?: string }
export interface NewsItem { title: string; link: string; date: string }
export interface NewsSource { source: string; items: NewsItem[]; error?: string }
export interface CanvasInbox { at: string; deadlines: CanvasDeadline[]; announcements: CanvasAnnouncement[]; files: CanvasFile[]; /** file names in <subject>/Prüfungen */ exams?: CanvasExam[]; readings?: CanvasReading[]; news?: NewsSource[]; /** exam dates the Mac job found (accept / ignore) */ examDates?: CanvasExamDate[] }

export interface CanvasPrefs {
  muted: boolean;
  mutedSubjects: string[];
  accepted: string[];
  ignored: string[];
  seen: string[];
}

const DEFAULT: CanvasPrefs = { muted: false, mutedSubjects: [], accepted: [], ignored: [], seen: [] };

/** Announcements worth a look: exams, deadlines, cancellations, room or date changes. Strong words count anywhere, weak ones only in the title. */
const STRONG = /prüfung|pruefung|klausur|abgabefrist|deadline|verschoben|verschiebung|fällt aus|faellt aus|ausfall|entfällt|entfaellt|raumänderung|raumwechsel|zweittermin|nachholtermin/i;
const TITLE_ONLY = /abgabe|test|termin|änderung|aenderung|wichtig|achtung|\braum\b/i;
export const isImportant = (a: CanvasAnnouncement) => STRONG.test(`${a.title} ${a.text}`) || TITLE_ONLY.test(a.title);

/** Where the inbox came from: the dev server (this Mac), the sync repo (phone), or nowhere. */
export type InboxSource = 'dev' | 'sync' | null;
interface State { inbox: CanvasInbox | null; prefs: CanvasPrefs; open: boolean; source: InboxSource; error?: string }
let state: State = { inbox: null, prefs: DEFAULT, open: false, source: null };
const listeners = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};
export const useCanvas = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );

export async function refreshCanvas() {
  const prefs = await storage.get<Partial<CanvasPrefs>>('canvas:prefs');
  let inbox: CanvasInbox | null = null;
  let source: InboxSource = null;
  let error: string | undefined;
  try {
    const res = await fetch('canvas-inbox.json', { cache: 'no-store' });
    if (res.ok) inbox = (await res.json()) as CanvasInbox;
    if (inbox?.at) source = 'dev';
    else inbox = null;
  } catch {
    inbox = null;
  }
  if (!inbox && syncConfigured()) {
    try {
      inbox = await readSyncedFile<CanvasInbox>('canvas-inbox.enc');
      if (inbox?.at) source = 'sync';
      else inbox = null;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  set({ inbox, prefs: { ...DEFAULT, ...prefs }, source, error });
}

let started = false;
export function initCanvas() {
  if (started) return;
  started = true;
  void refreshCanvas();
  setInterval(() => void refreshCanvas(), 30 * 60_000);
  window.addEventListener('focus', () => void refreshCanvas());
}

function setPrefs(p: Partial<CanvasPrefs>) {
  const prefs = { ...state.prefs, ...p };
  set({ prefs });
  void storage.set('canvas:prefs', prefs);
}

export const openInbox = (open = true) => set({ open });
export const toggleMute = () => setPrefs({ muted: !state.prefs.muted });
export const toggleSubject = (s: string) =>
  setPrefs({ mutedSubjects: state.prefs.mutedSubjects.includes(s) ? state.prefs.mutedSubjects.filter((x) => x !== s) : [...state.prefs.mutedSubjects, s] });
export const accept = (id: string) => {
  logHistory('canvas', `Canvas deadline accepted: ${state.inbox?.deadlines.find((d) => d.id === id)?.title.slice(0, 80) ?? id}`);
  setPrefs({ accepted: [...new Set([...state.prefs.accepted, id])], ignored: state.prefs.ignored.filter((x) => x !== id) });
};
export const ignore = (id: string) => setPrefs({ ignored: [...new Set([...state.prefs.ignored, id])], accepted: state.prefs.accepted.filter((x) => x !== id) });
export const markSeen = (ids: string[]) => {
  const fresh = ids.filter((id) => !state.prefs.seen.includes(id));
  if (fresh.length) setPrefs({ seen: [...state.prefs.seen, ...fresh].slice(-500) });
};

const DAY = 86_400_000;
/** Everything the bell shows, already filtered by your mutes. */
export function inboxView(s: State, now = Date.now()) {
  const inbox = s.inbox;
  const p = s.prefs;
  const visible = (subject: string) => !p.mutedSubjects.includes(subject);
  const deadlines = (inbox?.deadlines ?? []).filter((d) => visible(d.subject) && (!d.due || Date.parse(d.due) > now - 7 * DAY));
  const suggestions = deadlines.filter((d) => !p.accepted.includes(d.id) && !p.ignored.includes(d.id));
  const accepted = deadlines.filter((d) => p.accepted.includes(d.id));
  const announcements = (inbox?.announcements ?? []).filter((a) => visible(a.subject));
  const important = announcements.filter(isImportant);
  const files = (inbox?.files ?? []).filter((f) => visible(f.subject) && !(f.kind === 'notes' && p.seen.includes(f.id)));
  const soon = accepted.filter((d) => d.due && Date.parse(d.due) - now < 2 * DAY);
  const unseenImportant = important.filter((a) => !p.seen.includes(a.id));
  // the badge only nags about what matters soon; later deadlines wait in the list
  const nearSuggestions = suggestions.filter((d) => !d.due || Date.parse(d.due) - now < 14 * DAY);
  const badge = p.muted ? 0 : nearSuggestions.length + soon.length + unseenImportant.length;
  const examProposals = (inbox?.examDates ?? []).filter((x) => visible(x.subject) && !p.accepted.includes(x.id) && !p.ignored.includes(x.id) && Date.parse(x.date) > now - DAY);
  return { examProposals, suggestions, accepted, soon, announcements, important, unseenImportant, files, badge, available: !!inbox };
}
