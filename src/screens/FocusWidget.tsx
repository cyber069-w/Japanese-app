/** The timer card (used on the Focus page and in the widget) and the pop-out helpers. */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Icon } from '../components/Icon';
import { effectiveMs, isRunning } from '../core/focus';
import { addSubject, finishTimer, initFocus, removeSubject, selectKind, selectSubject, toggleTimer, useFocus } from '../core/focusStore';
import { dayKey, formatDuration } from '../lib/date';

export const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export function useNow(running: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  return now;
}

export function FocusPanel({ compact, onSaved }: { compact?: boolean; onSaved?: (text: string) => void }) {
  const f = useFocus();
  const { active } = f;
  const now = useNow(!!active && isRunning(active));
  const [editing, setEditing] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [hint, setHint] = useState('');

  const today = f.sessions.filter((s) => s.day === dayKey()).reduce((n, s) => n + s.effectiveSec, 0) + (active ? Math.round(effectiveMs(active, now) / 1000) : 0);
  const toggle = () => setHint(toggleTimer() ? '' : 'Pick a subject first.');
  const stop = () => {
    const s = finishTimer();
    onSaved?.(s ? `Saved ${formatDuration(s.effectiveSec * 1000)} of ${s.subject}.` : 'Too short to save (under 10 s).');
  };

  return (
    <div className="stack" style={{ '--gap': compact ? '10px' : '14px', textAlign: 'center' } as React.CSSProperties}>
      <div style={{ fontSize: compact ? '2.6rem' : '3.4rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {clock(active ? effectiveMs(active, now) : 0)}
      </div>
      <div className="muted small">
        {active ? `${active.kind === 'lecture' ? 'Lecture · ' : ''}${active.subject}${isRunning(active) ? '' : ' · paused'}` : f.selected ? `${f.selected} · ${f.kind === 'lecture' ? 'lecture' : 'self-study'}` : 'Choose a subject'}
        {compact && <span> · today {formatDuration(today * 1000)}</span>}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={toggle}>
          <Icon name={active && isRunning(active) ? 'stop' : 'play'} size={16} /> {!active ? 'Start' : isRunning(active) ? 'Pause' : 'Resume'}
        </button>
        {active && <button className="btn" onClick={stop}>Finish and save</button>}
      </div>
      {hint && <div className="notice warn small">{hint}</div>}
      {!active && (
        <>
          <div className="picker-chips" style={{ justifyContent: 'center' }}>
            {f.subjects.map((s) => (
              <button
                key={s}
                className={`chip${f.selected === s ? ' on' : ''}`}
                aria-pressed={f.selected === s}
                onClick={() => (editing ? removeSubject(s) : (selectSubject(s), setHint('')))}
                title={editing ? `Remove ${s}` : undefined}
              >
                {s}
                {editing && <Icon name="x" size={12} />}
              </button>
            ))}
            <button className="chip" onClick={() => setEditing(!editing)} aria-pressed={editing}>{editing ? 'Done' : 'Edit'}</button>
          </div>
          <form className="row" style={{ justifyContent: 'center' }} onSubmit={(e) => { e.preventDefault(); addSubject(newSubject); setNewSubject(''); setHint(''); }}>
            <input className="input" style={{ width: compact ? 150 : 200 }} placeholder="Add a subject" value={newSubject} maxLength={40} onChange={(e) => setNewSubject(e.target.value)} aria-label="New subject" />
            <button className="btn btn-sm" type="submit" disabled={!newSubject.trim()}>Add</button>
          </form>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className={`chip${f.kind === 'study' ? ' on' : ''}`} onClick={() => selectKind('study')}>Self-study</button>
            <button className={`chip${f.kind === 'lecture' ? ' on' : ''}`} onClick={() => selectKind('lecture')}>Lecture</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Compact page for a second tab or window (#/focus-widget). */
export function FocusWidget() {
  useEffect(initFocus, []);
  return (
    <div style={{ padding: 16, minHeight: '100vh', background: 'var(--paper)', color: 'var(--ink)' }}>
      <FocusPanel compact />
    </div>
  );
}

type PipApi = { requestWindow(o: { width: number; height: number }): Promise<Window> };
export const pipSupported = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window;

/** Opens the timer in an always-on-top mini window (Chrome/Edge); falls back to a small popup window. */
export async function openFocusPip(): Promise<void> {
  const api = (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture;
  if (!api) {
    window.open(`${location.pathname}#/focus-widget`, 'nihongo-focus', 'popup,width=360,height=480');
    return;
  }
  const w = await api.requestWindow({ width: 340, height: 420 });
  for (const sheet of [...document.styleSheets]) {
    try {
      const style = w.document.createElement('style');
      style.textContent = [...sheet.cssRules].map((r) => r.cssText).join('\n');
      w.document.head.append(style);
    } catch {
      if (sheet.href) {
        const link = w.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        w.document.head.append(link);
      }
    }
  }
  for (const k of ['look', 'theme', 'course']) if (document.documentElement.dataset[k]) w.document.documentElement.dataset[k] = document.documentElement.dataset[k];
  const host = w.document.createElement('div');
  w.document.body.append(host);
  const root = createRoot(host);
  initFocus();
  root.render(<FocusWidget />);
  w.addEventListener('pagehide', () => root.unmount());
}
