import { useEffect, useRef, useState } from 'react';

/** Scrolls your text word by word at a chosen speed (words per minute). Large type, pause button. */
export function Teleprompter({ text, wpm, running }: { text: string; wpm: number; running: boolean }) {
  const words = text.split(/\s+/).filter(Boolean);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const cur = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!running || paused) return;
    const t = setInterval(() => setI((n) => Math.min(words.length - 1, n + 1)), 60_000 / Math.max(40, wpm));
    return () => clearInterval(t);
  }, [running, paused, wpm, words.length]);
  useEffect(() => { cur.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [i]);
  return (
    <div className="teleprompter" aria-label="Teleprompter">
      <div className="tp-text">{words.map((w, n) => <span key={n} ref={n === i ? cur : undefined} className={n < i ? 'done' : n === i ? 'now' : ''}>{w} </span>)}</div>
      <button className="btn btn-sm tp-pause" onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</button>
    </div>
  );
}
