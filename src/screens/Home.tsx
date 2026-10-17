import { useMemo } from 'react';
import { useApp } from '../core/store';
import { useCourse, useCtx, useDueCounts } from '../core/hooks';
import { buildReviewQueue, buildWeakQueue, weakCardIds } from '../core/session';
import { startSession } from '../core/sessionConfig';
import { streak } from '../core/stats';
import { getModule } from '../modules';
import { ACTIVE_IDS, ACTIVE_MODULES, COURSES, courseEntries } from '../courses';
import { dayKey, daysUntil, japaneseDate } from '../lib/date';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { ProgressRing } from '../components/ProgressRing';
import { CourseBar, CourseList } from '../components/CourseBar';
import { ModuleCard } from '../components/ModuleCard';

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
  const course = useCourse();
  const today = days[dayKey()]?.reviews ?? 0;
  const st = streak(days);
  const weakCount = useMemo(() => weakCardIds(cards, Date.now(), ACTIVE_IDS).length, [cards]);
  const [ja, en] = greeting(new Date().getHours());
  const coursesWithDue = COURSES.filter((c) => due.perCourse[c.id] > 0);
  const examDays = settings.examDate ? daysUntil(settings.examDate) : null;

  const startReview = () =>
    startSession({ title: 'Review – all courses', cards: buildReviewQueue(ACTIVE_MODULES, ctx, cards), back: '/', rebuild: () => buildReviewQueue(ACTIVE_MODULES, ctx, cards) });
  const startWeak = () =>
    startSession({ title: 'Weakest items', cards: buildWeakQueue(ACTIVE_MODULES, ctx, cards, Date.now(), ACTIVE_IDS), back: '/' });

  // suggestion: the module with the most due cards, otherwise the least practised one
  const suggestion = useMemo(() => {
    const byDue = [...ACTIVE_MODULES].sort((a, b) => (due.per[b.id] ?? 0) - (due.per[a.id] ?? 0));
    if (byDue[0] && due.per[byDue[0].id]) return { mod: byDue[0], why: `${due.per[byDue[0].id]} cards due` };
    return null;
  }, [due]);

  return (
    <div className="page">
      <CourseBar />
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
              {due.total === 0 ? 'nothing due – learn something new' : `card${due.total === 1 ? '' : 's'} in all courses`}
            </span>
          </div>
          {coursesWithDue.length > 0 && (
            <div className="row due-courses" style={{ gap: 8 }}>
              {coursesWithDue.map((c) => (
                <a key={c.id} className="tag tag-accent" href={`#/c/${c.id}`}>
                  {c.name} · {due.perCourse[c.id]}
                </a>
              ))}
            </div>
          )}
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
          <h2>Your courses</h2>
        </div>
        <CourseList onPick={() => navigate('/study')} />
      </div>

      <div className="section">
        <div className="section-head">
          <h2>{course.name}</h2>
          <span className="spacer" />
          <a href="#/study">Open course</a>
        </div>
        <CourseModules />
      </div>
    </div>
  );
}

/** The current course's modules (or its topics) as cards. */
function CourseModules() {
  const course = useCourse();
  const due = useDueCounts();
  const mods = courseEntries(course).map((e) => getModule(e.id)).filter((m) => !!m);
  if (course.topics?.length) {
    return (
      <div className="grid module-grid" style={{ '--min': '210px' } as React.CSSProperties}>
        {course.topics.map((t) => (
          <a key={t.id} className="card card-link module-card" href={`#/c/${course.id}/t/${t.id}`}>
            <div className="module-glyph">{t.name[0]}</div>
            <h3>{t.name}</h3>
            <div className="meta">
              <span>{t.modules} learning modules · no content yet</span>
            </div>
          </a>
        ))}
      </div>
    );
  }
  if (!mods.length) return <div className="card card-pad muted small">No content in this course yet – it will come from your own notes.</div>;
  return (
    <div className="grid module-grid" style={{ '--min': '210px' } as React.CSSProperties}>
      {mods.map((m) => (
        <ModuleCard key={m!.id} mod={m!} due={due.per[m!.id] ?? 0} />
      ))}
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
