/** Reading list: items with kind, due date defaults from the timetable, and "before tomorrow's lectures". Pure helpers. */
export type ReadingKind = 'pre' | 'post' | 'optional';
export const KINDS: Array<{ id: ReadingKind; label: string }> = [{ id: 'pre', label: 'Pre-lecture' }, { id: 'post', label: 'Post-lecture' }, { id: 'optional', label: 'Optional' }];
export type ReadingStatus = 'todo' | 'reading' | 'done';
export interface Reading {
  id: string; title: string; course: string; kind: ReadingKind;
  /** "Canvas file: x.pdf", a link, or "Book, chapter 3" */
  source: string; pages: string; /** YYYY-MM-DD */ due: string; status: ReadingStatus; progress: number; created: number;
}

export const newReading = (p: Partial<Reading> = {}, now = Date.now()): Reading => ({
  id: `r${now}${Math.random().toString(36).slice(2, 5)}`, title: '', course: '', kind: 'pre', source: '', pages: '', due: '', status: 'todo', progress: 0, created: now, ...p,
});

const day = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export interface LectureRef { subject: string; start: number; end: number }

/** Pre-lecture: the day of the next lecture of the course. Post-lecture: 2 days after the last lecture. Optional: none. */
export function defaultDue(kind: ReadingKind, course: string, lectures: LectureRef[], now: number): string {
  const mine = lectures.filter((l) => l.subject === course).sort((a, b) => a.start - b.start);
  if (kind === 'pre') { const n = mine.find((l) => l.start > now); return n ? day(n.start) : ''; }
  if (kind === 'post') { const past = mine.filter((l) => l.end <= now); const last = past[past.length - 1]; return last ? day(last.end + 2 * 86_400_000) : ''; }
  return '';
}

export function setProgress(r: Reading, progress: number): Reading {
  const p = Math.min(100, Math.max(0, Math.round(progress)));
  return { ...r, progress: p, status: p >= 100 ? 'done' : p > 0 ? 'reading' : 'todo' };
}

/** Open pre-lecture readings for courses that have a lecture tomorrow, or are due by tomorrow. */
export function beforeTomorrow(list: Reading[], tomorrowLectureCourses: string[], tomorrowKey: string): Reading[] {
  const courses = new Set(tomorrowLectureCourses);
  return list.filter((r) => r.status !== 'done' && r.kind === 'pre' && (courses.has(r.course) || (r.due !== '' && r.due <= tomorrowKey)));
}

export const sortReadings = (list: Reading[]) =>
  [...list].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || (a.due || '9999').localeCompare(b.due || '9999') || a.created - b.created);

export const readingMinutes = (progress: number) => progress;
