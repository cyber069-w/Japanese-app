/** Focus → Today as a clock: the day window is the dial. Drag on the ring to pick a time range, tap a dashed gap to fill it. */
import { useRef, useState } from 'react';
import { formatDuration } from '../lib/date';
import { hhmm, subjectColor } from '../screens/FocusWidget';

export interface Block { s: number; e: number; subject: string }
interface Props {
  from: number; to: number; now: number; blocks: Block[]; gaps: Array<[number, number]>; covered: number;
  onPick: (start: number, end: number) => void;
}

const R = 96, W = 24, C = 2 * Math.PI * R;
const STEP = 5 * 60_000;

/** Arc of the ring as a dash on a circle that starts at 12 o'clock. */
const arc = (a: number, b: number, from: number, to: number) => {
  const len = Math.max(0, (Math.min(b, to) - Math.max(a, from)) / (to - from)) * C;
  const off = Math.max(0, (Math.max(a, from) - from) / (to - from)) * C;
  return { strokeDasharray: `${len} ${C - len}`, strokeDashoffset: -off };
};

export function DayClock({ from, to, now, blocks, gaps, covered, onPick }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const anchor = useRef<number | null>(null);
  const moved = useRef(false);

  const timeAt = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    const frac = ((Math.atan2(x, -y) / (2 * Math.PI)) + 1) % 1;
    return Math.min(to, Math.max(from, Math.round((from + frac * (to - from)) / STEP) * STEP));
  };
  const down = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const t = timeAt(e);
    anchor.current = t;
    moved.current = false;
    setSel([t, Math.min(to, t + 30 * 60_000)]);
  };
  const move = (e: React.PointerEvent) => {
    if (anchor.current === null) return;
    const t = timeAt(e);
    if (Math.abs(t - anchor.current) >= STEP) moved.current = true;
    if (Math.abs(t - anchor.current) >= STEP) setSel([Math.min(anchor.current, t), Math.max(anchor.current, t)]);
  };
  const up = () => { anchor.current = null; };

  const nowAngle = ((now - from) / (to - from)) * 360;
  return (
    <div className="day-clock">
      <svg ref={svg} viewBox="0 0 240 240" role="img" aria-label={`Day clock ${hhmm(from)} to ${hhmm(to)}`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{ touchAction: 'none' }}>
        <g transform="rotate(-90 120 120)" fill="none">
          <circle cx="120" cy="120" r={R} className="clock-track" strokeWidth={W} />
          {Array.from({ length: Math.round((to - from) / 3_600_000) }, (_, i) => (
            <circle key={i} cx="120" cy="120" r={R + W / 2 + 4} className="clock-tick" strokeWidth="6" {...arc(from + i * 3_600_000, from + i * 3_600_000 + 60_000, from, to)} />
          ))}
          {gaps.map(([a, b]) => <circle key={a} cx="120" cy="120" r={R} className="clock-gap" strokeWidth={W - 6} {...arc(a, b, from, to)} onClick={(e) => { e.stopPropagation(); if (moved.current) return; setSel(null); onPick(a, b); }} />)}
          {blocks.map((b, i) => <circle key={i} cx="120" cy="120" r={R} stroke={subjectColor(b.subject)} strokeWidth={W} {...arc(b.s, b.e, from, to)}><title>{`${b.subject} ${hhmm(b.s)}–${hhmm(b.e)}`}</title></circle>)}
          {sel && <circle cx="120" cy="120" r={R} className="clock-sel" strokeWidth={W + 6} {...arc(sel[0], sel[1], from, to)} />}
        </g>
        {now > from && now < to && <line x1="120" y1="36" x2="120" y2="9" className="clock-hand" transform={`rotate(${nowAngle} 120 120)`} />}
        <text x="120" y="12" textAnchor="middle" className="clock-label">{hhmm(from)}</text>
      </svg>
      <div className="clock-center">
        {sel ? (
          <>
            <b>{hhmm(sel[0])}–{hhmm(sel[1])}</b>
            <span>{formatDuration(sel[1] - sel[0])}</span>
            <button className="btn btn-primary btn-sm" onClick={() => { onPick(sel[0], sel[1]); setSel(null); }}>Log this time</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSel(null)}>Clear</button>
          </>
        ) : (
          <>
            <b>{Math.round(covered * 100)}%</b>
            <span>logged so far</span>
            <small>Drag on the ring to pick a time</small>
          </>
        )}
      </div>
    </div>
  );
}
