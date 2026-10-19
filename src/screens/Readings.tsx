/** Reading list (#/readings): items with kind, due dates from the timetable, progress, Reading timer; News tab. */
import { useEffect, useMemo, useState } from 'react';
import { useStored } from '../core/kv';
import { loadCalendar, occurrences } from '../core/calendar';
import { focusSubject } from '../core/today';
import { initFocus, startTimer, useFocus } from '../core/focusStore';
import { defaultDue, KINDS, newReading, setProgress, sortReadings, type Reading, type ReadingKind } from '../core/readings';
import { useCanvas } from '../core/canvas';
import { navigate } from '../lib/router';
import { Sheet } from '../components/Sheet';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { NewsTab } from './News';

const fmt = (s: string) => (s ? new Date(`${s}T12:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '–');

export function Readings() {
  const [list, setList] = useStored<Reading[]>('readings', []);
  const f = useFocus();
  const canvas = useCanvas();
  const [tab, setTab] = useState<'list' | 'news'>('list');
  const [edit, setEdit] = useState<Reading | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [lectures, setLectures] = useState<Array<{ subject: string; start: number; end: number }>>([]);
  useEffect(initFocus, []);
  useEffect(() => {
    void loadCalendar().then((c) => {
      if (!c) return;
      const now = Date.now();
      setLectures(occurrences(c.events, now - 60 * 86_400_000, now + 90 * 86_400_000).filter((o) => !o.allDay).map((o) => ({ subject: focusSubject(o.title), start: o.start, end: o.end })));
    });
  }, []);
  const now = Date.now();
  const shown = useMemo(() => sortReadings(list).filter((r) => showDone || r.status !== 'done'), [list, showDone]);
  const save = (r: Reading) => {
    const withDue = r.due || !r.course ? r : { ...r, due: defaultDue(r.kind, r.course, lectures, now) };
    setList(list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? withDue : x)) : [...list, withDue]);
    setEdit(null);
  };
  const update = (r: Reading) => setList(list.map((x) => (x.id === r.id ? r : x)));
  const fromCanvas = (canvas.inbox?.readings ?? []).filter((c) => !list.some((r) => r.id === `canvas-${c.id}`));

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow"><h1>Reading list</h1><div className="muted" style={{ marginTop: 4 }}>Pre-lecture readings default to the next lecture, post-lecture ones to 2 days after.</div></div>
        <button className="btn btn-primary" onClick={() => setEdit(newReading({ course: f.subjects[0] ?? '' }))}>+ Add</button>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className={`chip${tab === 'list' ? ' on' : ''}`} onClick={() => setTab('list')}>Readings ({list.filter((r) => r.status !== 'done').length})</button>
        <button className={`chip${tab === 'news' ? ' on' : ''}`} onClick={() => setTab('news')}>News</button>
        <span className="spacer" />
        {tab === 'list' && <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show done</label>}
      </div>

      {tab === 'news' ? <NewsTab onSave={(title, link, source) => setList([...list, newReading({ title, source: link || source, kind: 'optional', course: '' })])} /> : (
        <>
          {fromCanvas.length > 0 && (
            <section className="glass" style={{ marginBottom: 12 }}>
              <div className="glass-head"><h2>From Canvas</h2><span className="faint tiny">suggested by the Mac job</span></div>
              <ul className="today-list">
                {fromCanvas.map((c) => (
                  <li key={c.id} className="today-row"><div className="grow"><div className="today-title">{c.title}</div><div className="today-meta">{c.subject} · {c.where}</div></div>
                    <button className="btn btn-sm btn-primary" onClick={() => setEdit(newReading({ id: `canvas-${c.id}`, title: c.title, course: focusSubject(c.subject), source: `Canvas: ${c.where}`, kind: 'pre' }))}>Add</button></li>
                ))}
              </ul>
            </section>
          )}
          <section className="glass">
            {shown.length === 0 ? <EmptyState icon="book" title="No readings yet" hint="Add a reading, or accept one suggested from Canvas." /> : (
              <ul className="today-list">
                {shown.map((r) => (
                  <li key={r.id} className="today-row app-row">
                    <div className="grow">
                      <div className="today-title" style={r.status === 'done' ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>{r.title}</div>
                      <div className="today-meta">{[r.course || null, KINDS.find((k) => k.id === r.kind)?.label, r.due ? `due ${fmt(r.due)}` : null, r.pages ? `p. ${r.pages}` : null, r.source || null].filter(Boolean).join(' · ')}</div>
                      <div className="week-track" style={{ marginTop: 6, maxWidth: 220 }} aria-label={`${r.progress}% read`}><i style={{ width: `${r.progress}%` }} /></div>
                    </div>
                    <span className="row" style={{ gap: 6 }}>
                      {r.status !== 'done' && <>
                        <button className="btn btn-sm" onClick={() => update(setProgress(r, r.progress + 25))}>+25%</button>
                        <button className="btn btn-sm" onClick={() => { startTimer(r.course || 'Reading', 'study', Date.now(), 'reading'); update(r.status === 'todo' ? { ...r, status: 'reading' } : r); navigate('/focus'); }} title="Start a Reading timer">Read</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => update(setProgress(r, 100))} aria-label="Mark done"><Icon name="check" size={14} /></button>
                      </>}
                      <button className="btn btn-sm btn-ghost" onClick={() => setEdit(r)} aria-label={`Edit ${r.title}`}><Icon name="pen" size={14} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {edit && <EditSheet r={edit} subjects={f.subjects} lectures={lectures} isNew={!list.some((x) => x.id === edit.id)} onSave={save} onClose={() => setEdit(null)} onDelete={() => { setList(list.filter((x) => x.id !== edit.id)); setEdit(null); }} />}
    </div>
  );
}

function EditSheet({ r, subjects, lectures, isNew, onSave, onClose, onDelete }: { r: Reading; subjects: string[]; lectures: Array<{ subject: string; start: number; end: number }>; isNew: boolean; onSave: (r: Reading) => void; onClose: () => void; onDelete: () => void }) {
  const [x, setX] = useState(r);
  const [dueTouched, setDueTouched] = useState(!!r.due);
  const set = <K extends keyof Reading>(k: K, v: Reading[K]) => setX((p) => ({ ...p, [k]: v }));
  const suggested = defaultDue(x.kind, x.course, lectures, Date.now());
  const f = (label: string, el: React.ReactNode) => <label className="stack small" style={{ '--gap': '4px' } as React.CSSProperties}><span className="faint">{label}</span>{el}</label>;
  return (
    <Sheet title={isNew ? 'Add reading' : 'Edit reading'} onClose={onClose}>
      <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        {f('Title', <input className="input" value={x.title} onChange={(e) => set('title', e.target.value)} />)}
        <div className="app-grid">
          {f('Course', <select className="input" value={x.course} onChange={(e) => set('course', e.target.value)}><option value="">–</option>{[...new Set([...subjects, x.course].filter(Boolean))].map((s) => <option key={s} value={s}>{s}</option>)}</select>)}
          {f('Kind', <select className="input" value={x.kind} onChange={(e) => set('kind', e.target.value as ReadingKind)}>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>)}
          {f('Source (Canvas file, link, or book + chapter)', <input className="input" value={x.source} onChange={(e) => set('source', e.target.value)} />)}
          {f('Pages', <input className="input" value={x.pages} onChange={(e) => set('pages', e.target.value)} placeholder="12–40" />)}
          {f('Due', <input className="input" type="date" value={dueTouched ? x.due : x.due || ''} onChange={(e) => { setDueTouched(true); set('due', e.target.value); }} />)}
          {f(`Progress ${x.progress}%`, <input type="range" min={0} max={100} step={5} value={x.progress} onChange={(e) => setX(setProgress(x, Number(e.target.value)))} aria-label="Progress" />)}
        </div>
        {!x.due && suggested && <div className="faint tiny">Left empty, the due date becomes {fmt(suggested)} ({x.kind === 'pre' ? 'next lecture' : '2 days after the last lecture'}).</div>}
        <div className="row"><button className="btn btn-primary" disabled={!x.title.trim()} onClick={() => onSave({ ...x, title: x.title.trim() })}>Save</button>{!isNew && <button className="btn btn-danger" onClick={onDelete}>Delete</button>}</div>
      </div>
    </Sheet>
  );
}
