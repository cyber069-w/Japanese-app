import { describe, expect, it } from 'vitest';
import { beforeTomorrow, defaultDue, newReading, setProgress, sortReadings } from './readings';

const now = new Date(2026, 9, 19, 12).getTime();
const lec = (subject: string, d: number, h = 10) => ({ subject, start: new Date(2026, 9, d, h).getTime(), end: new Date(2026, 9, d, h + 2).getTime() });
describe('reading defaults', () => {
  const lectures = [lec('BWL', 15), lec('BWL', 22), lec('BWL', 29), lec('Mikro', 20)];
  it('pre-lecture = next lecture of that course', () => {
    expect(defaultDue('pre', 'BWL', lectures, now)).toBe('2026-10-22');
    expect(defaultDue('pre', 'Mikro', lectures, now)).toBe('2026-10-20');
    expect(defaultDue('pre', 'CFA', lectures, now)).toBe('');
  });
  it('post-lecture = 2 days after the last lecture', () => {
    expect(defaultDue('post', 'BWL', lectures, now)).toBe('2026-10-17');
    expect(defaultDue('post', 'Mikro', lectures, now)).toBe('');
    expect(defaultDue('optional', 'BWL', lectures, now)).toBe('');
  });
});
describe('progress and tomorrow', () => {
  it('progress sets the status', () => {
    const r = newReading({ title: 'x' }, now);
    expect(setProgress(r, 40)).toMatchObject({ progress: 40, status: 'reading' });
    expect(setProgress(r, 130)).toMatchObject({ progress: 100, status: 'done' });
    expect(setProgress({ ...r, progress: 50, status: 'reading' }, 0).status).toBe('todo');
  });
  it('lists open pre-lecture readings before tomorrow’s lectures', () => {
    const a = newReading({ title: 'a', course: 'BWL', kind: 'pre' }, 1), b = newReading({ title: 'b', course: 'Mikro', kind: 'pre', due: '2026-10-20' }, 2),
      c = newReading({ title: 'c', course: 'BWL', kind: 'post' }, 3), d = newReading({ title: 'd', course: 'BWL', kind: 'pre', status: 'done' }, 4), e = newReading({ title: 'e', course: 'CFA', kind: 'pre', due: '2026-11-01' }, 5);
    expect(beforeTomorrow([a, b, c, d, e], ['BWL'], '2026-10-20').map((r) => r.title)).toEqual(['a', 'b']);
  });
  it('sorts by due date, done last', () => {
    const l = [newReading({ title: 'late', due: '2026-11-01' }, 1), newReading({ title: 'done', due: '2026-10-01', status: 'done' }, 2), newReading({ title: 'soon', due: '2026-10-20' }, 3), newReading({ title: 'none' }, 4)];
    expect(sortReadings(l).map((r) => r.title)).toEqual(['soon', 'late', 'none', 'done']);
  });
});
