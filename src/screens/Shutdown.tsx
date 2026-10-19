/** Evening shutdown (#/shutdown): today's numbers, tomorrow, top 3 → to-dos, Done, iA Writer note, calendar reminders. */
import { useMemo, useState } from 'react';
import { useApp } from '../core/store';
import { useStored } from '../core/kv';
import { useFocus, initFocus } from '../core/focusStore';
import { hoursBySubject, weekStart, type Targets } from '../core/targets';
import { newTodo, type Todo } from '../core/todos';
import { shutdownDay, shutdownMarkdown, shutdownPath, shutdownStreak, iaWriterUrl, type ShutdownLog } from '../core/shutdown';
import { useToday } from '../components/todayData';
import { beforeTomorrow, type Reading } from '../core/readings';
import { focusSubject } from '../core/today';
import { downloadIcs } from '../lib/ics';
import { shutdownReminders } from '../lib/shutdownReminders';
import { navigate } from '../lib/router';
import { useEffect } from 'react';
import { Icon } from '../components/Icon';
import { InboxTriage } from '../components/InboxTriage';
import { EmptyState } from '../components/EmptyState';

const hh = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const nextDay = (key: string) => { const [y, m, d] = key.split('-').map(Number); const n = new Date(y, m - 1, d + 1); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; };

export function Shutdown({ quickStart }: { quickStart?: boolean }) {
  const settings = useApp((s) => s.settings);
  const days = useApp((s) => s.days);
  const focus = useFocus();
  const t = useToday();
  useEffect(initFocus, []);
  const [log, setLog] = useStored<ShutdownLog>('shutdown:log', {});
  const [todos, setTodos] = useStored<Todo[]>('todos', []);
  const [targets] = useStored<Targets>('focus:targets', {});
  const [readings] = useStored<Reading[]>('readings', []);
  const [calAdded, setCalAdded] = useStored<boolean>('shutdown:calendarAdded', false);
  const [quick, setQuick] = useState(!!quickStart);
  const [top, setTop] = useState(['', '', '']);
  const [msg, setMsg] = useState('');
  const now = Date.now();
  const day = shutdownDay(now);
  const tomorrow = nextDay(day);
  const entry = log[day];

  const numbers = useMemo(() => {
    const done = hoursBySubject(focus.sessions, weekStart(now));
    const today = focus.sessions.filter((s) => s.day === day).reduce<Record<string, number>>((m, s) => ({ ...m, [s.subject]: (m[s.subject] ?? 0) + s.effectiveSec / 3600 }), {});
    const rows = Object.entries(today).map(([subject, hours]) => ({ subject, hours, target: targets[subject], week: done[subject] ?? 0 })).sort((a, b) => b.hours - a.hours);
    const dayStartMs = new Date(`${day}T05:00:00`).getTime();
    const doneToday = todos.filter((x) => x.done && x.doneAt && x.doneAt >= dayStartMs).length;
    return { rows, cards: days[day]?.reviews ?? 0, doneToday, open: todos.filter((x) => !x.done).length };
  }, [focus.sessions, targets, todos, days, day, now]);

  const tomorrowStart = new Date(`${tomorrow}T00:00:00`).getTime();
  const lecturesTomorrow = t.lectures.filter((l) => !l.allDay && l.start >= tomorrowStart && l.start < tomorrowStart + 86_400_000);
  const readsTomorrow = beforeTomorrow(readings, lecturesTomorrow.map((l) => focusSubject(l.title)), tomorrow);
  const dueTomorrow = t.shown.filter((i) => (i.kind === 'deadline' || i.kind === 'suggestion' || i.kind === 'application' || i.kind === 'club') && i.due !== undefined && i.due >= tomorrowStart && i.due < tomorrowStart + 86_400_000);

  const noteText = () => shutdownMarkdown({
    date: day, focus: numbers.rows.map((r) => ({ subject: r.subject, hours: r.hours })), cards: numbers.cards,
    todosDone: numbers.doneToday, todosOpen: numbers.open, top3: top.filter(Boolean),
  });
  const writeNote = async () => {
    const text = noteText();
    const path = shutdownPath(settings.iaFolder, day, settings.iaOnePerDay);
    await navigator.clipboard?.writeText(text).catch(() => {});
    setMsg(`Note copied. Opening iA Writer at ${path} – if it opens elsewhere, look for “${path.split('/').pop()}”.`);
    window.location.href = iaWriterUrl(path, text);
  };
  const save = () => {
    const lines = top.map((x) => x.trim()).filter(Boolean);
    if (lines.length) setTodos([...todos, ...lines.map((x) => newTodo(x, tomorrow))]);
    setLog({ ...log, [day]: { at: Date.now(), quick, top3: lines } });
    setMsg(lines.length ? `Saved – ${lines.length} to-do${lines.length === 1 ? '' : 's'} dated tomorrow.` : 'Shutdown done.');
  };
  const addCalendar = () => {
    downloadIcs(shutdownReminders(settings.shutdownTimes, now, `${location.origin}${location.pathname}#/shutdown`), 'shutdown-reminders.ics');
    setCalAdded(true);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <div className="eyebrow">{new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>Shutdown</h1>
          <div className="muted" style={{ marginTop: 4 }}>Close the day: what happened, what is next, and your top 3 for tomorrow. {shutdownStreak(log, now) > 0 && <b>{shutdownStreak(log, now)}-day streak.</b>}</div>
        </div>
        <label className="row small" style={{ gap: 8 }}><span>Quick version</span><input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} aria-label="Quick version" /></label>
      </div>

      <div className="bento shutdown-grid">
        {!quick && (
          <section className="glass b-todos">
            <div className="glass-head"><h2>Today</h2></div>
            {numbers.rows.length === 0 ? <EmptyState icon="clock" title="No focus time logged" hint="Log today's hours in Focus if you forgot." action={{ label: 'Open Focus', href: '#/focus' }} /> : (
              <ul className="week-bars">
                {numbers.rows.map((r) => (
                  <li key={r.subject}><span>{r.subject}</span><span className="week-track"><i style={{ width: `${r.target ? Math.min(100, (r.week / r.target) * 100) : 0}%` }} /></span><small>{r.hours.toFixed(1)} h today · {r.target ? `${r.week.toFixed(1)}/${r.target} h week` : '–'}</small></li>
                ))}
              </ul>
            )}
            <div className="exam-chips"><span><b>{numbers.cards}</b> cards reviewed</span><span><b>{numbers.doneToday}</b> to-dos done</span><span><b>{numbers.open}</b> open</span></div>
          </section>
        )}
        {!quick && (
          <section className="glass b-lessons">
            <div className="glass-head"><h2>Tomorrow</h2></div>
            {lecturesTomorrow.length === 0 && dueTomorrow.length === 0 && readsTomorrow.length === 0 && <p className="muted small">No lectures or deadlines known for tomorrow. {t.calendar === null ? 'Import your timetable in Focus to see lectures.' : ''}</p>}
            <ul className="slots">
              {lecturesTomorrow.map((l) => <li key={l.uid + l.start} className="slot lecture"><span className="slot-time">{hh(l.start)}<small>{hh(l.end)}</small></span><span className="slot-bar" /><span className="slot-main"><b>{l.title}</b><small>lecture{l.location ? ` · ${l.location}` : ''}</small></span></li>)}
              {readsTomorrow.map((r) => <li key={r.id} className="slot"><span className="slot-time">read<small>before</small></span><span className="slot-bar" /><span className="slot-main"><b>{r.title}</b><small>{r.course} · {r.progress}% read</small></span></li>)}
              {dueTomorrow.map((i) => <li key={i.id} className="slot"><span className="slot-time">{i.due ? hh(i.due) : '–'}<small>due</small></span><span className="slot-bar" /><span className="slot-main"><b>{i.title.slice(0, 80)}</b><small>{i.subject}</small></span></li>)}
            </ul>
          </section>
        )}
        <InboxTriage />
        <section className="glass b-todos" style={{ gridColumn: 'span 12' }}>
          <div className="glass-head"><h2>Tomorrow's top 3</h2><span className="faint tiny">becomes to-dos dated {tomorrow}</span></div>
          <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            {top.map((v, i) => <input key={i} className="input" placeholder={`${i + 1}.`} value={v} onChange={(e) => setTop(top.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Top ${i + 1}`} />)}
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={save} disabled={!!entry && !top.some((x) => x.trim())}><Icon name="check" size={16} /> {entry ? 'Save again' : 'Done'}</button>
            {!quick && <button className="btn" onClick={() => void writeNote()}><Icon name="pen" size={16} /> Write in iA Writer</button>}
            {entry && <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to Home</button>}
          </div>
          {entry && <div className="notice good small" role="status" style={{ marginTop: 12 }}>Shutdown done at {hh(entry.at)} · streak {shutdownStreak(log, now)} day{shutdownStreak(log, now) === 1 ? '' : 's'}.</div>}
          {msg && <div className="faint small" role="status" style={{ marginTop: 8 }}>{msg}</div>}
        </section>
        {!calAdded && (
          <section className="glass" style={{ gridColumn: 'span 12' }}>
            <div className="glass-head"><h2>Reminders in Calendar</h2></div>
            <p className="muted small">One weekly repeating event per weekday ({settings.shutdownTimes['1']} by default, 15 min, alert at start). On a later night, snooze the alert in Calendar – no need to edit the event. Times are in Settings → Evening shutdown.</p>
            <button className="btn" onClick={addCalendar}><Icon name="calendar" size={16} /> Add shutdown reminders to Calendar</button>
          </section>
        )}
      </div>
    </div>
  );
}
