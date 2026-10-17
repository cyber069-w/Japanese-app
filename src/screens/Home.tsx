/** Home: pick a subject. Subject content (and anything Japanese) only appears after you open one. */
import { useEffect } from 'react';
import { useCourseMeters, useDueCounts } from '../core/hooks';
import { initFocus, useFocus } from '../core/focusStore';
import { COURSES } from '../courses';
import { dayKey, formatDuration } from '../lib/date';
import { Icon } from '../components/Icon';
import { CourseGlyph } from '../components/GlyphIcon';

function greeting(h: number) {
  if (h < 5) return 'Still up? Keep it short tonight.';
  if (h < 11) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const SOON = [
  { name: 'Canvas inbox', note: 'Deadlines and course files sorted into your subjects', icon: 'import' },
  { name: 'Mock exams', note: 'Timed tests across a whole subject', icon: 'exam' },
  { name: 'Study plan', note: 'A weekly plan from your exam dates', icon: 'calendar' },
];

export function Home() {
  const due = useDueCounts();
  const meters = useCourseMeters();
  const focus = useFocus();
  useEffect(initFocus, []);
  const focusToday = focus.sessions.filter((s) => s.day === dayKey()).reduce((n, s) => n + s.effectiveSec, 0);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <div className="eyebrow">{date}</div>
          <h1 style={{ marginTop: 6 }}>{greeting(new Date().getHours())}</h1>
          <div className="muted" style={{ marginTop: 4 }}>Pick a subject to continue.</div>
        </div>
      </div>

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
        <a className="subject-tile" href="#/focus" style={{ '--tile': 'var(--subject-focus)' } as React.CSSProperties}>
          <span className="subject-icon"><Icon name="clock" size={22} /></span>
          <span>
            <b className="subject-name">Focus</b>
            <span className="subject-note">Log lectures and study time</span>
          </span>
          <span className="subject-meta">
            {focus.active ? <span className="subject-due">timer running</span> : <span>{focusToday ? `${formatDuration(focusToday * 1000)} today` : 'nothing logged today'}</span>}
          </span>
        </a>
        {SOON.map((s) => (
          <div key={s.name} className="subject-tile soon" aria-disabled="true">
            <span className="subject-icon"><Icon name={s.icon} size={22} /></span>
            <span>
              <b className="subject-name">{s.name}</b>
              <span className="subject-note">{s.note}</span>
            </span>
            <span className="subject-meta"><span>Coming soon</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
