import { useMemo, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { useApp } from '../../core/store';
import { heatColor, itemStats } from '../../core/stats';
import { Sheet } from '../../components/Sheet';
import { StrokeOrder } from '../../components/Strokes';
import { Ruby } from '../../components/Ruby';
import { Icon } from '../../components/Icon';
import { speak } from '../../lib/speech';
import { alignRuby } from '../../lib/furigana';
import { exampleMeaning, formatKun, kanjiItems, kanjiMeaning, type KanjiInfo } from './data';

export function KanjiBrowser({ ctx }: { ctx: StudyContext }) {
  const items = kanjiItems(ctx);
  const cards = useApp((s) => s.cards);
  const stats = useMemo(() => itemStats(cards, 'kanji'), [cards]);
  const [open, setOpen] = useState<KanjiInfo | null>(null);
  const [replay, setReplay] = useState(0);

  return (
    <div className="stack">
      <p className="muted">{items.length} kanji. Tap one for its stroke order, readings and example words.</p>
      <div className="heat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))' }}>
        {items.map((it) => {
          const st = stats.get(it.id);
          return (
            <button key={it.id} className="heat-cell chart-cell" onClick={() => { setOpen(it.k); setReplay((r) => r + 1); }} aria-label={`${it.k.kanji} ${kanjiMeaning(it.k, ctx)}`}>
              {st && st.seen > 0 && <i className="chart-dot" style={{ background: heatColor(st.correct / st.seen) }} />}
              <span lang="ja" style={{ fontSize: '1.5rem' }}>{it.k.kanji}</span>
              <small style={{ maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kanjiMeaning(it.k, ctx).split(/[,;]/)[0]}</small>
            </button>
          );
        })}
      </div>
      {open && (
        <Sheet title={<span className="serif" lang="ja" style={{ fontSize: '1.6rem' }}>{open.kanji}</span>} onClose={() => setOpen(null)}>
          <div className="stack">
            <div className="kana-detail">
              <StrokeOrder char={open.kanji} replay={replay} className="stroke-box" />
              <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
                <div style={{ fontWeight: 650, fontSize: '1.1rem' }}>{kanjiMeaning(open, ctx)}</div>
                {open.on.length > 0 && <div><span className="eyebrow">On </span><span lang="ja">{open.on.join('・')}</span></div>}
                {open.kun.length > 0 && <div><span className="eyebrow">Kun </span><span lang="ja">{open.kun.map(formatKun).join('・')}</span></div>}
                <div className="faint small">{open.strokes} strokes{open.grade ? ` · grade ${open.grade}` : ''}</div>
                <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setReplay((r) => r + 1)}>
                  <Icon name="pen" size={16} /> Replay strokes
                </button>
              </div>
            </div>
            {open.examples.length > 0 && (
              <div className="card" style={{ padding: '6px 14px' }}>
                {open.examples.map((e) => (
                  <div key={e.w} className="mod-row" style={{ gridTemplateColumns: '34px 1fr' }}>
                    <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => speak(e.r, ctx.settings.voiceRate)} aria-label={`Play ${e.w}`}>
                      <Icon name="speaker" size={17} />
                    </button>
                    <div>
                      <Ruby text={alignRuby(e.w, e.r)} className="serif" />
                      <span className="faint small"> – {exampleMeaning(e, ctx)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}
