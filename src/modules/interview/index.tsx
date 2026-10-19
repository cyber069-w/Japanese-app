/** Interview preparation: three decks (technical, behavioural / fit, firm-specific), self-rated cards on the shared SRS engine. */
import type { BaseItem, Exercise, FilterGroup, Question, StudyContext, StudyModule } from '../../core/types';
import { navigate } from '../../lib/router';
import { InterviewImport } from './InterviewImport';
import { DECKS, deckLabel, type InterviewQuestion } from './questions';

interface QItem extends BaseItem { q: InterviewQuestion }
const questionsOf = (ctx: StudyContext) => ctx.content.interviewQs ?? [];
const groupOf = (q: InterviewQuestion) => (q.deck === 'firm' ? `firm:${(q.firm || 'firm').toLowerCase()}` : `${q.deck}:${q.topic.toLowerCase()}`);

const cards: Exercise<QItem> = {
  id: 'cards',
  name: 'Interview cards',
  description: 'Read the question, answer out loud, reveal the points, rate how well you covered them.',
  icon: '?',
  selfRated: true,
  items: (ctx) => questionsOf(ctx).map((q) => ({ id: q.id, label: q.question, sub: `${deckLabel(q.deck)} · ${q.topic}`, groups: [groupOf(q)], q })),
  question: (it): Question => ({
    prompt: { text: it.q.question, lang: 'latin', size: 'medium', instruction: `${deckLabel(it.q.deck)} · ${it.q.topic}${it.q.firm ? ` · ${it.q.firm}` : ''} – answer out loud first` },
    answer: {
      type: 'reveal',
      back: (
        <div>
          <ul className="solution-notes">{it.q.model_answer_points.map((p) => <li key={p}>{p}</li>)}</ul>
          {it.q.applicationId && <div className="solution-sub"><a href="#/applications">Open the application</a></div>}
        </div>
      ),
    },
    solution: { main: it.q.model_answer_points[0] ?? '', lang: 'latin', notes: it.q.model_answer_points.slice(1) },
  }),
};

const groupFor = (q: InterviewQuestion): FilterGroup => ({
  id: groupOf(q), label: q.deck === 'firm' ? q.firm || 'Firm' : q.topic, section: deckLabel(q.deck),
});

export const interview: StudyModule = {
  id: 'interview',
  name: 'Interview decks',
  nameJa: 'Interview',
  icon: '?',
  description: 'Technical, behavioural and firm-specific questions – answer out loud, reveal the points, rate yourself.',
  status: 'ready',
  exercises: [cards],
  groups: (ctx) => {
    const seen = new Map<string, FilterGroup>();
    for (const q of questionsOf(ctx)) if (!seen.has(groupOf(q))) seen.set(groupOf(q), { ...groupFor(q), sub: String(questionsOf(ctx).filter((x) => groupOf(x) === groupOf(q)).length) });
    return [...seen.values()].sort((a, b) => DECKS.findIndex((d) => d.label === a.section) - DECKS.findIndex((d) => d.label === b.section) || a.label.localeCompare(b.label));
  },
  presets: [],
  emptyState: (ctx) =>
    questionsOf(ctx).length ? null : (
      <div className="empty">
        <span className="serif">?</span>
        <p style={{ marginBottom: 14 }}>No questions yet. Ask Claude for a pack and import it here.</p>
        <button className="btn btn-primary" onClick={() => navigate('/m/interview/t/import')}>Import a pack</button>
      </div>
    ),
  tools: [
    { id: 'import', name: 'Import pack', description: 'Get the prompt for Claude, paste the JSON pack, manage your questions.', icon: '入', component: InterviewImport },
  ],
};
