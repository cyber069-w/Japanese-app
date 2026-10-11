import { useMemo } from 'react';
import { useApp } from '../core/store';
import { useCtx, useDueCounts } from '../core/hooks';
import { bestStreak, heatColor, itemStats, lastDays, moduleTotals, streak, totals } from '../core/stats';
import { exerciseItems } from '../core/session';
import type { StudyModule } from '../core/types';
import { MODULES } from '../modules';
import { dayKey, formatDuration } from '../lib/date';
import { Icon } from '../components/Icon';

export function Stats() {
  const days = useApp((s) => s.days);
  const cards = useApp((s) => s.cards);
  const due = useDueCounts();
  const t = totals(days);
  const learned = useMemo(() => Object.values(cards).filter((c) => c.step === -1).length, [cards]);
  const activity = lastDays(days, 30);
  const maxDay = Math.max(1, ...activity.map((d) => d.reviews));

  const tiles: Array<[string, string, Parameters<typeof Icon>[0]['name'], string?]> = [
    [String(days[dayKey()]?.reviews ?? 0), 'answers today', 'zap'],
    [String(streak(days)), 'day streak', 'flame', 'flame'],
    [String(bestStreak(days)), 'best streak', 'sparkle'],
    [String(due.total), 'due today', 'review'],
    [t.reviews ? `${Math.round(t.accuracy * 100)}%` : '–', 'accuracy', 'target'],
    [String(t.reviews), 'answers', 'check'],
    [formatDuration(t.ms), 'time studied', 'clock'],
    [String(learned), 'cards learned', 'book'],
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Stats</h1>
          <div className="page-title-ja" lang="ja">成績</div>
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
        </div>
        <div className="card card-pad">
          {MODULES.filter((m) => m.status === 'ready').map((m) => {
            const mt = moduleTotals(days, m.id);
            return (
              <div className="mod-row" key={m.id}>
                <span className="serif" lang="ja">{m.icon}</span>
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

      <LessonProgress />

      {MODULES.filter((m) => m.chart).map((m) => (
        <Heatmap key={m.id} mod={m} />
      ))}
    </div>
  );
}

function Heatmap({ mod }: { mod: StudyModule }) {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  const stats = useMemo(() => itemStats(cards, mod.id), [cards, mod.id]);
  const sections = mod.chart!(ctx);
  if (!sections.length) return null;
  return (
    <div className="section">
      <div className="section-head">
        <h2>{mod.name} chart</h2>
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

/** Progress per Minna no Nihongo lesson, for every module whose items carry a lesson number. */
function LessonProgress() {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  const rows = useMemo(() => {
    const out: Array<{ lesson: number; parts: Array<{ mod: StudyModule; learned: number; total: number }> }> = [];
    for (const mod of MODULES) {
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
  }, [ctx, cards]);
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
