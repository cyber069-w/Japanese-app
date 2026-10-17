/** CFA lesson packs: key terms, formulas and exam-style questions that you import after each lesson. */

export interface CfaTerm { term: string; definition: string }
export interface CfaFormula { name: string; formula: string; note?: string }
export interface CfaQuestion { q: string; options: string[]; answer: number; explain?: string }

export interface CfaLesson {
  id: string;
  /** Topic id from the CFA course (quant, economics, fsa …). */
  topic: string;
  module?: number;
  title: string;
  terms: CfaTerm[];
  formulas: CfaFormula[];
  questions: CfaQuestion[];
}

export const CFA_TOPIC_NAMES: Record<string, string> = {
  quant: 'Quantitative Methods', economics: 'Economics', corporate: 'Corporate Finance', fsa: 'Financial Statement Analysis',
  equities: 'Equities', 'fixed-income': 'Fixed Income', derivatives: 'Derivatives & Risk Management',
  alternatives: 'Alternative Investments', portfolio: 'Portfolio Construction', ethics: 'Ethical & Professional Standards',
};

/** Give this to Claude together with your lesson notes; paste the answer into Import lesson. */
export const LESSON_PROMPT = `Turn the CFA Level 1 lesson I just studied into a study pack. Answer with ONE JSON object only, no other text:
{
  "topic": "quant | economics | corporate | fsa | equities | fixed-income | derivatives | alternatives | portfolio | ethics",
  "module": <learning module number>,
  "title": "<lesson title>",
  "terms": [{ "term": "...", "definition": "short, exam-relevant" }],
  "formulas": [{ "name": "...", "formula": "plain text, e.g. PV = FV / (1 + r)^n", "note": "when to use it" }],
  "questions": [{ "q": "...", "options": ["...", "...", "..."], "answer": 0, "explain": "why it is right" }]
}
Rules: only use what is in the lesson. 8–15 terms, every formula, 8–12 questions with exactly three options (A/B/C, "answer" = index 0–2) in CFA exam style.`;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function toLesson(raw: unknown, i: number, errors: string[]): CfaLesson | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = str(r.title);
  if (!title) {
    errors.push(`Lesson ${i + 1}: missing "title".`);
    return null;
  }
  const topic = str(r.topic).toLowerCase() || 'other';
  const module = typeof r.module === 'number' ? r.module : undefined;
  const terms = (Array.isArray(r.terms) ? r.terms : []).map((t: any) => ({ term: str(t?.term), definition: str(t?.definition) })).filter((t) => t.term && t.definition);
  const formulas = (Array.isArray(r.formulas) ? r.formulas : [])
    .map((f: any) => ({ name: str(f?.name), formula: str(f?.formula), note: str(f?.note) || undefined }))
    .filter((f) => f.name && f.formula);
  const questions: CfaQuestion[] = [];
  (Array.isArray(r.questions) ? r.questions : []).forEach((q: any, n: number) => {
    const options = (Array.isArray(q?.options) ? q.options : []).map(str).filter(Boolean);
    const a = typeof q?.answer === 'string' ? 'abc'.indexOf(q.answer.trim().toLowerCase()) : q?.answer;
    if (!str(q?.q) || options.length < 2 || !Number.isInteger(a) || a < 0 || a >= options.length) {
      errors.push(`${title}: question ${n + 1} skipped (needs "q", at least two options and a valid "answer").`);
      return;
    }
    questions.push({ q: str(q.q), options, answer: a, explain: str(q.explain) || undefined });
  });
  if (!terms.length && !formulas.length && !questions.length) {
    errors.push(`${title}: nothing to import (no terms, formulas or questions).`);
    return null;
  }
  return { id: `${topic}-${module ?? 'x'}-${slug(title)}`, topic, module, title, terms, formulas, questions };
}

/** Accepts one lesson, an array, or {lessons:[…]}; tolerates a ```json fence around it. */
export function parseCfaLessons(text: string): { lessons: CfaLesson[]; errors: string[] } {
  const body = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return { lessons: [], errors: ['That is not valid JSON. Paste exactly what Claude answered.'] };
  }
  const list = Array.isArray(data) ? data : Array.isArray((data as any)?.lessons) ? (data as any).lessons : [data];
  const errors: string[] = [];
  const lessons = list.map((l: unknown, i: number) => toLesson(l, i, errors)).filter((l: CfaLesson | null): l is CfaLesson => !!l);
  return { lessons, errors };
}
