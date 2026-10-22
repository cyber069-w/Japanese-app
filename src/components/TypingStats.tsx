import { useCanvas } from '../core/canvas';

const W = 640;
const H = 170;
const PAD = { l: 34, r: 10, t: 12, b: 22 };
const DAYS = 14;

/** Monkeytype stats from the Mac job (once a day, needs private/monkeytype.json). Hidden until there are any. */
export function TypingStats() {
  const t = useCanvas().inbox?.typing;
  if (!t) return null;
  const w = t.week;
  const byDay = new Map((t.days ?? []).map((d) => [d.date, d]));
  const end = new Date(t.at.slice(0, 10) + 'T12:00:00');
  const range = Array.from({ length: DAYS }, (_, i) => {
    const key = new Date(end.getTime() - (DAYS - 1 - i) * 86400_000).toLocaleDateString('sv');
    return { key, ...byDay.get(key) };
  });
  const speeds = range.flatMap((d) => (d.wpm != null ? [d.wpm] : []));
  const lo = Math.max(0, Math.floor((Math.min(...speeds, 100) - 5) / 10) * 10);
  const hi = Math.ceil((Math.max(...speeds, 10) + 3) / 10) * 10;
  const maxMin = Math.max(1, ...range.map((d) => d.minutes ?? 0));
  const x = (i: number) => PAD.l + (i / (DAYS - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const pts = range.flatMap((d, i) => (d.wpm != null ? [{ i, d, px: x(i), py: y(d.wpm) }] : []));
  const line = pts.map((p, k) => `${k ? 'L' : 'M'}${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ');
  const area = pts.length > 1 ? `${line} L${pts[pts.length - 1].px},${H - PAD.b} L${pts[0].px},${H - PAD.b} Z` : '';
  const ticks = [lo, (lo + hi) / 2, hi];
  const slot = (W - PAD.l - PAD.r) / DAYS;

  const tiles: Array<[string, string]> = w?.wpm != null
    ? [[String(w.wpm), 'avg wpm'], [String(w.best), 'best wpm'], [`${w.acc}%`, 'accuracy'], [String(w.tests), 'tests this week']]
    : [];

  return (
    <div className="section">
      <div className="section-head">
        <h2>Typing</h2>
        <span className="spacer" />
        <a href="https://monkeytype.com" target="_blank" rel="noreferrer" className="faint">Monkeytype ↗ · {t.at.slice(0, 10)}</a>
      </div>
      {t.error && <div className="notice small" style={{ marginBottom: 10 }}>{t.error}</div>}
      {tiles.length > 0 && (
        <div className="stat-tiles" style={{ marginBottom: 12 }}>
          {tiles.map(([v, label]) => (
            <div className="card tile" key={label}>
              <div className="tile-value">{v}</div>
              <div className="tile-label">{label}</div>
            </div>
          ))}
        </div>
      )}
      <div className="card card-pad">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Typing speed per day, last 14 days">
          <defs>
            <linearGradient id="typing-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 4" />
              <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{v}</text>
            </g>
          ))}
          {range.map((d, i) => d.minutes ? (
            <rect key={d.key} x={x(i) - slot * 0.3} width={slot * 0.6} y={H - PAD.b - (d.minutes / maxMin) * 38} height={(d.minutes / maxMin) * 38} rx="3" fill="var(--track)">
              <title>{`${d.key}: ${d.minutes} min`}</title>
            </rect>
          ) : null)}
          {area && <path d={area} fill="url(#typing-fill)" />}
          {line && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {pts.map((p) => (
            <circle key={p.d.key} cx={p.px} cy={p.py} r={3 + Math.min(4, Math.sqrt((p.d.tests ?? 1) / 4))} fill="var(--surface)" stroke="var(--accent)" strokeWidth="2">
              <title>{`${p.d.key}: ${p.d.wpm} wpm · ${p.d.tests} tests · ${p.d.minutes} min`}</title>
            </circle>
          ))}
          {[0, DAYS - 1].map((i) => (
            <text key={i} x={x(i)} y={H - 5} textAnchor={i ? 'end' : 'start'} fontSize="11" fill="var(--ink-3)">{i ? 'today' : range[0].key.slice(5)}</text>
          ))}
        </svg>
        <div className="faint tiny" style={{ marginTop: 6 }}>Line = average wpm per day · dot size = number of tests · grey bars = minutes typed</div>
        {t.recent && t.recent.length > 0 && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {t.recent.map((r) => (
              <span key={r.at} className="small" title={`${r.at.replace('T', ' ')} · ${r.test}`} style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--accent-tint)' }}>
                <b>{Math.round(r.wpm)}</b> wpm · {Math.round(r.acc)}%
              </span>
            ))}
          </div>
        )}
        {t.total && <div className="faint small" style={{ marginTop: 12 }}>All time: {t.total.tests} tests · {t.total.hours} h typing</div>}
      </div>
    </div>
  );
}
