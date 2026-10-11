import { useMemo } from 'react';
import { useApp } from '../core/store';
import { useCtx, useDueCounts, useModuleProgress } from '../core/hooks';
import { buildReviewQueue, buildWeakQueue, weakCardIds } from '../core/session';
import { startSession } from '../core/sessionConfig';
import { streak } from '../core/stats';
import type { StudyModule } from '../core/types';
import { MODULES } from '../modules';
import { dayKey, daysUntil, japaneseDate } from '../lib/date';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { ProgressRing } from '../components/ProgressRing';

function greeting(h: number) {
  if (h < 5) return ['こんばんは', 'Good evening – studying late?'];
  if (h < 11) return ['おはようございます', 'Good morning'];
  if (h < 18) return ['こんにちは', 'Good afternoon'];
  return ['こんばんは', 'Good evening'];
}

export function Home() {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  const days = useApp((s) => s.days);
  const settings = useApp((s) => s.settings);
  const due = useDueCounts();
  const today = days[dayKey()]?.reviews ?? 0;
  const st = streak(days);
  const weakCount = useMemo(() => weakCardIds(cards).length, [cards]);
  const [ja, en] = greeting(new Date().getHours());
  const modulesWithDue = Object.values(due.per).filter((n) => n > 0).length;
  const examDays = settings.examDate ? daysUntil(settings.examDate) : null;

  const startReview = () =>
    startSession({ title: 'Review', cards: buildReviewQueue(MODULES, ctx, cards), back: '/', rebuild: () => buildReviewQueue(MODULES, ctx, cards) });
  const startWeak = () =>
    startSession({ title: 'Weakest items', cards: buildWeakQueue(MODULES, ctx, cards), back: '/' });

  // suggestion: the module with the most due cards, otherwise the least practised one
  const suggestion = useMemo(() => {
    const byDue = [...MODULES].filter((m) => m.status === 'ready').sort((a, b) => (due.per[b.id] ?? 0) - (due.per[a.id] ?? 0));
    if (byDue[0] && due.per[byDue[0].id]) return { mod: byDue[0], why: `${due.per[byDue[0].id]} cards due` };
    return null;
  }, [due]);

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <div className="eyebrow">{japaneseDate()}</div>
          <h1 className="serif" style={{ fontWeight: 600, marginTop: 6 }} lang="ja">{ja}</h1>
          <div className="muted" style={{ marginTop: 4 }}>{en}{st > 0 ? ` · day ${st} of your streak` : ''}</div>
        </div>
      </div>

      <div className="dash-hero">
        <div className="card hero-main">
          <span className="big-kanji" aria-hidden="true">復</span>
          <div className="eyebrow">Due today</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
            <span className="due-number">{due.total}</span>
            <span className="muted">
              {due.total === 0 ? 'nothing due – learn something new' : `card${due.total === 1 ? '' : 's'} in ${modulesWithDue} module${modulesWithDue === 1 ? '' : 's'}`}
            </span>
          </div>
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={due.total ? startReview : () => navigate('/study')}>
              {due.total ? (
                <>
                  Review now <Icon name="right" size={18} />
                </>
              ) : (
                <>
                  Start studying <Icon name="right" size={18} />
                </>
              )}
            </button>
            {weakCount > 0 && (
              <button className="btn btn-lg btn-ghost" onClick={startWeak}>
                <Icon name="zap" size={18} /> Weakest {Math.min(weakCount, 20)}
              </button>
            )}
          </div>
          {suggestion && <div className="faint small">Most due: {suggestion.mod.name} ({suggestion.why})</div>}
        </div>

        <div className="card goal-card">
          <ProgressRing value={today / settings.dailyGoal}>
            <div>
              <b>{today}</b>
              <div className="faint tiny">/ {settings.dailyGoal}</div>
            </div>
          </ProgressRing>
          <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            <div>
              <div className="eyebrow">Daily goal</div>
              <div style={{ fontWeight: 600 }}>
                {today >= settings.dailyGoal ? 'Done for today 🎉' : `${settings.dailyGoal - today} answers to go`}
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <span className="tile-icon flame" style={{ margin: 0 }}>
                <Icon name="flame" size={18} />
              </span>
              <span>
                <b>{st}</b> day streak
              </span>
            </div>
            {examDays !== null && examDays >= 0 && (
              <div className="row" style={{ gap: 6 }}>
                <Icon name="calendar" size={18} />
                <span>
                  <b>{examDays}</b> day{examDays === 1 ? '' : 's'} to the exam
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {examDays !== null && examDays >= 0 && <ExamTip days={examDays} dueTotal={due.total} weak={weakCount} />}
      {settings.examDate === '' && (
        <button className="notice" style={{ marginTop: 16, border: 0, width: '100%', textAlign: 'left' }} onClick={() => navigate('/settings')}>
          <Icon name="calendar" size={16} /> Set your exam date in Settings to get a countdown and review suggestions.
        </button>
      )}

      <div className="section">
        <div className="section-head">
          <h2>Modules</h2>
          <span className="spacer" />
          <a href="#/study">All modules</a>
        </div>
        <div className="grid module-grid" style={{ '--min': '210px' } as React.CSSProperties}>
          {MODULES.map((m) => (
            <ModuleCard key={m.id} mod={m} due={due.per[m.id] ?? 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ExamTip({ days, dueTotal, weak }: { days: number; dueTotal: number; weak: number }) {
  let tip: string;
  if (days === 0) tip = 'Exam day! Do a short warm-up review and trust what you know. 頑張って！';
  else if (days <= 3) tip = 'Final days: focus on reviews and your weakest items rather than new material.';
  else if (days <= 14) tip = 'Two weeks or less: finish new lessons now, then switch to reviewing and the oral exam questions.';
  else tip = 'Plenty of time: learn a little new material every day and keep your reviews at zero.';
  return (
    <div className="notice" style={{ marginTop: 16 }}>
      <b>Exam plan · </b>
      {tip}
      {dueTotal > 0 && ` Today: clear your ${dueTotal} due cards.`}
      {weak > 0 && days <= 14 && ` Then drill your weakest items.`}
    </div>
  );
}

export function ModuleCard({ mod, due }: { mod: StudyModule; due: number }) {
  const progress = useModuleProgress(mod);
  const pct = progress.total ? progress.learned / progress.total : 0;
  return (
    <a className={`card card-link module-card${mod.status === 'soon' ? ' soon' : ''}`} href={`#/m/${mod.id}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="module-glyph" lang="ja">{mod.icon}</div>
        <span className="spacer" />
        {mod.status === 'soon' ? <span className="tag">soon</span> : due > 0 ? <span className="tag tag-accent">{due} due</span> : null}
      </div>
      <div>
        <h3>{mod.name}</h3>
        <div className="faint small serif" lang="ja">{mod.nameJa}</div>
      </div>
      <div className="meta">
        {mod.status === 'ready' && progress.total > 0 ? (
          <>
            <div className="bar" style={{ flex: 1 }}>
              <span style={{ width: `${pct * 100}%` }} />
            </div>
            <span className="nowrap">
              {progress.learned}/{progress.total}
            </span>
          </>
        ) : (
          <span>{mod.description}</span>
        )}
      </div>
    </a>
  );
}
