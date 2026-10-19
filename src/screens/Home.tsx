/** Home: a frosted-glass overview – lessons, to-dos, timer, reviews, week – then what to do next and the subjects. */
import { useEffect, useState } from 'react';
import { useCourseMeters, useDueCounts } from '../core/hooks';
import { initFocus } from '../core/focusStore';
import { COURSES } from '../courses';
import { Icon } from '../components/Icon';
import { HeadIcon } from '../components/HeadIcon';
import { CourseGlyph } from '../components/GlyphIcon';
import { useToday } from '../components/todayData';
import { CardsCard, FocusCard, LessonsCard, TodosCard, WeekCard } from '../components/home/cards';
import { HORIZON_LABEL, groupByHorizon } from '../core/today';

function greeting(h: number) {
  if (h < 5) return 'Still up?';
  if (h < 11) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Home() {
  const due = useDueCounts();
  const meters = useCourseMeters();
  const t = useToday();
  const [all, setAll] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  useEffect(initFocus, []);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  // Deadlines are in the to-do card; the list below is everything else that needs you
  const rest = t.shown.filter((i) => i.kind !== 'deadline' && i.kind !== 'suggestion');
  const top = all ? rest : rest.slice(0, 6);

  return (
    <div className="page home">
      <div className="page-head">
        <div className="grow">
          <div className="eyebrow">{date}</div>
          <h1 style={{ marginTop: 6 }}>{greeting(new Date().getHours())}</h1>
        </div>
      </div>

      <div className="bento">
        <LessonsCard t={t} />
        <TodosCard t={t} />
        <FocusCard />
        <CardsCard />
        <WeekCard />
      </div>

      {rest.length > 0 && (
        <section className="glass home-list">
          <div className="glass-head"><h2><HeadIcon name="sparkle" color="#ff453a" />What to do next</h2><span className="faint tiny">{rest.length} open · fixed rules, no AI</span></div>
          {groupByHorizon(top).map((g) => (
            <div key={g.horizon}>
              <div className="eyebrow" style={{ margin: '10px 0 2px' }}>{HORIZON_LABEL[g.horizon]}</div>
              <ul className="today-list">
                {g.items.map((i) => (
                  <li key={i.id} className="today-row">
                    <div className="grow">
                      <div className="today-title">{i.title.length > 120 ? `${i.title.slice(0, 117)}…` : i.title}</div>
                      <div className="today-meta">{[i.subject !== '–' ? i.subject : null, ...i.why].filter(Boolean).join(' · ')}</div>
                    </div>
                    <button className="btn btn-sm today-action" onClick={() => t.run(i.action)}>{i.action.label}</button>
                    <button className="btn btn-sm btn-ghost" aria-label="Dismiss" title="Dismiss for 7 days" onClick={() => t.dismiss(i.id)}><Icon name="x" size={15} /></button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="row" style={{ marginTop: 8 }}>
            {rest.length > 6 && <button className="btn btn-sm" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all (${rest.length})`}</button>}
            {t.hiddenItems.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => setShowDismissed(!showDismissed)}>Dismissed ({t.hiddenItems.length})</button>}
          </div>
          {showDismissed && (
            <ul className="today-list">
              {t.hiddenItems.map((i) => (
                <li key={i.id} className="today-row"><div className="grow muted">{i.title.slice(0, 100)}</div><button className="btn btn-sm" onClick={() => t.restore(i.id)}>Restore</button></li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="section-head" style={{ marginTop: 28 }}><h2>Subjects</h2></div>
      <div className="subject-grid">
        {COURSES.map((c) => {
          const n = due.perCourse[c.id] ?? 0;
          const pct = Math.round((meters[c.id]?.value ?? 0) * 100);
          return (
            <a key={c.id} className="subject-tile" href={`#/c/${c.id}`} style={{ '--tile': `var(--subject-${c.id}, var(--ink))` } as React.CSSProperties}>
              <span className="subject-icon"><CourseGlyph course={c} size={22} /></span>
              <span>
                <b className="subject-name">{c.name}</b>
                <span className="subject-note">{c.subtitle}</span>
              </span>
              <span className="subject-meta">
                {n > 0 ? <span className="subject-due">{n} due</span> : <span>nothing due</span>}
                <span>{pct}% prepared</span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
