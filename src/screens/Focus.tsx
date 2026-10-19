/**
 * Focus: log every lecture and study hour. Timer with a radial subject picker, today's timeline with
 * gaps you can fill in one tap, add / edit dialogs, reminders and the lecture timetable.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { coverage, effectiveMs, gaps, overlapping, sessionFromTimes, sessionIntervals, type FocusSession } from '../core/focus';
import {
  addSubject, dayWindow, deleteSession, enableNotifications, importSessions, initFocus, removeSubject, saveSession, setPrefs, startLecture, useFocus,
} from '../core/focusStore';
import { dayKey, formatDuration } from '../lib/date';
import { FocusPanel, hhmm, openFocusPip, pipSupported, subjectColor, useNow } from './FocusWidget';
import { Lectures } from './Lectures';

const pad = (n: number) => String(n).padStart(2, '0');
const timeOf = (ms: number) => `${pad(new Date(ms).getHours())}:${pad(new Date(ms).getMinutes())}`;
const at = (day: string, time: string) => new Date(`${day}T${time || '00:00'}`).getTime();

interface Draft { id?: string; subject: string; kind: 'study' | 'lecture'; start: number; end: number }

export function Focus() {
  const f = useFocus();
  useEffect(initFocus, []);
  const [msg, setMsg] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [undo, setUndo] = useState<FocusSession | null>(null);
  const undoTimer = useRef<number>(0);
  const file = useRef<HTMLInputElement>(null);
  const now = useNow(true);

  // today's timeline
  const [from, to] = dayWindow(now);
  const until = Math.min(now, to);
  const todays = f.sessions.filter((s) => s.day === dayKey());
  const intervals = useMemo(() => {
    const list = todays.flatMap(sessionIntervals);
    if (f.active) list.push(...f.active.segs.map((g) => [g.s, g.e ?? now] as [number, number]));
    return list;
  }, [todays, f.active, now]);
  const cover = coverage(intervals, from, until);
  const holes = gaps(intervals, from, until);
  const lastGap = holes[holes.length - 1];

  const week = useMemo(() => {
    const cutoff = dayKey(new Date(Date.now() - 6 * 86400_000));
    const by = new Map<string, number>();
    f.sessions.filter((s) => s.day >= cutoff).forEach((s) => by.set(s.subject, (by.get(s.subject) ?? 0) + s.effectiveSec));
    return [...by.entries()].sort((a, b) => b[1] - a[1]);
  }, [f.sessions]);
  const maxSec = Math.max(1, ...week.map((w) => w[1]));
  const recent = [...f.sessions].reverse().slice(0, 15);
  const todayTotal = todays.reduce((n, s) => n + s.effectiveSec, 0) + (f.active ? Math.round(effectiveMs(f.active, now) / 1000) : 0);

  const lastSubject = f.sessions[f.sessions.length - 1]?.subject ?? f.subjects[0] ?? '';
  const addNew = (start?: number, end?: number) => {
    const e = end ?? Date.now();
    setDraft({ subject: lastSubject, kind: 'study', start: start ?? e - 45 * 60_000, end: e });
  };
  const remove = (s: FocusSession) => {
    deleteSession(s.id);
    setUndo(s);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), 8000);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Focus</h1>
          <div className="muted" style={{ marginTop: 4 }}>Log every lecture and study hour. Today: {formatDuration(todayTotal * 1000)}. <a href="#/">What to do next →</a></div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => void openFocusPip()} title={pipSupported() ? 'Small always-on-top window' : 'Small separate window'}>
            <Icon name="laptop" size={16} /> Mini window
          </button>
          <a className="btn" href="#/focus-widget" target="_blank" rel="noreferrer">Widget tab</a>
        </div>
      </div>

      <section className="card card-pad">
        <FocusPanel onSaved={setMsg} onLogGap={lastGap ? () => addNew(lastGap[0], lastGap[1]) : () => addNew()} />
        {msg && <div className="notice good small" style={{ marginTop: 12 }}>{msg}</div>}
      </section>

      <div className="section">
        <div className="section-head">
          <h2>Today</h2>
          <span className="spacer" />
          <span className={cover >= 0.8 ? 'cover-good' : 'faint'}><b>{Math.round(cover * 100)}%</b> of {f.prefs.dayStart}–{timeOf(until)} logged</span>
        </div>
        <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="timeline" role="img" aria-label={`Timeline ${f.prefs.dayStart} to ${f.prefs.dayEnd}`}>
            {mergeForDisplay(todays, f.active, now).map((b, i) => (
              <span key={i} className="tl-block" style={{ left: pct(b.s, from, to), width: pct(b.e, from, to, b.s), background: subjectColor(b.subject) }} title={`${b.subject} ${hhmm(b.s)}–${hhmm(b.e)}`} />
            ))}
            {holes.map(([a, b]) => (
              <button key={a} className="tl-gap" style={{ left: pct(a, from, to), width: pct(b, from, to, a) }} onClick={() => addNew(a, b)} title={`Gap ${hhmm(a)}–${hhmm(b)} – tap to fill`} aria-label={`Fill gap ${hhmm(a)} to ${hhmm(b)}`} />
            ))}
            {now < to && now > from && <span className="tl-now" style={{ left: pct(now, from, to) }} />}
          </div>
          <div className="row faint tiny" style={{ justifyContent: 'space-between' }}>
            <span>{f.prefs.dayStart}</span>
            <span>{f.prefs.dayEnd}</span>
          </div>
          {holes.length > 0 ? (
            <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
              {holes.map(([a, b]) => (
                <div key={a} className="row small" style={{ justifyContent: 'space-between' }}>
                  <span>Gap {hhmm(a)}–{hhmm(b)} <span className="faint">({formatDuration(b - a)})</span></span>
                  <button className="btn btn-sm" onClick={() => addNew(a, b)}><Icon name="pen" size={14} /> Fill</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="small muted">No gaps so far today.</div>
          )}
          <div className="row small muted">
            <label className="row" style={{ gap: 6 }}>Day from <input className="input" type="time" value={f.prefs.dayStart} onChange={(e) => setPrefs({ dayStart: e.target.value })} /></label>
            <label className="row" style={{ gap: 6 }}>to <input className="input" type="time" value={f.prefs.dayEnd} onChange={(e) => setPrefs({ dayEnd: e.target.value })} /></label>
          </div>
        </div>
      </div>

      <Lectures busy={!!f.active} onStart={startLecture} />

      <div className="section">
        <div className="section-head">
          <h2>Entries</h2>
          <span className="spacer" />
          <button className="btn btn-primary btn-sm" onClick={() => addNew()}><Icon name="sparkle" size={14} /> Add time</button>
        </div>
        <div className="card">
          {recent.length === 0 ? (
            <p className="muted small card-pad">Nothing logged yet.</p>
          ) : (
            recent.map((s) => {
              const a = sessionIntervals(s)[0]?.[0] ?? Date.parse(s.start);
              return (
                <div key={s.id} className="entry-row">
                  <span className="dot" style={{ background: subjectColor(s.subject) }} />
                  <span className="grow">
                    <b>{s.subject}</b>
                    {s.kind === 'lecture' && <span className="faint small"> lecture</span>}
                    <div className="faint tiny">{s.day} · {hhmm(a)}–{hhmm(Date.parse(s.end))}</div>
                  </span>
                  <span className="small">{formatDuration(s.effectiveSec * 1000)}</span>
                  <button className="icon-btn" aria-label={`Edit ${s.subject} entry`} onClick={() => setDraft({ id: s.id, subject: s.subject, kind: s.kind, start: Date.parse(s.start), end: Date.parse(s.end) })}>
                    <Icon name="pen" size={16} />
                  </button>
                  <button className="icon-btn" aria-label={`Delete ${s.subject} entry`} onClick={() => remove(s)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Last 7 days</h2></div>
        <div className="card card-pad">
          {week.length === 0 ? (
            <p className="muted small">Nothing logged yet.</p>
          ) : (
            week.map(([s, sec]) => (
              <div key={s} style={{ marginBottom: 10 }}>
                <div className="row small" style={{ justifyContent: 'space-between' }}><span>{s}</span><span className="muted">{formatDuration(sec * 1000)}</span></div>
                <div className="bar-track"><div style={{ width: `${(sec / maxSec) * 100}%`, background: subjectColor(s) }} /></div>
              </div>
            ))
          )}
        </div>
      </div>

      <Reminders />

      <div className="section">
        <div className="section-head"><h2>Subjects</h2></div>
        <Subjects />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-sm" onClick={() => file.current?.click()}><Icon name="upload" size={15} /> Import Focus Log file</button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const x = e.target.files?.[0];
              e.target.value = '';
              if (!x) return;
              try {
                setMsg(`Imported ${importSessions(await x.text())} sessions from Focus Log.`);
              } catch {
                setMsg('That file is not a Focus Log sessions.json.');
              }
            }}
          />
        </div>
      </div>

      {draft && <EntrySheet draft={draft} onClose={() => setDraft(null)} onDelete={(s) => { remove(s); setDraft(null); }} />}

      {undo && (
        <div className="toast" role="status">
          Deleted {undo.subject} ({formatDuration(undo.effectiveSec * 1000)})
          <button className="btn btn-sm" onClick={() => { saveSession(undo); setUndo(null); }}><Icon name="undo" size={14} /> Undo</button>
        </div>
      )}
    </div>
  );
}

const pct = (t: number, from: number, to: number, start?: number) =>
  start === undefined ? `${((Math.max(from, Math.min(t, to)) - from) / (to - from)) * 100}%` : `${((Math.min(t, to) - Math.max(start, from)) / (to - from)) * 100}%`;

function mergeForDisplay(sessions: FocusSession[], active: ReturnType<typeof useFocus>['active'], now: number) {
  const out = sessions.flatMap((s) => sessionIntervals(s).map(([a, b]) => ({ s: a, e: b, subject: s.subject })));
  if (active) out.push(...active.segs.map((g) => ({ s: g.s, e: g.e ?? now, subject: active.subject })));
  return out;
}

/** Add and edit are two different dialogs: own title, icon and colour; fields prefilled. */
function EntrySheet({ draft, onClose, onDelete }: { draft: Draft; onClose: () => void; onDelete: (s: FocusSession) => void }) {
  const f = useFocus();
  const editing = !!draft.id;
  const original = editing ? f.sessions.find((s) => s.id === draft.id) : undefined;
  const [subject, setSubject] = useState(draft.subject);
  const [newSubject, setNewSubject] = useState('');
  const [kind, setKind] = useState(draft.kind);
  const [day, setDay] = useState(dayKey(draft.start));
  const [start, setStart] = useState(timeOf(draft.start));
  const [end, setEnd] = useState(timeOf(draft.end));
  const startMs = at(day, start);
  let endMs = at(day, end);
  if (endMs <= startMs) endMs += 86400_000; // past midnight
  const minutes = Math.round((endMs - startMs) / 60_000);
  const name = subject === '__new' ? newSubject.trim() : subject;
  const clash = overlapping(f.sessions, startMs, endMs, draft.id);
  const setDuration = (m: number) => setEnd(timeOf(startMs + m * 60_000));
  const save = () => {
    if (!name) return;
    if (subject === '__new') addSubject(name);
    saveSession(sessionFromTimes(kind, name, startMs, endMs, draft.id ?? `m${startMs}`));
    onClose();
  };

  return (
    <Sheet
      title={
        <span className={`row entry-title ${editing ? 'edit' : 'add'}`} style={{ gap: 10 }}>
          <span className="entry-badge"><Icon name={editing ? 'pen' : 'sparkle'} size={16} /></span>
          {editing ? 'Edit entry' : 'Add time'}
        </span>
      }
      onClose={onClose}
    >
      <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <div className="row">
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" style={{ flex: '1 1 180px' }}>
            {f.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="__new">New subject…</option>
          </select>
          <button className={`chip${kind === 'study' ? ' on' : ''}`} onClick={() => setKind('study')}>Self-study</button>
          <button className={`chip${kind === 'lecture' ? ' on' : ''}`} onClick={() => setKind('lecture')}>Lecture</button>
        </div>
        {subject === '__new' && <input className="input" autoFocus placeholder="Subject name" value={newSubject} maxLength={40} onChange={(e) => setNewSubject(e.target.value)} />}
        <div className="row">
          <label className="small muted row" style={{ gap: 6 }}>Day <input className="input" type="date" value={day} max={dayKey()} onChange={(e) => setDay(e.target.value)} /></label>
          <label className="small muted row" style={{ gap: 6 }}>Start <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="small muted row" style={{ gap: 6 }}>End <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>
        <div className="row">
          <span className="small muted">Duration</span>
          {[15, 30, 45, 60, 90, 120].map((m) => (
            <button key={m} className={`chip${minutes === m ? ' on' : ''}`} onClick={() => setDuration(m)}>{m < 60 ? `${m} min` : `${m / 60} h`}</button>
          ))}
          <input className="input" style={{ width: 90 }} inputMode="numeric" aria-label="Duration in minutes" value={String(minutes)} onChange={(e) => setDuration(Number(e.target.value.replace(/\D/g, '')) || 0)} />
        </div>
        {clash.length > 0 && (
          <div className="notice warn small">
            Overlaps with {clash.map((c) => `${c.subject} ${hhmm(Date.parse(c.start))}–${hhmm(Date.parse(c.end))}`).join(', ')}. Saving keeps both.
          </div>
        )}
        {editing && original && original.pauses > 0 && <div className="faint tiny">This entry had {original.pauses} pause(s); saving new times counts the whole span.</div>}
        <div className="row">
          <button className="btn btn-primary" onClick={save} disabled={!name || minutes <= 0}>{editing ? 'Save changes' : `Add ${formatDuration(minutes * 60_000)}`}</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <span className="spacer" />
          {editing && original && <button className="btn btn-danger" onClick={() => onDelete(original)}><Icon name="trash" size={15} /> Delete</button>}
        </div>
      </div>
    </Sheet>
  );
}

function Reminders() {
  const { prefs } = useFocus();
  const [perm, setPerm] = useState<string>(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  return (
    <div className="section">
      <div className="section-head"><h2>Reminders</h2></div>
      <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <label className="row small">
          <input type="checkbox" checked={prefs.remind} onChange={(e) => setPrefs({ remind: e.target.checked })} />
          Remind me when no timer has run for
          <select className="input" value={prefs.remindMin} onChange={(e) => setPrefs({ remindMin: Number(e.target.value) })}>
            {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
          between {prefs.dayStart} and {prefs.dayEnd}
        </label>
        <label className="row small">
          Ask “still on it?” every
          <select className="input" value={prefs.checkMin} onChange={(e) => setPrefs({ checkMin: Number(e.target.value) })}>
            <option value={0}>never</option>
            {[25, 50, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
          – without an answer the timer stops counting after 5 minutes.
        </label>
        <div className="row small">
          {perm === 'granted' ? (
            <span className="muted">System notifications are on.</span>
          ) : perm === 'unsupported' ? (
            <span className="muted">This browser can’t show system notifications – reminders appear inside the app.</span>
          ) : (
            <button className="btn btn-sm" onClick={async () => setPerm(await enableNotifications())}><Icon name="info" size={14} /> Turn on system notifications</button>
          )}
        </div>
        <p className="faint tiny">Reminders work while the app is open in a tab, the widget or the mini window. Closing every window stops them – a web app can’t wake itself.</p>
      </div>
    </div>
  );
}

function Subjects() {
  const f = useFocus();
  const [name, setName] = useState('');
  return (
    <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <div className="picker-chips">
        {f.subjects.map((s) => (
          <span key={s} className="chip">
            <span className="dot" style={{ background: subjectColor(s) }} />
            {s}
            <button className="chip-x" aria-label={`Remove ${s}`} onClick={() => removeSubject(s)}><Icon name="x" size={12} /></button>
          </span>
        ))}
      </div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); addSubject(name); setName(''); }}>
        <input className="input" style={{ flex: '1 1 200px' }} placeholder="Add a subject" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="New subject" />
        <button className="btn btn-sm" type="submit" disabled={!name.trim()}>Add</button>
      </form>
    </div>
  );
}
