/** Shutdown → Inbox: every captured line gets one tap – To-do / Card / Reading / Club item / Application note / Delete. */
import { useApp, setInterviewQuestions } from '../core/store';
import { useStored } from '../core/kv';
import { appendNote, type InboxItem } from '../core/inbox';
import { newTodo, type Todo } from '../core/todos';
import { newReading, type Reading } from '../core/readings';
import { newItem, type Club } from '../core/clubs';
import type { Application } from '../core/applications';
import { mergeQuestions, type InterviewQuestion } from '../modules/interview/questions';

export function InboxTriage() {
  const [inbox, setInbox] = useStored<InboxItem[]>('inbox', []);
  const [todos, setTodos] = useStored<Todo[]>('todos', []);
  const [readings, setReadings] = useStored<Reading[]>('readings', []);
  const [clubs, setClubs] = useStored<Club[]>('clubs', []);
  const [apps, setApps] = useStored<Application[]>('applications', []);
  const questions = useApp((s) => s.content.interviewQs) ?? [];
  if (inbox.length === 0) return null;
  const done = (id: string) => setInbox(inbox.filter((x) => x.id !== id));
  const card = (it: InboxItem): InterviewQuestion => ({ id: `technical-captured-${it.id}`, question: it.text, deck: 'technical', topic: 'Captured', model_answer_points: ['(write your answer here – edit in Import pack)'], difficulty: 2 });
  return (
    <section className="glass" style={{ gridColumn: 'span 12' }}>
      <div className="glass-head"><h2>Inbox</h2><span className="faint tiny">{inbox.length} to sort – aim for zero tonight</span></div>
      <ul className="today-list">
        {inbox.map((it) => (
          <li key={it.id} className="today-row" style={{ flexWrap: 'wrap' }}>
            <div className="grow">{it.text}</div>
            <span className="row" style={{ gap: 6 }}>
              <button className="btn btn-sm" onClick={() => { setTodos([...todos, newTodo(it.text)]); done(it.id); }}>To-do</button>
              <button className="btn btn-sm" onClick={() => { void setInterviewQuestions(mergeQuestions(questions, [card(it)])); done(it.id); }}>Card</button>
              <button className="btn btn-sm" onClick={() => { setReadings([...readings, newReading({ title: it.text, kind: 'optional' })]); done(it.id); }}>Reading</button>
              {clubs.length > 0 && (
                <select className="input app-stage" value="" aria-label="Club item" onChange={(e) => { const c = clubs.find((x) => x.id === e.target.value); if (c) { setClubs(clubs.map((x) => (x.id === c.id ? { ...x, items: [...x.items, newItem(it.text)] } : x))); done(it.id); } }}>
                  <option value="">Club item…</option>{clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {apps.length > 0 && (
                <select className="input app-stage" value="" aria-label="Application note" onChange={(e) => { const a = apps.find((x) => x.id === e.target.value); if (a) { setApps(apps.map((x) => (x.id === a.id ? { ...x, notes: appendNote(x.notes, it.text) } : x))); done(it.id); } }}>
                  <option value="">Application note…</option>{apps.map((a) => <option key={a.id} value={a.id}>{a.company}</option>)}
                </select>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => done(it.id)}>Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
