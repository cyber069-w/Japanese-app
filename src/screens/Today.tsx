/** Today (#/today): one ordered list – the one deadline that matters, cards due, then lectures and two suggested study blocks. */
import { useEffect } from 'react';
import { useToday } from '../components/todayData';
import { useDueCounts } from '../core/hooks';
import { initFocus } from '../core/focusStore';
import { navigate } from '../lib/router';
import { hhmm, subjectColor } from './FocusWidget';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';

export function Today() {
  const t = useToday();
  const due = useDueCounts();
  useEffect(initFocus, []);
  const important = t.shown.find((i) => i.kind === 'deadline' || i.kind === 'suggestion' || i.kind === 'application' || i.kind === 'club');
  const upcoming = t.day.filter((b) => b.end > t.now);
  // lectures stay, but only two suggested study blocks
  let blocks = 0;
  const timeline = upcoming.filter((b) => b.kind === 'lecture' || (b.kind === 'study' && ++blocks <= 2));
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="page">
      <div className="page-head"><div className="grow"><div className="eyebrow">{date}</div><h1 style={{ marginTop: 6 }}>Today</h1><div className="muted" style={{ marginTop: 4 }}>What matters now, in order. <a href="#/">Full overview →</a></div></div></div>
      <div className="stack" style={{ '--gap': '14px', maxWidth: 720 } as React.CSSProperties}>
        <section className="glass">
          <div className="glass-head"><h2>The one deadline that matters</h2></div>
          {important ? (
            <div className="today-row" style={{ borderTop: 0 }}>
              <div className="grow"><div className="today-title">{important.title.slice(0, 140)}</div><div className="today-meta">{[important.subject, ...important.why, important.due ? `due ${new Date(important.due).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : null].filter(Boolean).join(' · ')}</div></div>
              <button className="btn btn-primary btn-sm" onClick={() => t.run(important.action)}>{important.action.label}</button>
            </div>
          ) : <EmptyState icon="check" title="No open deadline" hint="Accept Canvas deadlines or add application dates to see the next one here." />}
        </section>
        <section className="glass">
          <div className="glass-head"><h2>Cards due</h2></div>
          <div className="row"><span className="big-number" style={{ fontSize: '2.4rem' }}>{due.total}</span><span className="muted small">card{due.total === 1 ? '' : 's'} due today</span><span className="spacer" /><button className="btn btn-primary" disabled={!due.total} onClick={() => navigate('/review')}><Icon name="review" size={16} /> Review now</button></div>
        </section>
        <section className="glass">
          <div className="glass-head"><h2>Lectures and study blocks</h2><span className="faint tiny">{hhmm(t.winStart)}–{hhmm(t.winEnd)}</span></div>
          {timeline.length === 0 ? <EmptyState icon="calendar" title="Nothing scheduled" hint={t.calendar === null ? 'Import your timetable in Focus to see lectures.' : 'No lecture or free block left in your day window.'} /> : (
            <ul className="slots">
              {timeline.map((b) => (
                <li key={`${b.kind}${b.start}`} className={`slot ${b.kind}${b.start <= t.now ? ' now' : ''}`}>
                  <span className="slot-time">{hhmm(b.start)}<small>{hhmm(b.end)}</small></span>
                  <span className="slot-bar" style={{ background: b.subject ? subjectColor(b.subject) : undefined }} />
                  <span className="slot-main"><b>{b.kind === 'lecture' ? b.title : `Study ${b.subject}`}</b><small>{b.kind === 'lecture' ? 'lecture' : b.planned ? 'planned' : 'suggested'}</small></span>
                  {b.kind === 'study' && b.subject && <button className="btn btn-sm btn-primary" onClick={() => t.run({ type: 'timer', label: '', subject: b.subject! })}>Start</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
