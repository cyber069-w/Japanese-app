/** Evening shutdown: which day a shutdown belongs to, streak, nudges and the Markdown note. Pure functions. */
import { dayKey } from '../lib/date';

export interface ShutdownEntry { at: number; quick: boolean; top3: string[] }
export type ShutdownLog = Record<string, ShutdownEntry>;

const HOUR = 3_600_000;
/** A shutdown at 01:00 still belongs to the evening before: days turn over at 05:00. */
export const shutdownDay = (now: number) => dayKey(now - 5 * HOUR);
const addDay = (key: string, n: number) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };

/** Consecutive shutdown days ending today – or yesterday, as long as today's isn't due yet. */
export function shutdownStreak(log: ShutdownLog, now: number): number {
  let day = shutdownDay(now);
  if (!log[day]) day = addDay(day, -1);
  let n = 0;
  while (log[day]) { n++; day = addDay(day, -1); }
  return n;
}

export type Nudge = 'due' | 'late' | 'missed' | null;

/** `times`: weekday ("0"–"6") → HH:MM. late = after 00:30 (and before 05:00), missed = this morning for yesterday. */
export function shutdownNudge(now: number, times: Record<string, string>, log: ShutdownLog, dismissedFor?: string): Nudge {
  const d = new Date(now);
  const mins = d.getHours() * 60 + d.getMinutes();
  const today = shutdownDay(now);
  if (!log[today]) {
    const wd = new Date(now - 5 * HOUR).getDay();
    const [h, m] = (times[String(wd)] ?? '22:30').split(':').map(Number);
    const after = mins < 5 * 60 || mins >= h * 60 + m;
    if (mins >= 30 && mins < 5 * 60) return 'late';
    if (after) return 'due';
  }
  const yesterday = addDay(today, -1);
  if (mins >= 5 * 60 && mins < 14 * 60 && Object.keys(log).length > 0 && !log[yesterday] && dismissedFor !== today) return 'missed';
  return null;
}

export interface NoteInput {
  date: string;
  focus: Array<{ subject: string; hours: number }>;
  cards: number;
  todosDone: number;
  todosOpen: number;
  top3: string[];
}

export function shutdownMarkdown(n: NoteInput): string {
  const h = (x: number) => `${(Math.round(x * 10) / 10).toFixed(1)} h`;
  return [
    `# Shutdown ${n.date}`,
    '',
    '## Today',
    ...(n.focus.length ? n.focus.map((f) => `- ${f.subject}: ${h(f.hours)}`) : ['- Focus: –']),
    `- Cards reviewed: ${n.cards}`,
    `- To-dos: ${n.todosDone} done, ${n.todosOpen} open`,
    '',
    "## Tomorrow's top 3",
    ...[0, 1, 2].map((i) => `${i + 1}. ${n.top3[i] ?? ''}`),
    '',
    '## What went well',
    '',
    '',
    "## What didn't",
    '',
    '',
    '## One thing to change',
    '',
    '',
  ].join('\n');
}

export function iaWriterUrl(path: string, text: string): string {
  return `ia-writer://new?path=${encodeURIComponent(path)}&text=${encodeURIComponent(text)}`;
}
export const shutdownPath = (folder: string, date: string, onePerDay: boolean) => `/${folder.trim().replace(/^\/+|\/+$/g, '').trim() || 'Shutdown'}/${onePerDay ? date : 'Shutdown'}.md`;
