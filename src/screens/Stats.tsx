import { useEffect, useMemo } from 'react';
import { ModuleGlyph } from '../components/GlyphIcon';
import { useApp } from '../core/store';
import { useCourse, useCtx, useDueCounts } from '../core/hooks';
import { bestStreak, heatColor, itemStats, lastDays, moduleTotals, streak, totals } from '../core/stats';
import { exerciseItems } from '../core/session';
import type { StudyModule } from '../core/types';
import { courseModules } from '../courses';
import { dayKey, daysUntil, formatDuration } from '../lib/date';
import { Icon } from '../components/Icon';
import { CourseBar } from '../components/CourseBar';
import { initFocus, useFocus } from '../core/focusStore';

export function Stats() {
  const course = useCourse();
  const mods = useMemo(() => courseModules(course), [course]);
  const days = useApp((s) => s.days);
  const settings = useApp((s) => s.settings);
  const cards = useApp((s) => s.cards);
  const due = useDueCounts();
  const t = totals(days);
  const learned = useMemo(() => Object.values(cards).filter((c) => c.step === -1).length, [cards]);
  const activity = lastDays(days, 30);
  const maxDay = Math.max(1, ...activity.map((d) => d.reviews));
  const focus = useFocus();
  useEffect(initFocus, []);
  const focusDays = useMemo(() => {
    const out: Array<{ key: string; sec: number }> = [];
    for (let i = 13; i >= 0; i--) out.push({ key: dayKey(new Date(Date.now() - i * 86400_000)), sec: 0 });
    focus.sessions.forEach((s) => {
      const d = out.find((x) => x.key === s.day);
      if (d) d.sec += s.effectiveSec;
    });
    return out;
  }, [focus.sessions]);
  const focusWeek = focusDays.slice(-7).reduce((n, d) => n + d.sec, 0);
  const focusTotal = focus.sessions.reduce((n, s) => n + s.effectiveSec, 0);
  const lectureWeek = focus.sessions.filter((s) => s.kind === 'lecture' && s.day >= focusDays[7].key).reduce((n, s) => n + s.effectiveSec, 0);
  const focusMax = Math.max(1, ...focusDays.map((d) => d.sec));

  const tiles: Array<[string, string, Parameters<typeof Icon>[0]['name'], string?]> = [
    [String(days[dayKey()]?.reviews ?? 0), 'answers today', 'zap'],
    [String(streak(days)), 'day streak', 'flame', 'flame'],
    [String(bestStreak(days)), 'best streak', 'sparkle'],
    [String(due.total), 'due today', 'review'],
    [t.reviews ? `${Math.round(t.accuracy * 100)}%` : '–', 'accuracy', 'target'],
    [String(t.reviews), 'answers', 'check'],
    [formatDuration(t.ms), 'time studied', 'clock'],
    [String(learned), 'cards learned', 'book'],
    ...(settings.examDate && daysUntil(settings.examDate) >= 0 ? [[String(daysUntil(settings.examDate)), 'days to the exam', 'calendar'] as [string, string, string]] : []),
  ];

  return (
    <div className="page">
      <CourseBar />
      <div className="page-head">
        <div className="grow">
          <h1>Stats</h1>
          <div className="muted" style={{ marginTop: 4 }}>Answers, accuracy and focus time.</div>
        </div>
      </div>

      <div className="stat-tiles">
        {tiles.map(([v, label, icon, cls]) => (
          <div className="card tile" key={label}>
            <div className={`tile-icon ${cls ?? ''}`}>
              <Icon name={icon} size={18} />
            </div>
            <div className="tile-value">{v}</div>
            <div className="tile-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Focus time</h2>
          <span className="spacer" />
          <a href="#/focus" className="faint">Open Focus</a>
        </div>
        <div className="card card-pad">
          {focus.sessions.length === 0 ? (
            <p className="muted small">Nothing logged yet – start a timer on the Focus page.</p>
          ) : (
            <>
              <div className="row small" style={{ gap: 18, marginBottom: 12 }}>
                <span><b>{formatDuration(focusWeek * 1000)}</b> <span className="muted">last 7 days</span></span>
                <span><b>{formatDuration(lectureWeek * 1000)}</b> <span className="muted">in lectures</span></span>
                <span><b>{formatDuration(focusTotal * 1000)}</b> <span className="muted">in total</span></span>
              </div>
              <div className="chart-bars" role="img" aria-label="Focus time per day, last 14 days">
                {focusDays.map((d, i) => (
                  <div key={d.key} className={`${d.sec ? '' : 'zero'}${i === focusDays.length - 1 ? ' today' : ''}`} style={{ height: `${(d.sec / focusMax) * 100}%` }} title={`${d.key}: ${formatDuration(d.sec * 1000)}`} />
                ))}
              </div>
              <div className="row faint tiny" style={{ marginTop: 8 }}>
                <span>{focusDays[0].key.slice(5)}</span>
                <span className="spacer" />
                <span>today</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Last 30 days</h2>
          <span className="spacer" />
          <span className="faint">{activity.reduce((s, d) => s + d.reviews, 0)} answers</span>
        </div>
        <div className="card card-pad">
          <div className="chart-bars" role="img" aria-label="Answers per day, last 30 days">
            {activity.map((d, i) => (
              <div
                key={d.key}
                className={`${d.reviews ? '' : 'zero'}${i === activity.length - 1 ? ' today' : ''}`}
                style={{ height: `${(d.reviews / maxDay) * 100}%` }}
                title={`${d.key}: ${d.reviews} answers`}
              />
            ))}
          </div>
          <div className="row faint tiny" style={{ marginTop: 8 }}>
            <span>{activity[0].key.slice(5)}</span>
            <span className="spacer" />
            <span>today</span>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Accuracy by module</h2>
          <span className="spacer" />
          <span className="faint">{course.name}</span>
        </div>
        <div className="card card-pad">
          {!mods.length && <div className="muted small">No modules in {course.name} yet.</div>}
          {mods.map((m) => {
            const mt = moduleTotals(days, m.id);
            return (
              <div className="mod-row" key={m.id}>
                <span className="serif"><ModuleGlyph mod={m} /></span>
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <b>{m.name}</b>
                    <span className="faint small">
                      {mt.reviews} answers · {formatDuration(mt.ms)}
                    </span>
                  </div>
                  <div className="bar" style={{ marginTop: 6 }}>
                    <span style={{ width: `${mt.accuracy * 100}%`, background: mt.reviews ? heatColor(mt.accuracy) : undefined }} />
                  </div>
                </div>
                <b>{mt.reviews ? `${Math.round(mt.accuracy * 100)}%` : '–'}</b>
              </div>
            );
          })}
        </div>
      </div>

      <LessonProgress mods={mods} />
    </div>
  );
}

/** Progress per Minna no Nihongo lesson, for every module whose items carry a lesson number. */
function LessonProgress({ mods }: { mods: StudyModule[] }) {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  const rows = useMemo(() => {
    const out: Array<{ lesson: number; parts: Array<{ mod: StudyModule; learned: number; total: number }> }> = [];
    for (const mod of mods) {
      const ex = mod.exercises[0];
      if (!ex || ex.generative) continue;
      const items = exerciseItems(ex, ctx).filter((i) => typeof i.lesson === 'number');
      if (!items.length) continue;
      const st = itemStats(cards, mod.id);
      const byLesson = new Map<number, { learned: number; total: number }>();
      for (const it of items) {
        const b = byLesson.get(it.lesson!) ?? { learned: 0, total: 0 };
        b.total++;
        if (st.get(it.id)?.learned) b.learned++;
        byLesson.set(it.lesson!, b);
      }
      for (const [lesson, b] of byLesson) {
        let row = out.find((r) => r.lesson === lesson);
        if (!row) out.push((row = { lesson, parts: [] }));
        row.parts.push({ mod, ...b });
      }
    }
    return out.sort((a, b) => a.lesson - b.lesson);
  }, [ctx, cards, mods]);
  if (!rows.length) return null;
  return (
    <div className="section">
      <div className="section-head">
        <h2>Minna no Nihongo lessons</h2>
        <span className="spacer" />
        <span className="faint">cards learned</span>
      </div>
      <div className="card card-pad">
        {rows.map((r) => (
          <div className="mod-row" key={r.lesson} style={{ gridTemplateColumns: '64px 1fr' }}>
            <b>{r.lesson === 0 ? 'Intro' : `L${r.lesson}`}</b>
            <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
              {r.parts.map((p) => (
                <div key={p.mod.id} className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                  <span className="faint small" style={{ width: 80 }}>{p.mod.name}</span>
                  <div className="bar" style={{ flex: 1 }}>
                    <span style={{ width: `${(p.learned / p.total) * 100}%` }} />
                  </div>
                  <span className="small nowrap" style={{ width: 54, textAlign: 'right' }}>
                    {p.learned}/{p.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
