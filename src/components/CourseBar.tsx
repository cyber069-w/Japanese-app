/** Top of every main screen: the course switcher. */
import { CourseGlyph } from './GlyphIcon';
import { useState } from 'react';
import { updateSettings } from '../core/store';
import { useCourse, useDueCounts } from '../core/hooks';
import { COURSES } from '../courses';
import type { CourseConfig } from '../courses/types';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

export function CourseSeal({ course, small }: { course: CourseConfig; small?: boolean }) {
  if (course.id === 'cfa') {
    return (
      <span className={`seal seal-logo${small ? ' seal-sm' : ''}`} aria-hidden="true"><img src="/icons/cfa-logo.svg" alt="" /></span>
    );
  }
  return (
    <span className={`seal${small ? ' seal-sm' : ''}`} aria-hidden="true" style={{ '--tile': `var(--subject-${course.id}, var(--accent))` } as React.CSSProperties}>
      <CourseGlyph course={course} />
    </span>
  );
}

export function CourseBar() {
  const course = useCourse();
  const [sheet, setSheet] = useState<'switch' | null>(null);
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
      </div>
      {sheet === 'switch' && (
        <Sheet title="Courses" onClose={close}>
          <CourseList onPick={close} />
        </Sheet>
      )}
    </>
  );
}

/** Every course with its due count; picking one makes it the current course. */
export function CourseList({ onPick }: { onPick?: () => void }) {
  const current = useCourse();
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
            </span>
          </button>
        );
      })}
    </div>
  );
}
