/** Applications pipeline + watchlist. One store; "Researching" entries are the watchlist. Pure helpers. */
import rulesFile from '../data/emailRules.json';

export type Stage = 'researching' | 'applied' | 'online-test' | 'video-interview' | 'interview' | 'assessment' | 'offer' | 'rejected' | 'withdrawn';
export const STAGES: Array<{ id: Stage; label: string }> = [
  { id: 'researching', label: 'Researching' }, { id: 'applied', label: 'Applied' }, { id: 'online-test', label: 'Online test' },
  { id: 'video-interview', label: 'Video interview' }, { id: 'interview', label: 'Interview' }, { id: 'assessment', label: 'Assessment centre' },
  { id: 'offer', label: 'Offer' }, { id: 'rejected', label: 'Rejected' }, { id: 'withdrawn', label: 'Withdrawn' },
];
export const stageLabel = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;
export type AppType = 'internship' | 'insight' | 'scholarship' | 'mentorship' | 'other';
export const TYPES: Array<{ id: AppType; label: string }> = [
  { id: 'internship', label: 'Internship' }, { id: 'insight', label: 'Spring / insight week' }, { id: 'scholarship', label: 'Scholarship' },
  { id: 'mentorship', label: 'Mentorship' }, { id: 'other', label: 'Other' },
];
export interface Contact { name: string; role: string; email: string }
export interface HistoryEntry { stage: Stage; at: number; note?: string }
export interface Application {
  id: string; company: string; role: string; type: AppType; link: string; stage: Stage;
  /** YYYY-MM-DD */ opens: string; deadline: string; rolling: boolean; hirevue: boolean; applied: string;
  nextStep: string; /** YYYY-MM-DD or YYYY-MM-DDTHH:MM */ nextDate: string;
  contacts: Contact[]; notes: string; documents: string[]; history: HistoryEntry[];
}

export const ACTIVE_STAGES: Stage[] = ['applied', 'online-test', 'video-interview', 'interview', 'assessment'];
export const isActive = (a: Application) => a.stage !== 'offer' && a.stage !== 'rejected' && a.stage !== 'withdrawn';

export const blankApplication = (now = Date.now()): Application => ({
  id: `app${now}${Math.random().toString(36).slice(2, 5)}`, company: '', role: '', type: 'internship', link: '', stage: 'researching',
  opens: '', deadline: '', rolling: false, hirevue: false, applied: '', nextStep: '', nextDate: '', contacts: [], notes: '', documents: [], history: [{ stage: 'researching', at: now }],
});

const FLOW: Stage[] = ['researching', 'applied', 'online-test', 'video-interview', 'interview', 'assessment', 'offer'];
/** The next stage in the usual flow (null at the end). */
export const nextStage = (s: Stage): Stage | null => { const i = FLOW.indexOf(s); return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null; };

export function moveStage(a: Application, stage: Stage, now = Date.now(), note?: string): Application {
  if (stage === a.stage && !note) return a;
  return { ...a, stage, applied: stage === 'applied' && !a.applied ? dayOf(now) : a.applied, history: [...a.history, { stage, at: now, ...(note ? { note } : {}) }] };
}
const dayOf = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Local end of a YYYY-MM-DD day, or the exact time for YYYY-MM-DDTHH:MM. */
export const dueMs = (s: string): number | undefined => {
  if (!s) return undefined;
  const t = s.includes('T') ? new Date(s).getTime() : new Date(`${s}T23:59:00`).getTime();
  return Number.isNaN(t) ? undefined : t;
};

export type Watch = 'all' | 'open' | 'soon' | 'closing';
const DAY = 86_400_000;
export function watchFilter(list: Application[], f: Watch, now: number): Application[] {
  const today = new Date(dayOf(now) + 'T00:00:00').getTime();
  return list.filter((a) => {
    const opens = a.opens ? new Date(`${a.opens}T00:00:00`).getTime() : undefined;
    const close = dueMs(a.deadline);
    if (f === 'open') return (opens === undefined || opens <= today) && (a.rolling || close === undefined || close >= now);
    if (f === 'soon') return opens !== undefined && opens > today && opens <= today + 14 * DAY;
    if (f === 'closing') return close !== undefined && close >= now && close <= now + 14 * DAY;
    return true;
  });
}

export interface EmailRule { stage: Stage; keywords: string[] }
export const DEFAULT_RULES: EmailRule[] = rulesFile.rules as EmailRule[];
export const parseRules = (json: string): EmailRule[] => {
  const raw = JSON.parse(json) as { rules?: EmailRule[] } | EmailRule[];
  const list = Array.isArray(raw) ? raw : raw.rules;
  if (!Array.isArray(list) || !list.every((r) => STAGES.some((s) => s.id === r.stage) && Array.isArray(r.keywords))) throw new Error('Rules must be a list of { "stage", "keywords": [...] } with valid stages.');
  return list;
};

export interface EmailSuggestion { stage: Stage | null; keyword?: string; date: string; firstLine: string }
/** Keyword rules, no AI. Date: an email "Date:" header if present, else today. First line: the Subject if present, else the first text line. */
export function suggestFromEmail(text: string, rules: EmailRule[] = DEFAULT_RULES, now = Date.now()): EmailSuggestion {
  const lower = text.toLowerCase();
  let stage: Stage | null = null, keyword: string | undefined;
  for (const r of rules) {
    const k = r.keywords.find((w) => lower.includes(w.toLowerCase()));
    if (k) { stage = r.stage; keyword = k; break; }
  }
  const dm = /^\s*(?:date|datum)\s*:\s*(.+)$/im.exec(text);
  const parsed = dm ? new Date(dm[1]).getTime() : NaN;
  const sm = /^\s*(?:subject|betreff)\s*:\s*(.+)$/im.exec(text);
  const first = sm?.[1] ?? text.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !/^(from|to|cc|date|datum|von|an)\s*:/i.test(l)) ?? '';
  return { stage, keyword, date: dayOf(Number.isNaN(parsed) ? now : parsed), firstLine: first.slice(0, 120) };
}

/** Seed from the user's current applications. Stage and dates are unknown → Researching, details left empty ("–"). */
export function seedApplications(now = Date.now()): Application[] {
  // fixed ids: seeding on a second device must not create duplicates after sync
  const mk = (id: string, company: string, role: string, type: AppType, notes = ''): Application => ({ ...blankApplication(now), id, company, role, type, notes: `${notes}${notes ? ' · ' : ''}Stage and dates not entered yet.`.trim() });
  return [
    mk('seed-nomura', 'Nomura', 'Spring Insight', 'insight'),
    mk('seed-fnf', 'FNF', 'Scholarship', 'scholarship'),
    mk('seed-pevc', 'PEVC Mentorship', 'Mentorship programme', 'mentorship', 'EQT, Permira, Cinven'),
  ];
}

/** Things for Today / To-dos: deadline and next step of applications still in play. */
export function applicationDates(list: Application[], now: number): Array<{ id: string; title: string; company: string; due: number; kind: 'deadline' | 'next' }> {
  const out: Array<{ id: string; title: string; company: string; due: number; kind: 'deadline' | 'next' }> = [];
  for (const a of list.filter(isActive)) {
    const dl = dueMs(a.deadline);
    if (dl !== undefined && dl > now - DAY && a.stage === 'researching') out.push({ id: `app:${a.id}:dl`, title: `Apply: ${a.company} ${a.role}`.trim(), company: a.company, due: dl, kind: 'deadline' });
    const nx = dueMs(a.nextDate);
    if (nx !== undefined && nx > now - DAY) out.push({ id: `app:${a.id}:next`, title: `${a.company}: ${a.nextStep || 'next step'}`, company: a.company, due: nx, kind: 'next' });
  }
  return out;
}
