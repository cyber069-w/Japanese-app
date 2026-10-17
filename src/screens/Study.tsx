import { useCourse } from '../core/hooks';
import { CoursePage } from './Course';

/** The Study tab shows the current course. */
export function Study() {
  return <CoursePage course={useCourse()} />;
}
