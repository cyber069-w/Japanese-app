import { useMemo, useState } from 'react';
import { ModuleGlyph } from '../components/GlyphIcon';
import { getState, useApp } from '../core/store';
import { useCtx, useDueCounts } from '../core/hooks';
import { buildReviewQueue, buildWeakQueue, weakCardIds } from '../core/session';
import { startSession } from '../core/sessionConfig';
import { ACTIVE_MODULES, COURSES, courseModules } from '../courses';
import { Icon } from '../components/Icon';

function nextDueText(cards: Record<string, { id: string; due: number }>, ids: string[]) {
  const now = Date.now();
  const future = Object.values(cards)
    .filter((c) => ids.some((m) => c.id.startsWith(m + ':')))
    .map((c) => c.due)
    .filter((d) => d > now);
  if (!future.length) return null;
  const ms = Math.min(...future) - now;
  const min = Math.round(ms / 60000);
  if (min < 60) return `in ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 36) return `in ${h} h`;
  return `in ${Math.round(h / 24)} days`;
}

/** Courses that have something to review (others are left out of the filter). */
const SCOPES = COURSES.filter((c) => courseModules(c).length > 0);

export function Review() {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  const due = useDueCounts();
  // 'all' or a course id
  const [scope, setScope] = useState<string>('all');
  const course = SCOPES.find((c) => c.id === scope);
  const mods = useMemo(() => (course ? courseModules(course) : ACTIVE_MODULES), [course]);
  const ids = useMemo(() => mods.map((m) => m.id), [mods]);
  const weak = useMemo(() => weakCardIds(cards, Date.now(), ids).length, [cards, ids]);
  const dueHere = course ? due.perCourse[course.id] ?? 0 : due.total;
  const next = nextDueText(cards, ids);
  const scopeName = course ? course.name : 'all courses';

  const review = (moduleId?: string) => {
    const build = () => buildReviewQueue(mods, ctx, getState().cards, Date.now(), 50, moduleId);
    startSession({ title: moduleId ? 'Review' : `Review – ${scopeName}`, cards: build(), back: '/review', rebuild: build });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Review</h1>
          <div className="page-title-ja" lang="ja">復習</div>
        </div>
      </div>

      {SCOPES.length > 1 && (
        <div className="picker-chips" role="group" aria-label="Course" style={{ marginBottom: 18 }}>
          {[{ id: 'all', name: 'All courses' }, ...SCOPES].map((c) => (
            <button key={c.id} className={`chip${scope === c.id ? ' on' : ''}`} aria-pressed={scope === c.id} onClick={() => setScope(c.id)}>
              {c.name}
              <span className="chip-sub">{c.id === 'all' ? due.total : due.perCourse[c.id] ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className="dash-hero">
        <div className="card hero-main">
          <span className="big-kanji" aria-hidden="true">習</span>
          <div className="eyebrow">Everything due today</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
            <span className="due-number">{dueHere}</span>
            <span className="muted">cards from {scopeName}, mixed</span>
          </div>
          <div>
            <button className="btn btn-primary btn-lg" disabled={!dueHere} onClick={() => review()}>
              Start review <Icon name="right" size={18} />
            </button>
          </div>
          {!dueHere && <div className="faint small">All caught up! {next ? `Next card ${next}.` : 'Study something new to fill your queue.'}</div>}
        </div>
        <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="eyebrow">Weakest items</div>
          <p className="muted small">Your most-missed cards in {scopeName} – the fastest way to fix gaps before the exam.</p>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="tile-value">{Math.min(weak, 20)}</span>
            <span className="faint small">items to drill</span>
          </div>
          <div>
            <button
              className="btn"
              disabled={!weak}
              onClick={() => startSession({ title: 'Weakest items', cards: buildWeakQueue(mods, ctx, cards, Date.now(), ids), back: '/review' })}
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
          {mods.map((m) => (
            <div className="mod-row" key={m.id}>
              <span className="serif"><ModuleGlyph mod={m} /></span>
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
