/** Strength per item (kana chart), red → green. Shown on the module page, inside its subject. */
import { useMemo } from 'react';
import { useApp } from '../core/store';
import { useCtx } from '../core/hooks';
import { heatColor, itemStats } from '../core/stats';
import type { StudyModule } from '../core/types';

export function Heatmap({ mod }: { mod: StudyModule }) {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  const stats = useMemo(() => itemStats(cards, mod.id), [cards, mod.id]);
  const sections = mod.chart!(ctx);
  if (!sections.length) return null;
  return (
    <div className="section">
      <div className="section-head">
        <h2>Your {mod.name.toLowerCase()} chart</h2>
        <span className="spacer" />
        <span className="heat-legend">
          weak <span className="grad" style={{ background: `linear-gradient(90deg, ${heatColor(0)}, ${heatColor(0.5)}, ${heatColor(0.8)}, ${heatColor(1)})` }} /> strong
        </span>
      </div>
      <div className="card card-pad stack" style={{ '--gap': '22px' } as React.CSSProperties}>
        {sections.map((s) => (
          <div key={s.title}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{s.title}</div>
            <div className="heat-grid" style={{ gridTemplateColumns: `repeat(${s.columns}, minmax(0, 1fr))`, maxWidth: s.columns * 70 }}>
              {s.cells.map((c, i) => {
                if (!c) return <div key={i} className="heat-cell blank" />;
                const st = stats.get(c.id);
                const acc = st && st.seen ? st.correct / st.seen : null;
                return (
                  <div
                    key={c.id}
                    className={`heat-cell${acc !== null ? ' seen' : ''}`}
                    style={acc !== null ? { background: heatColor(acc) } : undefined}
                    title={acc !== null ? `${c.label} ${c.sub ?? ''}: ${Math.round(acc * 100)}% of ${st!.seen}` : `${c.label}: not practised yet`}
                  >
                    <span lang="ja">{c.label}</span>
                    {c.sub && <small>{c.sub}</small>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

