/** Weekly report: what happened per subject in one week (Monday–Sunday). Pure – the screen collects the inputs. */
import type { FocusSession } from './focus';
import type { DayLog } from './db';
import { hoursBySubject, weekDays, type Targets } from './targets';

export interface ReportRow { subject: string; hours: number; reading: number; target?: number; lectures: number; answers: number; correct: number }
export interface Report {
  weekStart: string;
  weekEnd: string;
  rows: ReportRow[];
  deadlinesDue: number;
  deadlinesOpen: number;
  newFiles: number;
}
export interface ReportInput {
  start: Date;
  sessions: FocusSession[];
  days: Record<string, DayLog>;
  /** module id → subject name (null for modules that belong to no listed subject) */
  subjectOfModule: (moduleId: string) => string | null;
  targets: Targets;
  /** Accepted Canvas deadlines (ISO due or null) and new files with their date (YYYY-MM-DD…). */
  deadlines: Array<{ due: string | null }>;
  files: Array<{ at: string }>;
  now: number;
}

export function buildReport(i: ReportInput): Report {
  const keys = weekDays(i.start);
  const hours = hoursBySubject(i.sessions, i.start);
  const reading: Record<string, number> = {};
  for (const s of i.sessions) if (s.tag === 'reading' && keys.includes(s.day)) reading[s.subject] = (reading[s.subject] ?? 0) + s.effectiveSec / 3600;
  const lectures: Record<string, number> = {};
  for (const s of i.sessions) if (s.kind === 'lecture' && keys.includes(s.day)) lectures[s.subject] = (lectures[s.subject] ?? 0) + 1;
  const answers: Record<string, { n: number; ok: number }> = {};
  for (const k of keys)
    for (const [mod, m] of Object.entries(i.days[k]?.modules ?? {})) {
      const subj = i.subjectOfModule(mod);
      if (!subj) continue;
      const a = (answers[subj] ??= { n: 0, ok: 0 });
      a.n += m.reviews;
      a.ok += m.correct;
    }
  const subjects = new Set([...Object.keys(hours), ...Object.keys(lectures), ...Object.keys(answers), ...Object.keys(i.targets)]);
  const rows = [...subjects]
    .map((subject) => ({ subject, hours: hours[subject] ?? 0, reading: reading[subject] ?? 0, target: i.targets[subject], lectures: lectures[subject] ?? 0, answers: answers[subject]?.n ?? 0, correct: answers[subject]?.ok ?? 0 }))
    .sort((a, b) => b.hours - a.hours || a.subject.localeCompare(b.subject));
  const from = new Date(i.start.getFullYear(), i.start.getMonth(), i.start.getDate()).getTime();
  const to = from + 7 * 86_400_000;
  const due = i.deadlines.filter((d) => d.due && Date.parse(d.due) >= from && Date.parse(d.due) < to);
  return {
    weekStart: keys[0], weekEnd: keys[6], rows,
    deadlinesDue: due.length,
    deadlinesOpen: i.deadlines.filter((d) => !d.due || Date.parse(d.due) >= i.now).length,
    newFiles: i.files.filter((f) => f.at.slice(0, 10) >= keys[0] && f.at.slice(0, 10) <= keys[6]).length,
  };
}

const h1 = (h: number) => `${(Math.round(h * 10) / 10).toFixed(1)} h`;
const acc = (r: ReportRow) => (r.answers ? `${Math.round((r.correct / r.answers) * 100)}%` : '–');

export function reportMarkdown(r: Report): string {
  const total = r.rows.reduce((n, x) => n + x.hours, 0);
  return [
    `# Week ${r.weekStart} – ${r.weekEnd}`,
    '',
    `Focus total: ${h1(total)}`,
    '',
    '| Subject | Focus | Reading | Target | Lectures | Cards answered | Accuracy |',
    '|---|---|---|---|---|---|---|',
    ...r.rows.map((x) => `| ${x.subject} | ${h1(x.hours)} | ${x.reading ? h1(x.reading) : '–'} | ${x.target ? h1(x.target) : '–'} | ${x.lectures} | ${x.answers} | ${acc(x)} |`),
    '',
    `Canvas: ${r.deadlinesDue} deadline${r.deadlinesDue === 1 ? '' : 's'} due this week, ${r.deadlinesOpen} accepted and still open, ${r.newFiles} new file${r.newFiles === 1 ? '' : 's'}.`,
    '',
  ].join('\n');
}
