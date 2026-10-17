/** CFA Level 1: key terms, formulas and exam-style questions from the lessons you import. */
import type { BaseItem, Exercise, FilterGroup, Question, StudyContext, StudyModule } from '../../core/types';
import { shuffle } from '../../core/session';
import { navigate } from '../../lib/router';
import { CfaImport } from './CfaImport';
import { FormulaSheet } from './FormulaSheet';
import { CFA_TOPIC_NAMES, type CfaLesson } from './lessons';

interface TermItem extends BaseItem { term: string; definition: string }
interface CardItem extends BaseItem { front: string; back: string; note?: string; formula: boolean }
interface QuestionItem extends BaseItem { q: string; options: string[]; answer: number; explain?: string }

const lessonsOf = (ctx: StudyContext) => ctx.content.cfaLessons;

function termItems(ctx: StudyContext): TermItem[] {
  return lessonsOf(ctx).flatMap((l) =>
    l.terms.map((t, i) => ({ id: `${l.id}-t${i}`, label: t.term, sub: t.definition, groups: [l.id], term: t.term, definition: t.definition })),
  );
}

const terms: Exercise<TermItem> = {
  id: 'terms',
  name: 'Key terms',
  description: 'See a term, pick the right definition.',
  icon: 'T',
  items: termItems,
  question: (it, ctx): Question => {
    const others = shuffle((ctx.pool as TermItem[]).filter((x) => x.id !== it.id && x.definition !== it.definition), ctx.rng).slice(0, 3);
    const opts = shuffle([it, ...others], ctx.rng);
    return {
      prompt: { text: it.term, lang: 'latin', size: 'medium', instruction: 'What does it mean?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: o.definition, lang: 'latin' })), correct: opts.indexOf(it) },
      solution: { main: it.definition, lang: 'latin' },
    };
  },
};

const cards: Exercise<CardItem> = {
  id: 'cards',
  name: 'Terms and formulas',
  description: 'Flip cards: say it to yourself, reveal, rate how well you knew it.',
  icon: 'ƒ',
  selfRated: true,
  items: (ctx) =>
    lessonsOf(ctx).flatMap((l) => [
      ...l.terms.map((t, i): CardItem => ({ id: `${l.id}-t${i}`, label: t.term, sub: t.definition, groups: [l.id], front: t.term, back: t.definition, formula: false })),
      ...l.formulas.map((f, i): CardItem => ({ id: `${l.id}-f${i}`, label: f.name, sub: f.formula, groups: [l.id], front: f.name, back: f.formula, note: f.note, formula: true })),
    ]),
  question: (it): Question => ({
    prompt: { text: it.front, lang: 'latin', size: 'medium', instruction: it.formula ? 'Write down the formula' : 'Define it' },
    answer: {
      type: 'reveal',
      back: (
        <div>
          <div className="solution-main" style={{ fontFamily: it.formula ? 'var(--font-mono, monospace)' : undefined }}>{it.back}</div>
          {it.note && <div className="solution-sub">{it.note}</div>}
        </div>
      ),
    },
    solution: { main: it.back, lang: 'latin', sub: it.note },
  }),
};

const questions: Exercise<QuestionItem> = {
  id: 'questions',
  name: 'Practice questions',
  description: 'Exam-style A/B/C questions with an explanation – select several lessons for mixed questions.',
  icon: '?',
  items: (ctx) =>
    lessonsOf(ctx).flatMap((l) =>
      l.questions.map((q, i) => ({ id: `${l.id}-q${i}`, label: `Q${i + 1}`, sub: q.q, groups: [l.id], q: q.q, options: q.options, answer: q.answer, explain: q.explain })),
    ),
  question: (it): Question => ({
    prompt: { text: it.q, lang: 'latin', size: 'medium', instruction: 'Choose the best answer' },
    answer: { type: 'choice', options: it.options.map((o, i) => ({ label: `${'ABC'[i] ?? i + 1}) ${o}`, lang: 'latin' })), correct: it.answer },
    solution: { main: `${'ABC'[it.answer] ?? it.answer + 1}) ${it.options[it.answer]}`, lang: 'latin', notes: it.explain ? [it.explain] : undefined },
  }),
};

const lessonGroup = (l: CfaLesson): FilterGroup => ({
  id: l.id,
  label: l.module ? `${l.module}. ${l.title}` : l.title,
  sub: String(l.terms.length + l.formulas.length + l.questions.length),
  section: CFA_TOPIC_NAMES[l.topic] ?? l.topic,
});

export const cfa: StudyModule = {
  id: 'cfa',
  name: 'CFA lessons',
  nameJa: 'CFA',
  icon: 'Σ',
  description: 'Key terms, formulas and exam-style questions from the lessons you import – pick one lesson or mix several.',
  status: 'ready',
  exercises: [terms, cards, questions],
  groups: (ctx) => lessonsOf(ctx).map(lessonGroup),
  presets: [],
  emptyState: (ctx) =>
    lessonsOf(ctx).length ? null : (
      <div className="empty">
        <span className="serif">Σ</span>
        <p style={{ marginBottom: 14 }}>No lessons yet. After a lesson, ask Claude for a study pack and import it here.</p>
        <button className="btn btn-primary" onClick={() => navigate('/m/cfa/t/import')}>Import a lesson</button>
      </div>
    ),
  tools: [
    { id: 'import', name: 'Import lesson', description: 'Get the prompt for Claude, paste the pack, download all lessons.', icon: '入', component: CfaImport },
    { id: 'formulas', name: 'Formula sheet', description: 'Every formula and worked example from your lessons, by topic – searchable and printable.', icon: 'ƒ', component: FormulaSheet },
  ],
};
