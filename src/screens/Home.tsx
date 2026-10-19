/** Home: a frosted-glass overview – lessons, to-dos, timer, reviews, week – then what to do next and the subjects. */
import { useEffect, useState } from 'react';
import { useStored } from '../core/kv';
import { isActive, type Application } from '../core/applications';
import type { Club } from '../core/clubs';
import type { Reading } from '../core/readings';
import { useDueCounts } from '../core/hooks';
import { initFocus } from '../core/focusStore';
import { refreshCanvas } from '../core/canvas';
import { syncNow } from '../core/sync';
import { usePullToRefresh } from '../lib/pullToRefresh';
import { COURSES } from '../courses';
import { Icon } from '../components/Icon';
import { ShutdownBanner } from '../components/home/ShutdownBanner';
import { EmptyState } from '../components/EmptyState';
import { HeadIcon } from '../components/HeadIcon';
import { CourseGlyph } from '../components/GlyphIcon';
import { useWeeklyReport } from '../components/useReport';
import { PlanSheet } from '../components/home/PlanSheet';
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
  const t = useToday();
  const weekly = useWeeklyReport(0);
  const [sunday, setSunday] = useState(false);
  const [apps] = useStored<Application[]>('applications', []);
  const [readings] = useStored<Reading[]>('readings', []);
  const [clubs] = useStored<Club[]>('clubs', []);
  const openReadings = readings.filter((r) => r.status !== 'done').length;
  const activeApps = apps.filter((a) => a.stage !== 'researching' && isActive(a)).length;
  const ptr = usePullToRefresh(() => Promise.all([refreshCanvas(), syncNow()]));
  const [all, setAll] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  useEffect(initFocus, []);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  // Deadlines are in the to-do card; the list below is everything else that needs you
  const rest = t.shown.filter((i) => i.kind !== 'deadline' && i.kind !== 'suggestion' && i.kind !== 'application' && i.kind !== 'club');
  const top = all ? rest : rest.slice(0, 6);

  return (
    <div className="page home">
      <div className="ptr" style={{ transform: `translate(-50%, ${ptr.busy ? 14 : ptr.pull ? ptr.pull - 46 : -60}px)` }} role="status">{ptr.busy ? 'Refreshing…' : ptr.ready ? 'Release to refresh' : 'Pull to refresh'}</div>
      <div className="page-head">
        <div className="grow">
          <div className="eyebrow">{date}</div>
          <h1 style={{ marginTop: 6 }}>{greeting(new Date().getHours())}</h1>
          <a className="small" href="#/today">Just what matters now →</a>
        </div>
      </div>

      <ShutdownBanner />
      {new Date().getDay() === 0 && (
        <div className="glass shutdown-banner"><Icon name="calendar" size={18} /><b className="grow">Sunday – plan next week</b><button className="btn btn-sm btn-primary" onClick={() => setSunday(true)}>Plan with Claude</button></div>
      )}
      {sunday && <PlanSheet t={t} report={weekly.md} onClose={() => setSunday(false)} />}

      <div className="bento">
        <LessonsCard t={t} />
        <TodosCard t={t} />
        <FocusCard />
        <CardsCard />
        <WeekCard />
      </div>

      {rest.length === 0 && (
        <section className="glass home-list"><EmptyState icon="check" title="All clear" hint="No announcements, new files or open cards need you right now." /></section>
      )}
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
          return (
            <a key={c.id} className="subject-tile" href={`#/c/${c.id}`} style={{ '--tile': `var(--subject-${c.id}, var(--ink))` } as React.CSSProperties}>
              <span className="subject-icon"><CourseGlyph course={c} size={22} /></span>
              <span>
                <b className="subject-name">{c.name}</b>
                <span className="subject-note">{c.subtitle}</span>
              </span>
              <span className="subject-meta">
                {n > 0 ? <span className="subject-due">{n} due</span> : <span>nothing due</span>}
              </span>
            </a>
          );
        })}
        <a className="subject-tile" href="#/applications" style={{ '--tile': 'var(--subject-focus)' } as React.CSSProperties}>
          <span className="subject-icon"><Icon name="user" size={22} /></span>
          <span><b className="subject-name">Applications</b><span className="subject-note">Pipeline and watchlist</span></span>
          <span className="subject-meta"><span>{activeApps ? `${activeApps} active` : 'nothing active'}</span></span>
        </a>
        <a className="subject-tile" href="#/finance" style={{ '--tile': 'var(--subject-cfa)' } as React.CSSProperties}>
          <span className="subject-icon"><Icon name="lock" size={22} /></span>
          <span><b className="subject-name">Finance</b><span className="subject-note">Study costs, password-protected</span></span>
          <span className="subject-meta"><span>locked</span></span>
        </a>
        <a className="subject-tile" href="https://monkeytype.com" target="_blank" rel="noreferrer" style={{ '--tile': 'var(--subject-bwl)' } as React.CSSProperties}>
          <span className="subject-icon"><Icon name="keyboard" size={22} /></span>
          <span><b className="subject-name">Monkeytype</b><span className="subject-note">Typing practice ↗</span></span>
          <span className="subject-meta"><span>opens monkeytype.com</span></span>
        </a>
        <a className="subject-tile" href="#/market" style={{ '--tile': 'var(--subject-interview)' } as React.CSSProperties}>
          <span className="subject-icon"><Icon name="chart-line" size={22} /></span>
          <span><b className="subject-name">Market log</b><span className="subject-note">One line a day → interview cards</span></span>
        </a>
        <a className="subject-tile" href="#/clubs" style={{ '--tile': 'var(--subject-recht)' } as React.CSSProperties}>
          <span className="subject-icon"><Icon name="user" size={22} /></span>
          <span><b className="subject-name">Clubs</b><span className="subject-note">Notes and checklists</span></span>
          <span className="subject-meta"><span>{clubs.length ? `${clubs.length} club${clubs.length === 1 ? '' : 's'}` : 'none yet'}</span></span>
        </a>
        <a className="subject-tile" href="#/readings" style={{ '--tile': 'var(--subject-bwl)' } as React.CSSProperties}>
          <span className="subject-icon"><Icon name="book" size={22} /></span>
          <span><b className="subject-name">Reading list</b><span className="subject-note">Readings and news</span></span>
          <span className="subject-meta"><span>{openReadings ? `${openReadings} open` : 'nothing open'}</span></span>
        </a>
      </div>
    </div>
  );
}
