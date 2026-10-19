/** Home: a frosted-glass overview – lessons, to-dos, timer, reviews, week – then what to do next and the subjects. */
import { useEffect, useRef, useState } from 'react';
import { useStored } from '../core/kv';
import { newInboxItem, type InboxItem } from '../core/inbox';
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
import { DraftSheet } from '../components/home/DraftSheet';
import { ExamRecordBanner } from '../components/home/ExamRecord';
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
  const [inbox, setInbox] = useStored<InboxItem[]>('inbox', []);
  const [capture, setCapture] = useState('');
  const captureRef = useRef<HTMLInputElement>(null);
  // N focuses the quick-capture field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable) return;
      e.preventDefault();
      captureRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
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

      <form className="capture" onSubmit={(e) => { e.preventDefault(); if (capture.trim()) { setInbox([newInboxItem(capture), ...inbox]); setCapture(''); } }}>
        <input ref={captureRef} className="input" placeholder="Capture a thought…  (press N)" value={capture} onChange={(e) => setCapture(e.target.value)} aria-label="Quick capture" />
        {inbox.length > 0 && <span className="faint tiny">{inbox.length} in inbox – sorted in your shutdown</span>}
      </form>
      <ShutdownBanner />
      <ExamRecordBanner />
      {new Date().getDay() === 0 && (
        <div className="glass shutdown-banner"><Icon name="calendar" size={18} /><b className="grow">Sunday – plan next week</b><button className="btn btn-sm btn-primary" onClick={() => setSunday(true)}>Plan with Claude</button></div>
      )}
      {t.draft && <DraftSheet draft={t.draft} onClose={t.closeDraft} />}
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
                    <button className="btn btn-sm today-action" onClick={() => t.act(i)}>{i.action.label}</button>
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
      </div>

      <div className="section-head" style={{ marginTop: 28 }}><h2>Tools</h2></div>
      <div className="tool-grid">
        {[
          { href: '#/applications', icon: 'user', name: 'Applications', meta: activeApps ? `${activeApps} active` : 'pipeline, watchlist' },
          { href: '#/readings', icon: 'book', name: 'Reading list', meta: openReadings ? `${openReadings} open` : 'readings, news' },
          { href: '#/clubs', icon: 'user', name: 'Clubs', meta: clubs.length ? `${clubs.length} club${clubs.length === 1 ? '' : 's'}` : 'notes, checklists' },
          { href: '#/finance', icon: 'lock', name: 'Finance', meta: 'study costs, locked' },
          { href: '#/market', icon: 'chart-line', name: 'Market log', meta: 'one line a day' },
          { href: '#/grading', icon: 'pen', name: 'Overnight grading', meta: 'feedback by morning' },
          { href: '#/shutdown', icon: 'clock', name: 'Shutdown', meta: 'close the day' },
          { href: 'https://monkeytype.com', icon: 'keyboard', name: 'Monkeytype', meta: 'typing ↗', ext: true },
        ].map((x) => (
          <a key={x.name} className="tool-tile" href={x.href} {...(x.ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
            <span className="tool-icon"><Icon name={x.icon} size={18} /></span>
            <span><b>{x.name}</b><small>{x.meta}</small></span>
          </a>
        ))}
      </div>
    </div>
  );
}
