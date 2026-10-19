/** "Plan my week": copy a prompt with your data into Claude, paste the JSON answer back, review, add to your plan. */
import { useMemo, useState } from 'react';
import { useApp } from '../../core/store';
import { useDueCounts } from '../../core/hooks';
import { useStored } from '../../core/kv';
import { dayWindow, minutesOf, useFocus } from '../../core/focusStore';
import { hoursBySubject, weekStart, type PlannedBlock, type Targets } from '../../core/targets';
import { mergePlanned, parsePlan, planPrompt } from '../../core/plan';
import type { Todo } from '../../core/todos';
import { COURSES } from '../../courses';
import { COURSE_SUBJECT } from '../../core/today';
import { logHistory } from '../../core/history';
import { hhmm } from '../../screens/FocusWidget';
import { Sheet } from '../Sheet';
import { Icon } from '../Icon';
import type { useToday } from '../todayData';

export function PlanSheet({ t, onClose, report }: { t: Today; onClose: () => void; report?: string }) {
  const settings = useApp((s) => s.settings);
  const due = useDueCounts();
  const focus = useFocus();
  const [targets] = useStored<Targets>('focus:targets', {});
  const [todos] = useStored<Todo[]>('todos', []);
  const [planned, setPlanned] = useStored<PlannedBlock[]>('today:planned', []);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const now = Date.now();
  const [ws, we] = dayWindow(now);
  const prompt = useMemo(() => {
    const done = hoursBySubject(focus.sessions, weekStart(now));
    const base = planPrompt({
      now, dayStart: focus.prefs.dayStart, dayEnd: focus.prefs.dayEnd,
      lectures: t.lectures.filter((l) => !l.allDay && l.end > now && l.start < now + 8 * 86_400_000).map((l) => ({ title: l.title, start: l.start, end: l.end })),
      deadlines: t.shown.filter((i) => i.kind === 'deadline' || i.kind === 'suggestion').map((i) => ({ title: i.title, subject: i.subject, due: i.due })),
      exams: COURSES.flatMap((c) => (settings.examDates?.[c.id] ? [{ subject: COURSE_SUBJECT[c.id] ?? c.name, date: settings.examDates[c.id] }] : [])),
      targets: Object.entries(targets).map(([subject, target]) => ({ subject, target, done: done[subject] ?? 0 })),
      dueCards: due.total, todos: todos.filter((x) => !x.done).map((x) => x.text + (x.due ? ` (bis ${x.due})` : '')),
    });
    return report ? `${base}\n\nBericht der letzten Woche (Stunden, Karten, Abgaben) – nutze ihn, um die nächste Woche neu zu gewichten:\n${report}` : base;
  }, [report, t.lectures, t.shown, focus.sessions, focus.prefs, settings.examDates, targets, todos, due.total, now]);
  const parsed = useMemo(() => (text.trim() ? parsePlan(text, now, minutesOf(focus.prefs.dayStart), minutesOf(focus.prefs.dayEnd)) : null), [text, now, focus.prefs]);

  const copy = async () => {
    const ok = await navigator.clipboard?.writeText(prompt).then(() => true, () => false);
    window.open(settings.tutorUrls?.general || 'https://claude.ai/new', '_blank', 'noopener');
    setNote(ok ? 'Prompt copied – paste it into Claude (⌘V), then paste the answer below.' : 'Claude opened, but copying was blocked – select the prompt below and copy it by hand.');
  };
  const add = () => {
    if (!parsed?.blocks.length) return;
    setPlanned(mergePlanned(planned, parsed.blocks, now));
    logHistory('tutor', `Weekly plan added: ${parsed.blocks.length} blocks`);
    onClose();
  };
  void ws; void we;

  return (
    <Sheet title={report ? "Plan next week" : "Plan my week"} onClose={onClose}>
      <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <p className="muted small" style={{ margin: 0 }}>No AI inside the app: you ask Claude yourself. Step 1 copies a prompt with your lectures, deadlines, exams, targets and to-dos. Step 2 takes Claude’s answer back.</p>
        <div className="row"><button className="btn btn-primary" onClick={() => void copy()}><Icon name="sparkle" size={16} /> 1 · Copy prompt and open Claude</button></div>
        {note && <div className="notice small" role="status">{note}</div>}
        <details><summary className="small faint">Show the prompt</summary><textarea className="input" readOnly value={prompt} style={{ minHeight: 160 }} aria-label="Prompt" /></details>
        <label className="stack small" style={{ '--gap': '6px' } as React.CSSProperties}>
          <b>2 · Paste Claude’s answer</b>
          <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder='{"blocks":[…]}' />
        </label>
        {parsed && (
          <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            {parsed.blocks.length > 0 && (
              <ul className="today-list">
                {parsed.blocks.map((b) => (
                  <li key={b.id} className="today-row">
                    <span className="today-time">{new Date(b.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}<br />{hhmm(b.start)}–{hhmm(b.end)}</span>
                    <div className="grow"><b>{b.subject}</b>{b.note && <div className="today-meta">{b.note}</div>}</div>
                  </li>
                ))}
              </ul>
            )}
            {parsed.problems.map((p) => <div key={p} className="faint tiny">⚠ {p}</div>)}
            <div className="row"><button className="btn btn-primary" disabled={!parsed.blocks.length} onClick={add}>3 · Add {parsed.blocks.length} block{parsed.blocks.length === 1 ? '' : 's'} to my plan</button></div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
type Today = ReturnType<typeof useToday>;
