/**
 * Paste-back planning (no API key): the app writes a prompt with your data, you paste it into Claude,
 * and paste Claude's JSON answer back. parsePlan checks it and turns it into planned blocks.
 */
import type { PlannedBlock } from './targets';

export interface PlanInput {
  now: number;
  dayStart: string;
  dayEnd: string;
  lectures: Array<{ title: string; start: number; end: number }>;
  deadlines: Array<{ title: string; subject: string; due?: number }>;
  exams: Array<{ subject: string; date: string }>;
  targets: Array<{ subject: string; target: number; done: number }>;
  dueCards: number;
  todos: string[];
  days?: number;
}

const D = (t: number) => new Date(t);
const pad = (n: number) => String(n).padStart(2, '0');
const dayStr = (t: number) => `${D(t).getFullYear()}-${pad(D(t).getMonth() + 1)}-${pad(D(t).getDate())}`;
const hm = (t: number) => `${pad(D(t).getHours())}:${pad(D(t).getMinutes())}`;
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function planPrompt(i: PlanInput): string {
  const days = i.days ?? 7;
  const lines = [
    'Du bist mein Lernplaner. Plane meine Lernblöcke für die nächsten Tage. Antworte NUR mit einem JSON-Objekt, ohne Text davor oder danach.',
    '',
    `Heute: ${WD[D(i.now).getDay()]} ${dayStr(i.now)}, jetzt ${hm(i.now)}. Lernfenster pro Tag: ${i.dayStart}–${i.dayEnd}. Planungszeitraum: ${days} Tage.`,
    '',
    'Vorlesungen (feste Termine, nicht überplanen):',
    ...(i.lectures.length ? i.lectures.map((l) => `- ${dayStr(l.start)} ${hm(l.start)}–${hm(l.end)} ${l.title}`) : ['- keine bekannt']),
    '',
    'Abgaben / Deadlines:',
    ...(i.deadlines.length ? i.deadlines.map((d) => `- ${d.subject}: ${d.title.slice(0, 90)}${d.due ? ` (fällig ${dayStr(d.due)} ${hm(d.due)})` : ''}`) : ['- keine']),
    '',
    'Prüfungen:',
    ...(i.exams.length ? i.exams.map((e) => `- ${e.subject}: ${e.date}`) : ['- keine eingetragen']),
    '',
    'Wochenziele (Stunden, schon erledigt diese Woche):',
    ...(i.targets.length ? i.targets.map((t) => `- ${t.subject}: Ziel ${t.target} h, erledigt ${Math.round(t.done * 10) / 10} h`) : ['- keine gesetzt']),
    '',
    `Fällige Lernkarten heute: ${i.dueCards}`,
    ...(i.todos.length ? ['', 'Eigene To-dos:', ...i.todos.map((t) => `- ${t}`)] : []),
    '',
    'Regeln: Blöcke 45–120 Minuten, nur innerhalb des Lernfensters, nie während Vorlesungen, mit Pausen dazwischen, Deadlines und Prüfungen zuerst, Wochenziele beachten, höchstens 5 Blöcke pro Tag.',
    'Antwortformat (exakt):',
    '{"blocks":[{"day":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM","subject":"Fach","note":"kurz, was genau"}]}',
  ];
  return lines.join('\n');
}

export interface ParsedPlan { blocks: Array<PlannedBlock & { note?: string }>; problems: string[] }

/** Accepts the JSON with or without code fences / extra text around it. */
export function parsePlan(text: string, now: number, dayStartMin = 0, dayEndMin = 24 * 60): ParsedPlan {
  const problems: string[] = [];
  const m = /\{[\s\S]*\}/.exec(text.replace(/```(?:json)?/gi, ''));
  let raw: unknown;
  try {
    raw = m ? JSON.parse(m[0]) : null;
  } catch {
    raw = null;
  }
  const list = (raw as { blocks?: unknown })?.blocks;
  if (!Array.isArray(list)) return { blocks: [], problems: ['This is not the JSON answer – paste Claude’s whole reply (it must contain "blocks").'] };
  const blocks: ParsedPlan['blocks'] = [];
  list.forEach((b, idx) => {
    const x = b as Record<string, unknown>;
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x.day ?? ''));
    const s = /^(\d{1,2}):(\d{2})$/.exec(String(x.start ?? ''));
    const e = /^(\d{1,2}):(\d{2})$/.exec(String(x.end ?? ''));
    const subject = String(x.subject ?? '').trim();
    if (!day || !s || !e || !subject) return void problems.push(`Block ${idx + 1} skipped: day, start, end or subject missing.`);
    const at = (t: RegExpExecArray) => new Date(+day[1], +day[2] - 1, +day[3], +t[1], +t[2]).getTime();
    const start = at(s), end = at(e);
    const minOf = (t: RegExpExecArray) => +t[1] * 60 + +t[2];
    if (end <= start) return void problems.push(`Block ${idx + 1} (${subject}) skipped: ends before it starts.`);
    if (end - start > 3 * 3_600_000) return void problems.push(`Block ${idx + 1} (${subject}) skipped: longer than 3 hours.`);
    if (end < now) return void problems.push(`Block ${idx + 1} (${subject}) skipped: already in the past.`);
    if (minOf(s) < dayStartMin || minOf(e) > dayEndMin) return void problems.push(`Block ${idx + 1} (${subject}) skipped: outside your day window.`);
    blocks.push({ id: `ai-${start}-${subject}`, subject, start, end, note: x.note ? String(x.note).slice(0, 120) : undefined });
  });
  // overlapping blocks: keep the earlier one
  blocks.sort((a, b) => a.start - b.start);
  const kept: ParsedPlan['blocks'] = [];
  for (const b of blocks) {
    if (kept.length && b.start < kept[kept.length - 1].end) problems.push(`${b.subject} ${hm(b.start)} skipped: overlaps another block.`);
    else kept.push(b);
  }
  return { blocks: kept, problems };
}

/** New plan replaces earlier pasted plans (ids "ai-…") that are still ahead; manual blocks stay. */
export const mergePlanned = (existing: PlannedBlock[], plan: PlannedBlock[], now: number): PlannedBlock[] => [
  ...existing.filter((b) => b.end > now && !b.id.startsWith('ai-')),
  ...plan,
];
