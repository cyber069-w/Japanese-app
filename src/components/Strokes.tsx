/**
 * Stroke order animation and a drawing pad, based on KanjiVG paths
 * (109 × 109 viewBox, one path per stroke in the correct order).
 */
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Icon } from './Icon';

type StrokeData = Record<string, string[]>;
let strokeData: StrokeData | null = null;
let loading: Promise<StrokeData> | null = null;

export function loadStrokes(): Promise<StrokeData> {
  loading ??= import('../data/strokes.json').then((m) => (strokeData = m.default as StrokeData));
  return loading;
}

/** Stroke paths for one character: undefined while loading, null if unknown. */
export function useStrokes(char: string): string[] | null | undefined {
  const [, force] = useState(0);
  useEffect(() => {
    if (!strokeData) loadStrokes().then(() => force((n) => n + 1));
  }, []);
  if (!strokeData) return undefined;
  return strokeData[char] ?? null;
}

const startOf = (d: string) => {
  const m = /^M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/.exec(d);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
};

export function StrokeOrder({
  char, replay = 0, speed = 0.55, numbers = true, ghost = true, color, className,
}: { char: string; replay?: number; speed?: number; numbers?: boolean; ghost?: boolean; color?: string; className?: string }) {
  const paths = useStrokes(char);
  if (paths === undefined) return <div className={className} />;
  if (paths === null) return <div className={`${className ?? ''} faint small center`}>No stroke data for {char}</div>;
  return (
    <svg className={className} viewBox="0 0 109 109" role="img" aria-label={`Stroke order of ${char}`}>
      {ghost && paths.map((d, i) => <path key={`g${i}`} d={d} className="stroke-ghost" />)}
      {paths.map((d, i) => (
        <path
          key={`${replay}-${i}`}
          d={d}
          pathLength={1}
          className="stroke-anim"
          style={{ animationDelay: `${i * speed}s`, animationDuration: `${speed * 0.9}s`, ...(color ? { stroke: color } : {}) }}
        />
      ))}
      {numbers &&
        paths.map((d, i) => {
          const [x, y] = startOf(d);
          return (
            <text key={`n${replay}-${i}`} x={x - 4} y={y - 3} className="stroke-num" style={{ animationDelay: `${i * speed}s` }}>
              {i + 1}
            </text>
          );
        })}
    </svg>
  );
}

type Pt = [number, number];

/** Free drawing canvas. Reports the number of strokes drawn. */
export function DrawPad({
  char, guide, reveal, onChange, resetKey,
}: { char: string; guide: boolean; reveal: boolean; onChange?: (strokes: number) => void; resetKey?: unknown }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const drawing = useRef(false);
  const [count, setCount] = useState(0);

  const redraw = () => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const scale = c.width / 109;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5.2 * scale;
    ctx.strokeStyle = getComputedStyle(c).color;
    for (const s of strokes.current) {
      ctx.beginPath();
      s.forEach(([x, y], i) => (i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale)));
      if (s.length === 1) ctx.lineTo(s[0][0] * scale + 0.1, s[0][1] * scale);
      ctx.stroke();
    }
  };

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = Math.round(r.width * devicePixelRatio);
      c.height = Math.round(r.height * devicePixelRatio);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    strokes.current = [];
    setCount(0);
    onChange?.(0);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, char]);

  const pos = (e: PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 109, ((e.clientY - r.top) / r.height) * 109];
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (reveal) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    strokes.current.push([pos(e)]);
    redraw();
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    strokes.current[strokes.current.length - 1].push(pos(e));
    redraw();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setCount(strokes.current.length);
    onChange?.(strokes.current.length);
  };
  const undo = () => {
    strokes.current.pop();
    setCount(strokes.current.length);
    onChange?.(strokes.current.length);
    redraw();
  };
  const clear = () => {
    strokes.current = [];
    setCount(0);
    onChange?.(0);
    redraw();
  };

  return (
    <div className="stack" style={{ '--gap': '10px', alignItems: 'center' } as React.CSSProperties}>
      <div className="draw-wrap">
        <div className="draw-box" />
        {guide && !reveal && <StrokeOrder char={char} numbers={false} ghost className="draw-guide" speed={0} />}
        <canvas
          ref={canvas}
          className="draw-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Drawing area"
        />
        {reveal && <StrokeOrder char={char} className="draw-reveal" ghost={false} />}
      </div>
      {!reveal && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-sm btn-ghost" onClick={undo} disabled={!count}>
            <Icon name="undo" size={16} /> Undo
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={clear} disabled={!count}>
            <Icon name="trash" size={16} /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
