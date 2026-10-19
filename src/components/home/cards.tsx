/** Home cards: lessons today, to-dos, focus timer, due cards, week. Frosted-glass bento (styles: .glass / .bento). */
import { useMemo, useState } from 'react';
import { useApp } from '../../core/store';
import { useDueCounts } from '../../core/hooks';
import { useStored } from '../../core/kv';
import { useFocus } from '../../core/focusStore';
import { hoursBySubject, targetRows, weekStart, type Targets } from '../../core/targets';
import { newTodo, sortTodos, type Todo } from '../../core/todos';
import { COURSES } from '../../courses';
import { daysUntil } from '../../lib/date';
import { navigate } from '../../lib/router';
import { FocusPanel, hhmm, subjectColor } from '../../screens/FocusWidget';
import { Icon } from '../Icon';
import { HeadIcon } from '../HeadIcon';
import { EmptyState } from '../EmptyState';
import { PlanSheet } from './PlanSheet';
import type { PlannedBlock } from '../../core/targets';
import type { useToday } from '../todayData';

type Today = ReturnType<typeof useToday>;
const dayLabel = (iso: string, now: number) => {
  const d = daysUntil(iso.slice(0, 10), now);
  return d < 0 ? 'overdue' : d === 0 ? 'today' : d === 1 ? 'tomorrow' : new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

export function LessonsCard({ t }: { t: Today }) {
  const [planned, setPlanned] = useStored<PlannedBlock[]>('today:planned', []);
  const [planning, setPlanning] = useState(false);
  const next = t.day.filter((b) => b.end > t.now);
  const lessons = next.filter((b) => b.kind === 'lecture').length;
  const endOfToday = new Date(new Date(t.now).setHours(23, 59, 59, 999)).getTime();
  const later = planned.filter((p) => p.start > endOfToday).sort((a, b) => a.start - b.start);
  const accept = (b: { subject?: string; start: number; end: number }) =>
    setPlanned([...planned.filter((p) => p.end > t.now), { id: `plan-${b.subject}-${b.start}`, subject: b.subject!, start: b.start, end: b.end }]);
  return (
    <section className="glass b-lessons">
      <div className="glass-head">
        <h2><HeadIcon name="calendar" color="#ff9f0a" />Your lessons</h2>
        <span className="faint tiny">{lessons ? `${lessons} left today` : 'today'}</span>
        <button className="btn btn-sm" onClick={() => setPlanning(true)}><Icon name="sparkle" size={14} /> Plan my week</button>
      </div>
      {t.calendar === null && <EmptyState icon="calendar" title="No timetable yet" hint="Import your Outlook calendar (.ics) to see your lectures here." action={{ label: 'Import timetable', href: '#/focus' }} />}
      {t.calendar && next.length === 0 && <EmptyState icon="check" title="Nothing left today" hint="No lecture or free block of 45 min or more remains in your day window." />}
      <ul className="slots">
        {next.slice(0, 6).map((b) => (
          <li key={`${b.kind}${b.start}`} className={`slot ${b.kind}${b.start <= t.now ? ' now' : ''}`}>
            <span className="slot-time">{hhmm(b.start)}<small>{hhmm(b.end)}</small></span>
            <span className="slot-bar" style={{ background: b.subject ? subjectColor(b.subject) : undefined }} />
            <span className="slot-main">
              <b>{b.kind === 'lecture' ? b.title : `Study ${b.subject}`}</b>
              <small>{b.start <= t.now ? 'now' : b.kind === 'lecture' ? 'lecture' : b.planned ? 'planned' : 'suggested'}</small>
            </span>
            {b.kind === 'study' && b.subject && (
              <span className="row" style={{ gap: 6 }}>
                {!b.planned && <button className="btn btn-sm btn-ghost" onClick={() => accept(b)} title="Keep this block in your plan">Accept</button>}
                <button className="btn btn-sm" onClick={() => t.run({ type: 'timer', label: '', subject: b.subject! })}>Start</button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {later.length > 0 && (
        <div className="later">
          <div className="eyebrow">Planned later</div>
          <ul className="slots">
            {later.slice(0, 4).map((p) => (
              <li key={p.id} className="slot study">
                <span className="slot-time">{new Date(p.start).toLocaleDateString('en-GB', { weekday: 'short' })}<small>{hhmm(p.start)}</small></span>
                <span className="slot-bar" style={{ background: subjectColor(p.subject) }} />
                <span className="slot-main"><b>{p.subject}</b><small>{hhmm(p.start)}–{hhmm(p.end)}{p.note ? ` · ${p.note}` : ''}</small></span>
                <button className="btn btn-sm btn-ghost" aria-label="Remove" onClick={() => setPlanned(planned.filter((x) => x.id !== p.id))}><Icon name="x" size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {planning && <PlanSheet t={t} onClose={() => setPlanning(false)} />}
    </section>
  );
}

export function TodosCard({ t }: { t: Today }) {
  const [todos, setTodos] = useStored<Todo[]>('todos', []);
  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const canvas = t.shown.filter((i) => i.kind === 'deadline' || i.kind === 'suggestion' || i.kind === 'application').slice(0, 4);
  const mine = sortTodos(todos);
  const add = () => {
    if (!text.trim()) return;
    setTodos([...todos, newTodo(text, due)]);
    setText('');
    setDue('');
  };
  const open = mine.filter((x) => !x.done).length;
  return (
    <section className="glass b-todos">
      <div className="glass-head"><h2><HeadIcon name="list" color="#0a84ff" />To-dos</h2><span className="faint tiny">{open + canvas.length} open</span></div>
      <form className="todo-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="input" placeholder="Add a to-do…" value={text} onChange={(e) => setText(e.target.value)} aria-label="New to-do" />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()} aria-label="Add to-do"><span aria-hidden="true" style={{ fontSize: "1.3rem", lineHeight: 1 }}>+</span></button>
        {text.trim() && <label className="todo-when faint small">Due <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date (optional)" /></label>}
      </form>
      <ul className="todo-list">
        {canvas.map((i) => (
          <li key={i.id} className="todo canvas">
            <span className="todo-dot" aria-hidden="true" />
            <span className="grow"><b>{i.title.length > 64 ? `${i.title.slice(0, 61)}…` : i.title}</b><small>{i.subject} · {i.kind === 'application' ? 'Application' : 'Canvas'}{i.due ? ` · ${dayLabel(new Date(i.due).toISOString(), t.now)}` : ''}</small></span>
            <button className="btn btn-sm btn-ghost" onClick={() => t.run(i.action)}>{i.action.type === 'link' ? 'Open' : 'Go'}</button>
          </li>
        ))}
        {mine.map((x) => (
          <li key={x.id} className={`todo${x.done ? ' done' : ''}`}>
            <button className="todo-check" aria-label={x.done ? 'Mark open' : 'Mark done'} aria-pressed={x.done} onClick={() => setTodos(todos.map((y) => (y.id === x.id ? { ...y, done: !y.done, doneAt: y.done ? undefined : Date.now() } : y)))}>
              {x.done && <Icon name="check" size={14} />}
            </button>
            <span className="grow"><b>{x.text}</b>{x.due && <small>{dayLabel(x.due, t.now)}</small>}</span>
            <button className="btn btn-sm btn-ghost" aria-label="Delete to-do" onClick={() => setTodos(todos.filter((y) => y.id !== x.id))}><Icon name="x" size={14} /></button>
          </li>
        ))}
      </ul>
      {!canvas.length && !mine.length && <EmptyState icon="list" title="No to-dos" hint="Add one above – Canvas deadlines you accept show up here too." />}
      {mine.some((x) => x.done) && <button className="btn btn-sm btn-ghost" onClick={() => setTodos(todos.filter((y) => !y.done))}>Clear done</button>}
    </section>
  );
}

export function FocusCard() {
  return (
    <section className="glass b-focus">
      <div className="glass-head"><h2><HeadIcon name="clock" color="#5e5ce6" />Focus</h2><a className="tiny" href="#/focus">Log →</a></div>
      <FocusPanel compact />
    </section>
  );
}

export function CardsCard() {
  const due = useDueCounts();
  const top = COURSES.map((c) => ({ c, n: due.perCourse[c.id] ?? 0 })).sort((a, b) => b.n - a.n)[0];
  return (
    <section className="glass b-cards">
      <div className="glass-head"><h2><HeadIcon name="review" color="#af52de" />Review</h2></div>
      <div className="big-number">{due.total}</div>
      <div className="muted small">card{due.total === 1 ? '' : 's'} due today{due.total > 0 && top?.n ? ` · most in ${top.c.name}` : ''}</div>
      <button className="btn btn-primary" disabled={!due.total} onClick={() => navigate('/review')}><Icon name="review" size={17} /> Review now</button>
    </section>
  );
}

export function WeekCard() {
  const f = useFocus();
  const settings = useApp((s) => s.settings);
  const [targets] = useStored<Targets>('focus:targets', {});
  const now = Date.now();
  const done = useMemo(() => hoursBySubject(f.sessions, weekStart(now)), [f.sessions, now]);
  const rows = targetRows(targets, done).slice(0, 4);
  const total = Object.values(done).reduce((a, b) => a + b, 0);
  const exams = COURSES.map((c) => ({ c, d: settings.examDates?.[c.id] ? daysUntil(settings.examDates[c.id], now) : null })).filter((x) => x.d !== null && x.d >= 0).sort((a, b) => a.d! - b.d!);
  return (
    <section className="glass b-week">
      <div className="glass-head"><h2><HeadIcon name="chart-line" color="#30b650" />This week</h2><span className="faint tiny">{(Math.round(total * 10) / 10).toFixed(1)} h focused</span></div>
      {rows.length ? (
        <ul className="week-bars">
          {rows.map((r) => (
            <li key={r.subject}>
              <span>{r.subject}</span>
              <span className="week-track"><i style={{ width: `${Math.min(100, (r.done / r.target) * 100)}%` }} /></span>
              <small>{(Math.round(r.done * 10) / 10).toFixed(1)}/{r.target} h</small>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="target" title="No weekly targets yet" hint="Set hours per subject to see your progress here." action={{ label: 'Set targets', href: '#/focus' }} />
      )}
      {exams.length > 0 && <div className="exam-chips">{exams.slice(0, 3).map(({ c, d }) => <span key={c.id}><b>{d}</b> days to {c.name}</span>)}</div>}
    </section>
  );
}
