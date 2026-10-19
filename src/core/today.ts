/**
 * Today hub: fixed rules (no AI) that turn Canvas, timetable, Focus log and due cards into one ranked list
 * and a timeline for the rest of the day. Pure functions – the screen only collects the inputs.
 */
import type { CanvasAnnouncement, CanvasDeadline, CanvasFile } from './canvas';
import type { Occurrence } from './calendar';
import { FOCUS_SUBJECTS } from './focus';

export type Horizon = 'overdue' | 'soon' | 'today' | 'tomorrow' | 'week' | 'later';
export const HORIZONS: Horizon[] = ['overdue', 'soon', 'today', 'tomorrow', 'week', 'later'];
export const HORIZON_LABEL: Record<Horizon, string> = {
  overdue: 'Overdue', soon: 'Next 2 hours', today: 'Today', tomorrow: 'Tomorrow', week: 'This week', later: 'When you can',
};
const BOOST: Record<Horizon, number> = { overdue: 40, soon: 35, today: 25, tomorrow: 12, week: 5, later: 0 };

export type TodayKind = 'application' | 'deadline' | 'suggestion' | 'announcement' | 'cards' | 'file' | 'lecture' | 'gap' | 'notes';

export type TodayAction =
  | { type: 'study'; label: string; href: string }
  | { type: 'timer'; label: string; subject: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'focus'; label: string }
  | { type: 'tutor'; label: string; subject: string; topic: string; notes?: boolean };

export interface TodayItem {
  id: string;
  kind: TodayKind;
  subject: string;
  title: string;
  /** Source chips: "Canvas", "Cards" … */
  why: string[];
  due?: number;
  horizon: Horizon;
  score: number;
  action: TodayAction;
}

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Canvas / timetable subject names → the Focus subject list (null = a subject the app has no list entry for). */
const ALIASES: Array<[RegExp, string]> = [
  [/mikro/i, 'Mikro'], [/mathe|statistik/i, 'Mathe/Statistik'], [/betriebswirt|\bbwl\b/i, 'BWL'], [/privatrecht|\brecht\b/i, 'Privatrecht'],
  [/finanzbuch/i, 'Finanzbuchhaltung'], [/\bews\b|wiss.*schreib/i, 'Wiss. Schreiben'], [/politik/i, 'Politikwissenschaft'],
  [/\bcfa\b/i, 'CFA'], [/japan/i, 'Japanisch'], [/python/i, 'Python'], [/bewerb/i, 'Bewerbungen'],
];
export function focusSubject(name: string, known: string[] = FOCUS_SUBJECTS): string {
  const exact = known.find((s) => s.toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  const hit = ALIASES.find(([re]) => re.test(name));
  return hit && known.includes(hit[1]) ? hit[1] : name;
}

/** Course id → Focus subject name (other courses keep their own name). */
export const COURSE_SUBJECT: Record<string, string> = { japanese: 'Japanisch', cfa: 'CFA', bwl: 'BWL', recht: 'Privatrecht' };

export function horizonOf(due: number | undefined, now: number): Horizon {
  if (due === undefined) return 'later';
  if (due < now) return 'overdue';
  if (due - now <= 2 * HOUR) return 'soon';
  const day = (t: number) => new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate()).getTime();
  const diff = Math.round((day(due) - day(now)) / DAY);
  return diff <= 0 ? 'today' : diff === 1 ? 'tomorrow' : diff <= 6 ? 'week' : 'later';
}

export interface TodayInput {
  now: number;
  accepted: CanvasDeadline[];
  suggestions: CanvasDeadline[];
  announcements: CanvasAnnouncement[];
  files: CanvasFile[];
  /** Due cards per subject; examDays = whole days until that subject's exam, if set. */
  cards: Array<{ subject: string; n: number; href: string; examDays?: number }>;
  lectures: Occurrence[];
  gaps: Array<[number, number]>;
  applications?: Array<{ id: string; title: string; company: string; due: number; kind: 'deadline' | 'next' }>;
}

const parseDue = (d: string | null) => (d ? Date.parse(d) : undefined);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function buildItems(inp: TodayInput): TodayItem[] {
  const { now } = inp;
  const items: TodayItem[] = [];
  const add = (i: Omit<TodayItem, 'horizon' | 'score'> & { base: number; horizon?: Horizon; bonus?: number }) => {
    const horizon = i.horizon ?? horizonOf(i.due, now);
    const { base, bonus = 0, horizon: _h, ...rest } = i;
    items.push({ ...rest, horizon, score: base + bonus + BOOST[horizon] });
  };

  for (const d of inp.accepted) {
    const due = parseDue(d.due);
    add({
      id: `dl:${d.id}`, kind: 'deadline', subject: focusSubject(d.subject), title: d.title, why: ['Canvas', 'accepted'], due, base: 45,
      bonus: due !== undefined && due - now < 2 * DAY ? 10 : 0,
      action: d.url ? { type: 'link', label: 'Open in Canvas', url: d.url } : { type: 'timer', label: 'Start timer', subject: focusSubject(d.subject) },
    });
  }
  for (const d of inp.suggestions) {
    const due = parseDue(d.due);
    if (due !== undefined && due < now - 2 * DAY) continue; // an old suggestion you never took is noise
    add({
      id: `dl:${d.id}`, kind: 'suggestion', subject: focusSubject(d.subject), title: d.title, why: ['Canvas', 'new deadline'], due, base: 35,
      action: d.url ? { type: 'link', label: 'Open in Canvas', url: d.url } : { type: 'timer', label: 'Start timer', subject: focusSubject(d.subject) },
    });
  }
  for (const a of inp.applications ?? []) {
    add({
      id: a.id, kind: 'application', subject: 'Applications', title: a.title, why: ['Applications', a.kind === 'deadline' ? 'deadline' : 'next step'], due: a.due, base: a.kind === 'deadline' ? 42 : 38,
      action: { type: 'study', label: 'Open', href: '#/applications' },
    });
  }
  for (const a of inp.announcements) {
    if (Date.parse(a.posted) < now - 7 * DAY) continue; // old news is not today's task
    add({
      id: `an:${a.id}`, kind: 'announcement', subject: focusSubject(a.subject), title: a.title, why: ['Canvas', 'announcement'], horizon: 'today', base: 30,
      action: a.url ? { type: 'link', label: 'Open in Canvas', url: a.url } : { type: 'focus', label: 'Open Focus' },
    });
  }
  for (const c of inp.cards) {
    if (c.n <= 0) continue;
    add({
      id: `cards:${c.subject}`, kind: 'cards', subject: c.subject, title: `${c.n} card${c.n === 1 ? '' : 's'} due`, why: ['Cards', ...(c.examDays !== undefined && c.examDays >= 0 && c.examDays <= 14 ? [`exam in ${c.examDays} d`] : [])],
      horizon: 'today', base: 30, bonus: c.examDays !== undefined && c.examDays >= 0 && c.examDays <= 14 ? 10 : 0,
      action: { type: 'study', label: 'Study now', href: c.href },
    });
  }
  for (const f of inp.files) {
    const name = f.file.replace(/\.[a-z0-9]+$/i, '');
    const isNotes = f.kind === 'notes';
    add({
      id: `file:${f.id}`, kind: isNotes ? 'notes' : 'file', subject: focusSubject(f.subject), title: isNotes ? `New notes: ${name}` : `${name} nacharbeiten`,
      why: ['Canvas', isNotes ? 'notes' : 'new file'], horizon: 'later', base: 28,
      action: { type: 'tutor', label: isNotes ? 'Make flashcards with the tutor' : 'Ask tutor for flashcards', subject: focusSubject(f.subject), topic: name, notes: isNotes },
    });
  }
  for (const l of inp.lectures) {
    if (l.allDay || l.start < now || l.start - now > 2 * HOUR) continue;
    const subject = focusSubject(l.title);
    add({
      id: `lec:${l.uid}:${l.start}`, kind: 'lecture', subject, title: `${l.title}${l.location ? ` · ${l.location}` : ''}`, why: ['Timetable'], due: l.start, base: 30,
      action: { type: 'timer', label: 'Start timer', subject },
    });
  }
  const biggest = [...inp.gaps].sort((a, b) => b[1] - b[0] - (a[1] - a[0])).find(([a, b]) => b - a >= 30 * MIN);
  if (biggest) {
    const mins = Math.round((biggest[1] - biggest[0]) / MIN);
    add({
      id: `gap:${new Date(biggest[0]).toDateString()}`, kind: 'gap', subject: '–', title: `${mins} min of today are not logged yet`, why: ['Focus'], horizon: 'today', base: 20,
      action: { type: 'focus', label: 'Fill gap' },
    });
  }
  return mergeDuplicates(items);
}

/** Same subject + same text (a deadline that is also an announcement) → keep the higher score and join the chips. */
export function mergeDuplicates(items: TodayItem[]): TodayItem[] {
  const byKey = new Map<string, TodayItem>();
  for (const it of items) {
    const key = it.kind === 'cards' || it.kind === 'gap' ? it.id : `${norm(it.subject)}|${norm(it.title).slice(0, 60)}`;
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, it);
    else {
      const [hi, lo] = prev.score >= it.score ? [prev, it] : [it, prev];
      byKey.set(key, { ...hi, why: [...new Set([...hi.why, ...lo.why])] });
    }
  }
  return [...byKey.values()].sort((a, b) => b.score - a.score || (a.due ?? Infinity) - (b.due ?? Infinity));
}

export function groupByHorizon(items: TodayItem[]): Array<{ horizon: Horizon; items: TodayItem[] }> {
  return HORIZONS.map((horizon) => ({ horizon, items: items.filter((i) => i.horizon === horizon) })).filter((g) => g.items.length);
}

/** Dismissed ids are hidden for 7 days. */
export const DISMISS_MS = 7 * DAY;
export const visibleItems = (items: TodayItem[], dismissed: Record<string, number>, now: number) => items.filter((i) => !(dismissed[i.id] > now - DISMISS_MS));
export const pruneDismissed = (dismissed: Record<string, number>, now: number) =>
  Object.fromEntries(Object.entries(dismissed).filter(([, t]) => t > now - DISMISS_MS));

export interface DayBlock { kind: 'lecture' | 'study'; start: number; end: number; title: string; subject?: string; planned?: boolean }

/**
 * Timeline from now to the end of the day window: lectures, then up to 90 min study blocks in free gaps of ≥ 45 min.
 * Block subjects walk down the ranked subjects so one subject doesn't take the whole evening.
 */
export function buildDay(now: number, windowEnd: number, lectures: Occurrence[], logged: Array<[number, number]>, ranked: string[], minGapMin = 45, planned: Array<{ subject: string; start: number; end: number }> = []): DayBlock[] {
  const mine = planned.filter((p) => p.end > now && p.start < windowEnd);
  const busy: Array<[number, number]> = [
    ...lectures.filter((l) => !l.allDay).map((l) => [l.start, l.end] as [number, number]),
    ...logged,
    ...mine.map((p) => [p.start, p.end] as [number, number]),
  ];
  const start = Math.ceil(now / (5 * MIN)) * 5 * MIN;
  const free: Array<[number, number]> = [];
  let cur = start;
  for (const [a, b] of busy.filter(([, b]) => b > start).sort((x, y) => x[0] - y[0])) {
    if (a > cur) free.push([cur, Math.min(a, windowEnd)]);
    cur = Math.max(cur, b);
  }
  if (cur < windowEnd) free.push([cur, windowEnd]);

  const blocks: DayBlock[] = lectures
    .filter((l) => !l.allDay && l.end > now && l.start < windowEnd)
    .map((l) => ({ kind: 'lecture' as const, start: l.start, end: l.end, title: l.title, subject: focusSubject(l.title) }));
  blocks.push(...mine.map((p) => ({ kind: 'study' as const, start: p.start, end: p.end, title: `Study ${p.subject}`, subject: p.subject, planned: true })));
  let i = 0;
  for (const [a, b] of free) {
    if (b - a < minGapMin * MIN || !ranked.length) continue;
    const end = Math.min(b, a + 90 * MIN);
    const subject = ranked[i++ % ranked.length];
    blocks.push({ kind: 'study', start: a, end, title: `Study ${subject}`, subject });
  }
  return blocks.sort((x, y) => x.start - y.start);
}

export interface SourceStatus { name: string; read: number; act: number; state: 'ok' | 'stale' | 'failed'; note?: string }

export function canvasStatus(inboxAt: string | undefined, read: number, act: number, now: number): SourceStatus {
  if (!inboxAt) return { name: 'Canvas', read: 0, act: 0, state: 'failed', note: 'Not available here – the inbox comes from the Mac job' };
  const age = now - new Date(inboxAt).getTime();
  return age > 36 * HOUR
    ? { name: 'Canvas', read, act, state: 'stale', note: "Canvas sync didn't run – is the Mac on?" }
    : { name: 'Canvas', read, act, state: 'ok' };
}
