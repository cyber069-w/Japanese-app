/**
 * The timer (Focus page, widget tab and mini window): a clock, a radial “flower” subject picker that
 * opens when you start, the questions the ticker asks, and the “no timer running” reminder.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Icon } from '../components/Icon';
import { effectiveMs, isRunning } from '../core/focus';
import { answerPrompt, dismissNudge, finishTimer, initFocus, pauseOrResume, startTimer, useFocus } from '../core/focusStore';
import { dayKey, formatDuration } from '../lib/date';

export const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const PALETTE = ['#bfe0ff', '#bdecc6', '#ffe08a', '#ffc6bd', '#ffcf99', '#d9c8ff', '#a9e7df', '#f6c4e6', '#e4e7a2', '#c8d4ff', '#f2d6b3'];
/** A stable colour per subject name. */
export function subjectColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

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

/** Subjects open around the centre like petals; a dropdown is always there for keyboards and narrow windows. */
export function FlowerPicker({ onPick, onClose, title = 'What are you working on?' }: { onPick: (subject: string, kind: 'study' | 'lecture') => void; onClose: () => void; title?: string }) {
  const f = useFocus();
  const [kind, setKind] = useState(f.kind);
  const [choice, setChoice] = useState(f.selected || f.subjects[0] || '');
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const n = f.subjects.length;
  const petal = width < 380 ? 66 : 78;
  const radius = Math.min((width - petal) / 2 - 2, Math.max(petal * 1.05, (n * petal * 1.08) / (2 * Math.PI)));
  const ring = n > 0 && n <= 18 && radius >= petal * 0.95;
  const size = radius * 2 + petal;

  return (
    <div className="flower-wrap" ref={box}>
      <div className="flower-title">{title}</div>
      {ring && (
        <div className="flower" style={{ width: size, height: size }} role="group" aria-label="Subjects">
          {f.subjects.map((s, i) => {
            const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
            return (
              <button
                key={s}
                className="petal"
                style={{ '--c': subjectColor(s), width: petal, height: petal, left: size / 2 + radius * Math.cos(angle) - petal / 2, top: size / 2 + radius * Math.sin(angle) - petal / 2, animationDelay: `${i * 22}ms` } as React.CSSProperties}
                onClick={() => onPick(s, kind)}
                autoFocus={i === 0}
                title={s}
              >
                <span lang="de">{s}</span>
              </button>
            );
          })}
          <div className="flower-center">
            <button className={`chip${kind === 'study' ? ' on' : ''}`} onClick={() => setKind('study')}>Study</button>
            <button className={`chip${kind === 'lecture' ? ' on' : ''}`} onClick={() => setKind('lecture')}>Lecture</button>
          </div>
        </div>
      )}
      <form className="row flower-fallback" onSubmit={(e) => { e.preventDefault(); if (choice) onPick(choice, kind); }}>
        <select className="input" value={choice} onChange={(e) => setChoice(e.target.value)} aria-label="Subject">
          {f.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {!ring && (
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as 'study' | 'lecture')} aria-label="Kind">
            <option value="study">Self-study</option>
            <option value="lecture">Lecture</option>
          </select>
        )}
        <button className="btn btn-primary btn-sm" type="submit" disabled={!choice}>Start</button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Cancel</button>
      </form>
    </div>
  );
}

function PromptBanner() {
  const { active } = useFocus();
  const p = active?.prompt;
  if (!active || !p) return null;
  const text =
    p.reason === 'away'
      ? `You were away ${hhmm(p.from)}–${hhmm(p.to ?? Date.now())} (computer asleep). Count that time for ${active.subject}?`
      : p.reason === 'check'
        ? `Still working on ${active.subject}?`
        : `No answer – the timer stopped counting at ${hhmm(p.from)}. Count the time since then?`;
  return (
    <div className="notice focus-prompt" role="alertdialog" aria-live="assertive">
      <div>{text}</div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => answerPrompt('count')}>{p.reason === 'check' ? 'Yes, still on it' : 'Count it'}</button>
        {p.reason !== 'check' && <button className="btn btn-sm" onClick={() => answerPrompt('drop')}>Don’t count, keep going</button>}
        <button className="btn btn-sm btn-ghost" onClick={() => answerPrompt('stop')}>Stop at {hhmm(p.from)}</button>
      </div>
    </div>
  );
}

export function FocusPanel({ compact, onSaved, onLogGap }: { compact?: boolean; onSaved?: (text: string) => void; onLogGap?: () => void }) {
  const f = useFocus();
  const a = f.active;
  const running = !!a && isRunning(a);
  const now = useNow(running);
  const [picking, setPicking] = useState(false);
  const today = f.sessions.filter((s) => s.day === dayKey()).reduce((n, s) => n + s.effectiveSec, 0) + (a ? Math.round(effectiveMs(a, now) / 1000) : 0);

  const stop = () => {
    const s = finishTimer();
    onSaved?.(s ? `Saved ${formatDuration(s.effectiveSec * 1000)} of ${s.subject}.` : 'Too short to save (under 10 s).');
  };

  return (
    <div className={`focus-panel${compact ? ' compact' : ''}`}>
      <div className="focus-clock" aria-label="Timer">{clock(a ? effectiveMs(a, now) : 0)}</div>
      <div className="focus-status">
        {a ? (
          <>
            <span className="dot" style={{ background: subjectColor(a.subject) }} />
            {a.kind === 'lecture' ? 'Lecture · ' : ''}{a.subject}{running ? '' : ' · paused'}
          </>
        ) : (
          'No timer running'
        )}
        <span className="faint"> · today {formatDuration(today * 1000)}</span>
      </div>

      <PromptBanner />

      {!a && f.nudge && !picking && (
        <div className="notice focus-prompt">
          <div>Nothing is being logged right now. What are you doing?</div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setPicking(true)}>Start a timer</button>
            {onLogGap && <button className="btn btn-sm" onClick={onLogGap}>Log missed time</button>}
            <button className="btn btn-sm btn-ghost" onClick={dismissNudge}>Later</button>
          </div>
        </div>
      )}

      {picking ? (
        <FlowerPicker
          title={a ? 'Switch to…' : 'What are you working on?'}
          onPick={(s, k) => {
            startTimer(s, k);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : (
        <div className="row" style={{ justifyContent: 'center' }}>
          {!a ? (
            <button className="btn btn-primary btn-lg focus-start" onClick={() => setPicking(true)}>
              <Icon name="play" size={18} /> Start
            </button>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => pauseOrResume()}>
                <Icon name={running ? 'stop' : 'play'} size={16} /> {running ? 'Pause' : 'Resume'}
              </button>
              <button className="btn" onClick={stop}>Finish</button>
              <button className="btn btn-ghost" onClick={() => setPicking(true)}>Switch</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact page for a second tab or the mini window (#/focus-widget). */
export function FocusWidget() {
  useEffect(initFocus, []);
  return (
    <div className="focus-widget">
      <div className="row focus-widget-head">
        <b>Focus</b>
        <span className="spacer" />
        <a className="faint tiny" href="#/focus" target="_blank" rel="noreferrer">Open app</a>
      </div>
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
    window.open(`${location.pathname}#/focus-widget`, 'nihongo-focus', 'popup,width=380,height=560');
    return;
  }
  const w = await api.requestWindow({ width: 380, height: 520 });
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
  w.document.documentElement.dataset.course = 'focus';
  if (document.documentElement.dataset.theme) w.document.documentElement.dataset.theme = document.documentElement.dataset.theme;
  const host = w.document.createElement('div');
  w.document.body.append(host);
  const root = createRoot(host);
  initFocus();
  root.render(<FocusWidget />);
  w.addEventListener('pagehide', () => root.unmount());
}
