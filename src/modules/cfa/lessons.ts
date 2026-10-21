/** CFA lesson packs: key terms, formulas and exam-style questions that you import after each lesson. */

export interface CfaTerm { term: string; definition: string; /** German translation + short note, shown only with the DE toggle. */ de?: string }
export interface CfaFormula { name: string; formula: string; note?: string }
export interface CfaQuestion { q: string; options: string[]; answer: number; explain?: string }
export interface CfaExample { title: string; problem: string; solution: string }

/** The German version of a step's texts (each part optional – missing parts fall back to English). */
export interface CfaLearnSectionDe { title?: string; text?: string; example?: string; remember?: string; trap?: string; check?: CfaQuestion }
/** One step of the guided lesson. In `text`, [[word]] marks a glossary word (a term or a word from `words`). */
export interface CfaLearnSection { title: string; text: string; example?: string; remember?: string; trap?: string; check?: CfaQuestion; de?: CfaLearnSectionDe }
/** A note on the original PDF: highlights `quote` (text on that page) and explains it in the margin. */
export interface CfaAnnotation {
  page: number;
  quote: string;
  /** word = a term explained · plain = the passage in plain words · formula = symbols taken apart · trap = exam trap */
  kind: 'word' | 'plain' | 'formula' | 'trap';
  title?: string;
  note: string;
  de?: { title?: string; note?: string };
}
/** The guided, beginner-friendly version of a lesson (optional). `de` holds the German intro and summary. */
export interface CfaLearn {
  intro: string;
  sections: CfaLearnSection[];
  summary: string[];
  words: CfaTerm[];
  de?: { intro?: string; summary?: string[] };
  /** Notes on the original PDF (the "Annotated PDF" view). */
  annotations?: CfaAnnotation[];
}

export interface CfaLesson {
  id: string;
  /** Topic id from the CFA course (quant, economics, fsa …). */
  topic: string;
  module?: number;
  title: string;
  terms: CfaTerm[];
  formulas: CfaFormula[];
  questions: CfaQuestion[];
  /** Worked examples (optional – older packs have none). */
  examples?: CfaExample[];
  /** Guided lesson (optional). */
  learn?: CfaLearn;
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
  "questions": [{ "q": "...", "options": ["...", "...", "..."], "answer": 0, "explain": "why it is right" }],
  "examples": [{ "title": "...", "problem": "a short calculation task with numbers", "solution": "step by step, with the formula used and the result" }]
}
Rules: only use what is in the lesson. 8–15 terms, every formula, 8–12 questions with exactly three options (A/B/C, "answer" = index 0–2) in CFA exam style, 2–4 worked examples for the calculations.`;

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
  const terms = toTerms(r.terms);
  const formulas = (Array.isArray(r.formulas) ? r.formulas : [])
    .map((f: any) => ({ name: str(f?.name), formula: str(f?.formula), note: str(f?.note) || undefined }))
    .filter((f) => f.name && f.formula);
  const questions: CfaQuestion[] = [];
  (Array.isArray(r.questions) ? r.questions : []).forEach((q: unknown, n: number) => {
    const ok = toQuestion(q);
    if (ok) questions.push(ok);
    else errors.push(`${title}: question ${n + 1} skipped (needs "q", at least two options and a valid "answer").`);
  });
  const examples = (Array.isArray(r.examples) ? r.examples : [])
    .map((x: any) => ({ title: str(x?.title), problem: str(x?.problem), solution: str(x?.solution) }))
    .filter((x) => x.problem && x.solution);
  if (!terms.length && !formulas.length && !questions.length && !examples.length) {
    errors.push(`${title}: nothing to import (no terms, formulas or questions).`);
    return null;
  }
  const learn = toLearn(r.learn);
  return { id: `${topic}-${module ?? 'x'}-${slug(title)}`, topic, module, title, terms, formulas, questions, ...(examples.length ? { examples } : {}), ...(learn ? { learn } : {}) };
}

function toTerms(raw: unknown): CfaTerm[] {
  return (Array.isArray(raw) ? raw : [])
    .map((t: any) => ({ term: str(t?.term), definition: str(t?.definition), de: str(t?.de) || undefined }))
    .filter((t) => t.term && t.definition);
}

function toQuestion(q: any): CfaQuestion | null {
  const options = (Array.isArray(q?.options) ? q.options : []).map(str).filter(Boolean);
  const a = typeof q?.answer === 'string' ? 'abc'.indexOf(q.answer.trim().toLowerCase()) : q?.answer;
  if (!str(q?.q) || options.length < 2 || !Number.isInteger(a) || a < 0 || a >= options.length) return null;
  return { q: str(q.q), options, answer: a, explain: str(q.explain) || undefined };
}

function toLearn(raw: unknown): CfaLearn | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const sections = (Array.isArray(r.sections) ? r.sections : [])
    .map((x: any): CfaLearnSection => ({
      title: str(x?.title),
      text: str(x?.text),
      example: str(x?.example) || undefined,
      remember: str(x?.remember) || undefined,
      trap: str(x?.trap) || undefined,
      check: x?.check ? toQuestion(x.check) ?? undefined : undefined,
      ...(x?.de ? { de: toSectionDe(x.de) } : {}),
    }))
    .filter((x) => x.title && x.text);
  if (!sections.length) return undefined;
  const de = (r.de ?? null) as Record<string, unknown> | null;
  return {
    intro: str(r.intro),
    sections,
    summary: strings(r.summary),
    words: toTerms(r.words),
    ...(de ? { de: { intro: str(de.intro) || undefined, summary: strings(de.summary).length ? strings(de.summary) : undefined } } : {}),
    ...(toAnnotations(r.annotations).length ? { annotations: toAnnotations(r.annotations) } : {}),
  };
}

const KINDS: CfaAnnotation['kind'][] = ['word', 'plain', 'formula', 'trap'];
function toAnnotations(raw: unknown): CfaAnnotation[] {
  return (Array.isArray(raw) ? raw : [])
    .map((a: any): CfaAnnotation => ({
      page: Number.isInteger(a?.page) && a.page > 0 ? a.page : 0,
      quote: str(a?.quote),
      kind: KINDS.includes(a?.kind) ? a.kind : 'plain',
      title: str(a?.title) || undefined,
      note: str(a?.note),
      ...(a?.de ? { de: { title: str(a.de.title) || undefined, note: str(a.de.note) || undefined } } : {}),
    }))
    .filter((a) => a.page && a.quote && a.note);
}

const strings = (v: unknown) => (Array.isArray(v) ? v : []).map(str).filter(Boolean);

function toSectionDe(x: any): CfaLearnSectionDe {
  const opt = (v: unknown) => str(v) || undefined;
  return { title: opt(x.title), text: opt(x.text), example: opt(x.example), remember: opt(x.remember), trap: opt(x.trap), check: x.check ? toQuestion(x.check) ?? undefined : undefined };
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
