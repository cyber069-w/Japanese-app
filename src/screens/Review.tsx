import { useMemo } from 'react';
import { getState, useApp } from '../core/store';
import { useCtx, useDueCounts } from '../core/hooks';
import { buildReviewQueue, buildWeakQueue, weakCardIds } from '../core/session';
import { startSession } from '../core/sessionConfig';
import { MODULES } from '../modules';
import { Icon } from '../components/Icon';

function nextDueText(cards: Record<string, { due: number }>) {
  const now = Date.now();
  const future = Object.values(cards).map((c) => c.due).filter((d) => d > now);
  if (!future.length) return null;
  const ms = Math.min(...future) - now;
  const min = Math.round(ms / 60000);
  if (min < 60) return `in ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 36) return `in ${h} h`;
  return `in ${Math.round(h / 24)} days`;
}

export function Review() {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  const due = useDueCounts();
  const weak = useMemo(() => weakCardIds(cards).length, [cards]);
  const next = nextDueText(cards);

  const review = (moduleId?: string) => {
    const build = () => buildReviewQueue(MODULES, ctx, getState().cards, Date.now(), 50, moduleId);
    startSession({ title: moduleId ? 'Review' : 'Review – all modules', cards: build(), back: '/review', rebuild: build });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Review</h1>
          <div className="page-title-ja" lang="ja">復習</div>
        </div>
      </div>

      <div className="hero">
        <div className="card hero-main">
          <span className="big-kanji" aria-hidden="true">習</span>
          <div className="eyebrow">Everything due today</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
            <span className="due-number">{due.total}</span>
            <span className="muted">cards from all modules, mixed</span>
          </div>
          <div>
            <button className="btn btn-primary btn-lg" disabled={!due.total} onClick={() => review()}>
              Start review <Icon name="right" size={18} />
            </button>
          </div>
          {!due.total && <div className="faint small">All caught up! {next ? `Next card ${next}.` : 'Study something new to fill your queue.'}</div>}
        </div>
        <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="eyebrow">Weakest items</div>
          <p className="muted small">Your most-missed cards across every module – the fastest way to fix gaps before the exam.</p>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="tile-value">{Math.min(weak, 20)}</span>
            <span className="faint small">items to drill</span>
          </div>
          <div>
            <button
              className="btn"
              disabled={!weak}
              onClick={() => startSession({ title: 'Weakest items', cards: buildWeakQueue(MODULES, ctx, cards), back: '/review' })}
            >
              <Icon name="zap" size={18} /> Drill weakest
            </button>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>By module</h2>
        </div>
        <div className="card card-pad">
          {MODULES.filter((m) => m.status === 'ready').map((m) => (
            <div className="mod-row" key={m.id}>
              <span className="serif" lang="ja">{m.icon}</span>
              <span>
                <b>{m.name}</b>
                <span className="faint small"> · {due.per[m.id] ?? 0} due</span>
              </span>
              <button className="btn btn-sm" disabled={!due.per[m.id]} onClick={() => review(m.id)}>
                Review
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
