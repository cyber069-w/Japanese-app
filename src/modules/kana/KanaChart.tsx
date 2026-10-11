/** Browsable kana chart: tap a character for its picture, sound and stroke order. */
import { useMemo, useState } from 'react';
import type { ChartSection, Hint, StudyContext } from '../../core/types';
import type { KanaChar } from './table';
import { useApp } from '../../core/store';
import { itemStats, heatColor } from '../../core/stats';
import { Sheet } from '../../components/Sheet';
import { HintPanel } from '../../components/HintPanel';
import { StrokeOrder } from '../../components/Strokes';
import { Icon } from '../../components/Icon';
import { speak } from '../../lib/speech';

export function KanaChart({
  ctx, moduleId, sections, chars, hintFor,
}: {
  ctx: StudyContext;
  moduleId: string;
  sections: ChartSection[];
  chars: Map<string, KanaChar>;
  hintFor: (c: KanaChar) => Hint;
}) {
  const cards = useApp((s) => s.cards);
  const stats = useMemo(() => itemStats(cards, moduleId), [cards, moduleId]);
  const [open, setOpen] = useState<KanaChar | null>(null);
  const [replay, setReplay] = useState(0);

  const show = (c: KanaChar) => {
    setOpen(c);
    setReplay((r) => r + 1);
    if (ctx.settings.sound) speak(c.kana, ctx.settings.voiceRate);
  };

  return (
    <div className="stack" style={{ '--gap': '28px' } as React.CSSProperties}>
      <p className="muted">Tap a character to see its memory picture, hear it and watch the stroke order. The dot shows how well you know it.</p>
      {sections.map((s) => (
        <section key={s.title}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{s.title}</div>
          <div className="heat-grid" style={{ gridTemplateColumns: `repeat(${s.columns}, minmax(0, 1fr))`, maxWidth: s.columns * 92 }}>
            {s.cells.map((cell, i) => {
              if (!cell) return <div key={i} className="heat-cell blank" />;
              const c = chars.get(cell.id)!;
              const st = stats.get(cell.id);
              return (
                <button
                  key={cell.id}
                  className="heat-cell chart-cell"
                  onClick={() => show(c)}
                  aria-label={`${c.kana} ${c.romaji}`}
                >
                  {st && st.seen > 0 && <i className="chart-dot" style={{ background: heatColor(st.correct / st.seen) }} />}
                  <span lang="ja">{c.kana}</span>
                  <small>{c.romaji}</small>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {open && (
        <Sheet
          title={
            <span className="row" style={{ gap: 10 }}>
              <span className="serif" style={{ fontSize: '1.6rem' }} lang="ja">{open.kana}</span>
              <span className="faint">{open.romaji}</span>
            </span>
          }
          onClose={() => setOpen(null)}
        >
          <div className="stack">
            <div className="kana-detail">
              <div className="kana-big serif" lang="ja">{open.kana}</div>
              <div className="stack" style={{ '--gap': '10px', alignItems: 'center' } as React.CSSProperties}>
                {[...open.kana].length === 1 ? (
                  <StrokeOrder char={open.kana} replay={replay} className="stroke-box" />
                ) : (
                  <div className="row">
                    {[...open.kana].map((k, i) => (
                      <StrokeOrder key={i} char={k} replay={replay} className="stroke-box" />
                    ))}
                  </div>
                )}
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-sm" onClick={() => setReplay((r) => r + 1)}>
                    <Icon name="pen" size={16} /> Replay strokes
                  </button>
                  <button className="btn btn-sm" onClick={() => speak(open.kana, ctx.settings.voiceRate)}>
                    <Icon name="speaker" size={16} /> Listen
                  </button>
                </div>
              </div>
            </div>
            <HintPanel hint={hintFor(open)} />
          </div>
        </Sheet>
      )}
    </div>
  );
}
