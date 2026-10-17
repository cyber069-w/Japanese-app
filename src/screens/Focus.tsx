import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import {
  FOCUS_SUBJECTS, effectiveMs, finishFocus, isRunning, loadActive, loadSessions, manualSession, mergeSessions, pauseFocus, resumeFocus,
  saveActive, saveSessions, startFocus, type ActiveFocus, type FocusSession,
} from '../core/focus';
import { dayKey, formatDuration } from '../lib/date';

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export function Focus() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [active, setActive] = useState<ActiveFocus | null>(null);
  const [subject, setSubject] = useState(FOCUS_SUBJECTS[0]);
  const [other, setOther] = useState('');
  const [kind, setKind] = useState<'study' | 'lecture'>('study');
  const [minutes, setMinutes] = useState('');
  const [msg, setMsg] = useState('');
  const [now, setNow] = useState(Date.now());
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadSessions().then(setSessions);
    void loadActive().then(setActive);
  }, []);
  useEffect(() => {
    if (!active || !isRunning(active)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const name = subject === 'Other' ? other.trim() || 'Other' : subject;
  const update = (a: ActiveFocus | null) => {
    setActive(a);
    void saveActive(a);
  };
  const store = (list: FocusSession[]) => {
    setSessions(list);
    void saveSessions(list);
  };
  const toggle = () => {
    const t = Date.now();
    setNow(t);
    update(!active ? startFocus(kind, name, t) : isRunning(active) ? pauseFocus(active, t) : resumeFocus(active, t));
  };
  const stop = () => {
    if (!active) return;
    const s = finishFocus(active, Date.now());
    update(null);
    if (s.effectiveSec >= 10) store([...sessions, s]);
    setMsg(`Saved ${formatDuration(s.effectiveSec * 1000)} of ${s.subject}.`);
  };
  const addManual = () => {
    const m = parseFloat(minutes.replace(',', '.'));
    if (!(m > 0)) return setMsg('Enter the minutes first.');
    store([...sessions, manualSession(kind, name, m, Date.now())]);
    setMinutes('');
    setMsg(`Added ${m} min of ${name}.`);
  };
  const importFile = async (f: File) => {
    try {
      const { merged, added } = mergeSessions(sessions, await f.text());
      store(merged);
      setMsg(`Imported ${added} sessions from Focus Log.`);
    } catch {
      setMsg('That file is not a Focus Log sessions.json.');
    }
  };

  const week = useMemo(() => {
    const cutoff = dayKey(new Date(Date.now() - 6 * 86400_000));
    const by = new Map<string, number>();
    sessions.filter((s) => s.day >= cutoff).forEach((s) => by.set(s.subject, (by.get(s.subject) ?? 0) + s.effectiveSec));
    return [...by.entries()].sort((a, b) => b[1] - a[1]);
  }, [sessions]);
  const maxSec = Math.max(1, ...week.map((w) => w[1]));
  const today = sessions.filter((s) => s.day === dayKey()).reduce((n, s) => n + s.effectiveSec, 0) + (active ? Math.round(effectiveMs(active, now) / 1000) : 0);
  const recent = [...sessions].reverse().slice(0, 12);

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Focus</h1>
          <div className="muted" style={{ marginTop: 4 }}>Log lectures and self-study. Today: {formatDuration(today * 1000)}.</div>
        </div>
      </div>

      <section className="card card-pad stack" style={{ '--gap': '14px', textAlign: 'center' } as React.CSSProperties}>
        <div style={{ fontSize: '3.4rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }} aria-live="off">
          {clock(active ? effectiveMs(active, now) : 0)}
        </div>
        <div className="muted small">{active ? `${active.kind === 'lecture' ? 'Lecture · ' : ''}${active.subject}${isRunning(active) ? '' : ' · paused'}` : 'Choose a subject and start'}</div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={toggle}>
            <Icon name={active && isRunning(active) ? 'stop' : 'play'} size={16} /> {!active ? 'Start' : isRunning(active) ? 'Pause' : 'Resume'}
          </button>
          {active && <button className="btn" onClick={stop}>Finish and save</button>}
        </div>
        {!active && (
          <>
            <div className="picker-chips" style={{ justifyContent: 'center' }}>
              {[...FOCUS_SUBJECTS, 'Other'].map((s) => (
                <button key={s} className={`chip${subject === s ? ' on' : ''}`} aria-pressed={subject === s} onClick={() => setSubject(s)}>
                  {s}
                </button>
              ))}
            </div>
            {subject === 'Other' && <input className="input" placeholder="What are you working on?" value={other} maxLength={40} onChange={(e) => setOther(e.target.value)} />}
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className={`chip${kind === 'study' ? ' on' : ''}`} onClick={() => setKind('study')}>Self-study</button>
              <button className={`chip${kind === 'lecture' ? ' on' : ''}`} onClick={() => setKind('lecture')}>Lecture</button>
            </div>
          </>
        )}
      </section>

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
        <div className="card card-pad row">
          <input className="input" style={{ width: 110 }} inputMode="decimal" placeholder="minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Minutes" />
          <span className="muted small">for {name} ({kind === 'lecture' ? 'lecture' : 'self-study'})</span>
          <button className="btn" onClick={addManual}>Add</button>
          <span className="spacer" />
          <button className="btn" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Import Focus Log file</button>
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importFile(f); }} />
        </div>
        {msg && <div className="notice good small" style={{ marginTop: 10 }}>{msg}</div>}
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
                      <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Delete session" onClick={() => confirm('Delete this session?') && store(sessions.filter((x) => x.id !== s.id))}>
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
