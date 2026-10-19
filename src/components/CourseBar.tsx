/** Top of every main screen: the course switcher and the course's preparation meter. */
import { CourseGlyph } from './GlyphIcon';
import { useState } from 'react';
import { updateSettings } from '../core/store';
import { useCourse, useCourseMeters, useDueCounts } from '../core/hooks';
import type { CourseMeter } from '../core/meter';
import { COURSES } from '../courses';
import type { CourseConfig } from '../courses/types';
import { Icon } from './Icon';
import { ProgressRing } from './ProgressRing';
import { Sheet } from './Sheet';

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function CourseSeal({ course, small }: { course: CourseConfig; small?: boolean }) {
  return (
    <span className={`seal${small ? ' seal-sm' : ''}`} aria-hidden="true" style={{ '--tile': `var(--subject-${course.id}, var(--accent))` } as React.CSSProperties}>
      <CourseGlyph course={course} />
    </span>
  );
}

export function CourseBar() {
  const course = useCourse();
  const meters = useCourseMeters();
  const [sheet, setSheet] = useState<'switch' | 'meter' | null>(null);
  const meter = meters[course.id];
  const close = () => setSheet(null);
  return (
    <>
      <div className="course-bar">
        <button className="course-switch" onClick={() => setSheet('switch')} aria-haspopup="dialog" aria-label={`Course: ${course.name}. Switch course`}>
          <CourseSeal course={course} small />
          <span className="course-switch-text">
            <b>{course.name}</b>
            {course.subtitle && <span className="faint tiny">{course.subtitle}</span>}
          </span>
          <Icon name="chevron" size={16} className="chev-down" />
        </button>
        <span className="spacer" />
        <button className="meter-pill" onClick={() => setSheet('meter')} aria-haspopup="dialog" aria-label={`Prepared ${pct(meter.value)} – show breakdown`}>
          <ProgressRing value={meter.value} size={34} stroke={4} />
          <span className="meter-pill-text">
            <b>{pct(meter.value)}</b>
            <span className="faint tiny">prepared</span>
          </span>
        </button>
      </div>
      {sheet === 'switch' && (
        <Sheet title="Courses" onClose={close}>
          <CourseList onPick={close} />
        </Sheet>
      )}
      {sheet === 'meter' && (
        <Sheet title={`Preparation · ${course.name}`} onClose={close}>
          <MeterBreakdown meter={meter} />
        </Sheet>
      )}
    </>
  );
}

/** Every course with its meter and due count; picking one makes it the current course. */
export function CourseList({ onPick }: { onPick?: () => void }) {
  const current = useCourse();
  const meters = useCourseMeters();
  const due = useDueCounts();
  return (
    <div className="course-list">
      {COURSES.map((c) => {
        const d = due.perCourse[c.id] ?? 0;
        return (
          <button
            key={c.id}
            className={`card card-link course-option${c.id === current.id ? ' current' : ''}`}
            aria-current={c.id === current.id ? 'true' : undefined}
            onClick={() => {
              updateSettings({ course: c.id });
              onPick?.();
            }}
          >
            <CourseSeal course={c} />
            <span className="course-option-text">
              <b>{c.name}</b>
              <span className="faint small">{c.subtitle ?? c.description}</span>
            </span>
            <span className="course-option-meta">
              {d > 0 && <span className="tag tag-accent">{d} due</span>}
              <span className="faint small nowrap">{pct(meters[c.id].value)} prepared</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MeterBreakdown({ meter }: { meter: CourseMeter }) {
  return (
    <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <span className="tile-value">{pct(meter.value)}</span>
        <span className="muted small">prepared overall</span>
      </div>
      <ul className="meter-parts">
        {meter.parts.map((p) => (
          <li key={p.label}>
            <div className="row" style={{ gap: 8 }}>
              <b>{p.label}</b>
              <span className="faint small">{Math.round(p.share * 100)}% of the meter</span>
              <span className="spacer" />
              <b>{p.total ? pct(p.score) : '–'}</b>
            </div>
            <div className="bar">
              <span style={{ width: `${p.score * 100}%` }} />
            </div>
            <div className="row small faint" style={{ gap: 8 }}>
              {p.total ? (
                <span>
                  {p.learned} of {p.total} cards learned · {p.mastered} mastered
                </span>
              ) : (
                <span>No content yet</span>
              )}
              {p.unverified && <span className="tag tag-warn">{p.unverified === 'yes' ? 'unverified' : 'partly unverified'}</span>}
              {p.selfRated && <span className="tag">self-rated</span>}
            </div>
          </li>
        ))}
      </ul>
      <p className="faint small">
        A card counts half once you've answered it right on two different days, and fully when its next review is three or more weeks
        away. Each part is the average over all its cards, so new material lowers it until you learn it. "Unverified" content isn't
        from your own material yet.
      </p>
    </div>
  );
}
