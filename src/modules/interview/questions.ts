/** Interview question packs: three decks, JSON import, and the tutor prompt that generates a pack. */

export type Deck = 'technical' | 'behavioural' | 'firm';
export const DECKS: Array<{ id: Deck; label: string }> = [
  { id: 'technical', label: 'Technical' }, { id: 'behavioural', label: 'Behavioural / Fit' }, { id: 'firm', label: 'Firm-specific' },
];
export const deckLabel = (d: Deck) => DECKS.find((x) => x.id === d)?.label ?? d;

export interface InterviewQuestion {
  id: string;
  question: string;
  deck: Deck;
  topic: string;
  /** Points a good answer covers (self-check on the back of the card). */
  model_answer_points: string[];
  /** 1 easy … 3 hard */
  difficulty: 1 | 2 | 3;
  /** Firm-specific cards: the firm and (optionally) the linked application id. */
  firm?: string;
  applicationId?: string;
}

export const TECH_TOPICS = [
  'Accounting (3 statements, linking)', 'Valuation (DCF, multiples, WACC)', 'EV vs equity value', 'M&A (accretion / dilution)', 'LBO basics', 'Markets and current deals',
];
export const FIT_TOPICS = ['Why finance / why this role', 'Strengths and weaknesses', 'Teamwork and leadership', 'Failure and learning', 'Motivation and career plan'];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h.toString(36); };

const deckOf = (v: unknown): Deck | null => {
  const s = str(v).toLowerCase();
  if (s.startsWith('tech')) return 'technical';
  if (s.startsWith('behav') || s.startsWith('fit')) return 'behavioural';
  if (s.startsWith('firm')) return 'firm';
  return null;
};
const diffOf = (v: unknown): 1 | 2 | 3 => {
  if (typeof v === 'number') return (Math.min(3, Math.max(1, Math.round(v))) as 1 | 2 | 3);
  const s = str(v).toLowerCase();
  return s.startsWith('h') ? 3 : s.startsWith('e') ? 1 : 2;
};

/** Accepts {questions:[…]}, an array, or one object; tolerates a ```json fence. `defaults` fills missing deck/firm/application. */
export function parseInterviewPack(text: string, defaults: Partial<Pick<InterviewQuestion, 'deck' | 'firm' | 'applicationId'>> = {}): { questions: InterviewQuestion[]; errors: string[] } {
  const body = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let data: unknown;
  try { data = JSON.parse(body); } catch { return { questions: [], errors: ['This is not valid JSON – paste Claude’s whole answer.'] }; }
  const list = Array.isArray(data) ? data : Array.isArray((data as { questions?: unknown })?.questions) ? (data as { questions: unknown[] }).questions : [data];
  const errors: string[] = [];
  const questions: InterviewQuestion[] = [];
  list.forEach((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const question = str(r.question);
    const deck = deckOf(r.deck) ?? defaults.deck ?? null;
    const points = (Array.isArray(r.model_answer_points) ? r.model_answer_points : []).map(str).filter(Boolean);
    if (!question || !deck || !points.length) return void errors.push(`Question ${i + 1} skipped (needs "question", a valid "deck" and "model_answer_points").`);
    const topic = str(r.topic) || 'General';
    const firm = str(r.firm) || defaults.firm || undefined;
    questions.push({ id: `${deck}-${slug(topic)}-${hash(question)}`, question, deck, topic, model_answer_points: points, difficulty: diffOf(r.difficulty), ...(deck === 'firm' ? { firm, applicationId: str(r.applicationId) || defaults.applicationId } : {}) });
  });
  return { questions, errors };
}

/** Same id replaces the older version. */
export const mergeQuestions = (existing: InterviewQuestion[], fresh: InterviewQuestion[]) => {
  const ids = new Set(fresh.map((q) => q.id));
  return [...existing.filter((q) => !ids.has(q.id)), ...fresh];
};

export function packPrompt(opts: { deck: Deck; topics: string[]; firm?: string; role?: string }): string {
  const what = opts.deck === 'firm' ? `firm-specific questions for ${opts.firm || 'the firm'}${opts.role ? ` (${opts.role})` : ''} – e.g. “Why this firm?”, recent deals, culture, products, how it differs from competitors`
    : opts.deck === 'technical' ? 'technical finance interview questions' : 'behavioural / fit interview questions';
  return [
    `Create a study pack of ${what} for a finance internship interview (Investment Banking / Private Equity, student level).`,
    `Topics: ${opts.topics.join('; ') || 'a sensible mix'}. Write 20 original questions per topic. Do not copy or closely paraphrase questions from paid interview guides, books or courses.`,
    'Answer with ONE JSON object only, no other text:',
    '{ "questions": [ { "question": "...", "deck": "' + opts.deck + '", "topic": "<one of the topics>", "model_answer_points": ["3–6 short points a strong answer covers"], "difficulty": 1' + (opts.deck === 'firm' ? ', "firm": "' + (opts.firm || '') + '"' : '') + ' } ] }',
    'difficulty: 1 = easy, 2 = medium, 3 = hard. Keep answer points factual and concise; mark anything uncertain with "(check)".',
  ].join('\n');
}

/** Feedback prompt (D4): question + model answer points + transcript. */
export function feedbackPrompt(q: Pick<InterviewQuestion, 'question' | 'model_answer_points'>, transcript: string, stats?: string): string {
  return [
    'You are my interview coach. Give feedback on my spoken answer.',
    '', `Question: ${q.question}`, '', 'Model answer points:', ...q.model_answer_points.map((p) => `- ${p}`), '',
    `My answer (transcript${stats ? `; ${stats}` : ''}):`, transcript || '(no transcript)', '',
    'Reply with: 1) a score out of 10, 2) what to fix (max 4 bullets, concrete), 3) a stronger version of my answer in the same length, 4) two follow-up questions an interviewer could ask.',
  ].join('\n');
}

/** Sparring prompt (D7): Claude plays the interviewer for 5 rounds. */
export function sparPrompt(q: Pick<InterviewQuestion, 'question'>, transcript: string): string {
  return [
    'Act as a finance interviewer. We spar for 5 rounds: ask ONE follow-up question at a time, react to my answer briefly and honestly (what was good, what was weak), then wait for my reply. After round 5 give a short verdict.',
    '', `Opening question: ${q.question}`, '', 'My first answer (transcript):', transcript || '(no transcript)', '', 'Start with your reaction and the first follow-up question.',
  ].join('\n');
}

/** One line from the market and deal log → a technical card (deck "Markets and current deals"). */
export function questionFromMarket(item: { id: string; date: string; text: string; tag: 'market' | 'deal' | 'asia' }): InterviewQuestion {
  const ask = item.tag === 'deal' ? `Walk me through this deal and why the buyer or investor might have done it: ${item.text}` : item.tag === 'asia' ? `What is happening in Asian markets – ${item.text} – and what does it mean for investors?` : `What is going on in the markets: ${item.text}? Why does it matter?`;
  return {
    id: `technical-market-${item.id}`, question: ask, deck: 'technical', topic: 'Markets and current deals', difficulty: 2,
    model_answer_points: [`The facts (${item.date}): ${item.text}`, 'Who is affected and how (sectors, valuations, rates)', 'Your view: what could happen next and what you would watch'],
  };
}
