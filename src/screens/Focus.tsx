import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { effectiveMs } from '../core/focus';
import { addManual, deleteSession, importSessions, initFocus, startLecture, useFocus } from '../core/focusStore';
import { dayKey, formatDuration } from '../lib/date';
import { FocusPanel, openFocusPip, pipSupported, useNow } from './FocusWidget';
import { Lectures } from './Lectures';

const QUICK = [15, 30, 45, 60, 90, 120];
const pad = (n: number) => String(n).padStart(2, '0');
const timeNow = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function Focus() {
  const f = useFocus();
  const [msg, setMsg] = useState('');
  const [minutes, setMinutes] = useState('');
  const [date, setDate] = useState(dayKey());
  const [endTime, setEndTime] = useState(timeNow());
  const [manualSubject, setManualSubject] = useState('');
  const [manualKind, setManualKind] = useState<'study' | 'lecture'>('study');
  const file = useRef<HTMLInputElement>(null);
  useEffect(initFocus, []);

  const running = !!f.active;
  const now = useNow(running);
  const week = useMemo(() => {
    const cutoff = dayKey(new Date(Date.now() - 6 * 86400_000));
    const by = new Map<string, number>();
    f.sessions.filter((s) => s.day >= cutoff).forEach((s) => by.set(s.subject, (by.get(s.subject) ?? 0) + s.effectiveSec));
    return [...by.entries()].sort((a, b) => b[1] - a[1]);
  }, [f.sessions]);
  const maxSec = Math.max(1, ...week.map((w) => w[1]));
  const today = f.sessions.filter((s) => s.day === dayKey()).reduce((n, s) => n + s.effectiveSec, 0) + (f.active ? Math.round(effectiveMs(f.active, now) / 1000) : 0);
  const recent = [...f.sessions].reverse().slice(0, 12);
  const subject = manualSubject || f.selected;

  const addByHand = () => {
    const m = parseFloat(minutes.replace(',', '.'));
    if (!subject) return setMsg('Pick a subject for the entry first.');
    if (!(m > 0)) return setMsg('Choose or enter the minutes first.');
    const end = new Date(`${date}T${endTime || '12:00'}`).getTime();
    if (Number.isNaN(end)) return setMsg('That date or time is not valid.');
    addManual(manualKind, subject, m, end);
    setMinutes('');
    setMsg(`Added ${m} min of ${subject} on ${date}.`);
  };
  const importFile = async (file: File) => {
    try {
      setMsg(`Imported ${importSessions(await file.text())} sessions from Focus Log.`);
    } catch {
      setMsg('That file is not a Focus Log sessions.json.');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Focus</h1>
          <div className="muted" style={{ marginTop: 4 }}>Log lectures and self-study. Today: {formatDuration(today * 1000)}.</div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => void openFocusPip()} title={pipSupported() ? 'Small always-on-top window' : 'Small separate window'}>
            <Icon name="laptop" size={16} /> Mini window
          </button>
          <a className="btn" href="#/focus-widget" target="_blank" rel="noreferrer">Widget in new tab</a>
        </div>
      </div>

      <section className="card card-pad">
        <FocusPanel onSaved={setMsg} />
      </section>

      <Lectures busy={running} onStart={startLecture} />

      <div className="section">
        <div className="section-head"><h2>Last 7 days by subject</h2></div>
        <div className="card card-pad">
          {week.length === 0 ? (
            <p className="muted small">Nothing logged yet.</p>
          ) : (
            week.map(([s, sec]) => (
              <div key={s} style={{ marginBottom: 10 }}>
                <div className="row small" style={{ justifyContent: 'space-between' }}><span>{s}</span><span className="muted">{formatDuration(sec * 1000)}</span></div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--track)', overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: `${(sec / maxSec) * 100}%`, height: '100%', background: 'var(--accent)' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>Add time by hand</h2></div>
        <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="picker-chips">
            {f.subjects.map((s) => (
              <button key={s} className={`chip${subject === s ? ' on' : ''}`} aria-pressed={subject === s} onClick={() => setManualSubject(s)}>{s}</button>
            ))}
          </div>
          <div className="row">
            {QUICK.map((q) => (
              <button key={q} className={`chip${minutes === String(q) ? ' on' : ''}`} onClick={() => setMinutes(String(q))}>{q} min</button>
            ))}
            <input className="input" style={{ width: 110 }} inputMode="decimal" placeholder="other min" value={QUICK.map(String).includes(minutes) ? '' : minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Minutes" />
          </div>
          <div className="row">
            <label className="small muted row" style={{ gap: 6 }}>Day <input className="input" type="date" value={date} max={dayKey()} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="small muted row" style={{ gap: 6 }}>Ended at <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
            <button className={`chip${manualKind === 'study' ? ' on' : ''}`} onClick={() => setManualKind('study')}>Self-study</button>
            <button className={`chip${manualKind === 'lecture' ? ' on' : ''}`} onClick={() => setManualKind('lecture')}>Lecture</button>
          </div>
          <div className="row">
            <button className="btn btn-primary" onClick={addByHand}>Add</button>
            <span className="spacer" />
            <button className="btn" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Import Focus Log file</button>
            <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ''; if (x) void importFile(x); }} />
          </div>
          {msg && <div className="notice good small">{msg}</div>}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="section">
          <div className="section-head"><h2>Recent</h2></div>
          <div className="card table-wrap">
            <table className="table">
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td>{s.day}</td>
                    <td>{s.subject}{s.kind === 'lecture' && <span className="faint small"> lecture</span>}</td>
                    <td>{formatDuration(s.effectiveSec * 1000)}</td>
                    <td style={{ width: 44 }}>
                      <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Delete session" onClick={() => confirm('Delete this session?') && deleteSession(s.id)}>
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
