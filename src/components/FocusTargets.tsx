/** Focus → Targets: hours per subject per week, this week's progress, and "block 1 h tomorrow" for what's behind. */
import { useMemo, useState } from 'react';
import { useFocus, minutesOf } from '../core/focusStore';
import { useStored } from '../core/kv';
import { blockTomorrow, hoursBySubject, suggestTargets, targetRows, weekStart, type PlannedBlock, type Targets } from '../core/targets';

const h1 = (h: number) => `${(Math.round(h * 10) / 10).toFixed(1)} h`;

export function FocusTargets() {
  const f = useFocus();
  const [targets, setTargets] = useStored<Targets>('focus:targets', {});
  const [planned, setPlanned] = useStored<PlannedBlock[]>('today:planned', []);
  const [edit, setEdit] = useState(false);
  const now = Date.now();
  const done = useMemo(() => hoursBySubject(f.sessions, weekStart(now)), [f.sessions, now]);
  const suggested = useMemo(() => suggestTargets(f.sessions, now), [f.sessions, now]);
  const rows = targetRows(targets, done);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.target, r.done)));
  const isPlanned = (s: string) => planned.some((p) => p.subject === s && p.start > now);
  const plan = (subject: string) =>
    setPlanned([...planned.filter((p) => p.end > now), blockTomorrow(subject, now, minutesOf(f.prefs.dayStart), minutesOf(f.prefs.dayEnd))]);
  const subjects = [...new Set([...f.subjects, ...Object.keys(targets)])];

  return (
    <div className="section">
      <div className="section-head">
        <h2>Targets</h2>
        <span className="faint tiny">hours per subject this week</span>
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => setEdit(!edit)}>{edit ? 'Done' : 'Edit targets'}</button>
      </div>
      <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        {rows.length === 0 && !edit && (
          <div className="muted small">
            No targets yet.{' '}
            {Object.keys(suggested).length > 0 ? <button className="btn btn-sm" onClick={() => setTargets(suggested)}>Use my last 2 weeks ({Object.keys(suggested).length} subjects)</button> : 'Log a few hours first – targets can then be suggested from your last 2 weeks.'}
          </div>
        )}
        {rows.map((r) => (
          <div key={r.subject} className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <b>{r.subject}</b>
              <span className="faint">{h1(r.done)} of {h1(r.target)}</span>
            </div>
            <div className="target-bar" role="img" aria-label={`${r.subject}: ${h1(r.done)} of ${h1(r.target)}`}>
              <span className="target-done" style={{ width: `${(Math.min(r.done, max) / max) * 100}%` }} />
              <span className="target-mark" style={{ left: `${(r.target / max) * 100}%` }} />
            </div>
            {r.missing >= 0.5 && (
              <div className="row small">
                <span className="muted">{h1(r.missing)} to go.</span>
                {isPlanned(r.subject) ? <span className="tag tag-good">1 h planned</span> : <button className="btn btn-sm" onClick={() => plan(r.subject)}>Block 1 h for {r.subject} tomorrow</button>}
              </div>
            )}
          </div>
        ))}
        {edit && (
          <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
            {subjects.map((s) => (
              <label key={s} className="row small" style={{ justifyContent: 'space-between' }}>
                <span>{s} {suggested[s] !== undefined && <span className="faint tiny">(suggested {h1(suggested[s])})</span>}</span>
                <input className="input" type="number" min={0} max={40} step={0.5} style={{ width: 90 }} value={targets[s] ?? ''} placeholder="–"
                  onChange={(e) => setTargets({ ...targets, [s]: Math.max(0, Number(e.target.value) || 0) })} aria-label={`Weekly hours for ${s}`} />
              </label>
            ))}
            {Object.keys(suggested).length > 0 && <button className="btn btn-sm" onClick={() => setTargets({ ...targets, ...suggested })}>Fill in suggestions</button>}
          </div>
        )}
      </div>
    </div>
  );
}
