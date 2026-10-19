import { describe, expect, it } from 'vitest';
import { buildDay, buildItems, canvasStatus, focusSubject, groupByHorizon, horizonOf, mergeDuplicates, visibleItems, type TodayInput } from './today';

const now = new Date(2026, 9, 19, 10, 0).getTime();
const at = (h: number, m = 0, d = 19) => new Date(2026, 9, d, h, m).getTime();
const base: TodayInput = { now, accepted: [], suggestions: [], announcements: [], files: [], cards: [], lectures: [], gaps: [] };
const dl = (id: string, due: number | null, subject = 'BWL') => ({ id, course: subject, subject, title: `Aufgabe ${id}`, due: due ? new Date(due).toISOString() : null, kind: 'assignment' });

describe('horizons', () => {
  it('sorts times into the right group', () => {
    expect(horizonOf(now - 1, now)).toBe('overdue');
    expect(horizonOf(now + 3_600_000, now)).toBe('soon');
    expect(horizonOf(at(18), now)).toBe('today');
    expect(horizonOf(at(9, 0, 20), now)).toBe('tomorrow');
    expect(horizonOf(at(9, 0, 23), now)).toBe('week');
    expect(horizonOf(at(9, 0, 30), now)).toBe('later');
    expect(horizonOf(undefined, now)).toBe('later');
  });
});

describe('scoring', () => {
  it('overdue accepted deadline beats due cards', () => {
    const items = buildItems({ ...base, accepted: [dl('1', now - 3_600_000)], cards: [{ subject: 'CFA', n: 12, href: '#/c/cfa' }] });
    expect(items[0].id).toBe('dl:1');
    expect(items[0].score).toBe(45 + 10 + 40);
    expect(items[1].score).toBe(30 + 25);
  });
  it('exam within 14 days adds 10 to cards', () => {
    const [c] = buildItems({ ...base, cards: [{ subject: 'Japanisch', n: 3, href: '#/c/japanese', examDays: 10 }] });
    expect(c.score).toBe(65);
    expect(c.why).toContain('exam in 10 d');
  });
  it('lectures only count within 2 hours', () => {
    const lec = (start: number) => ({ uid: String(start), title: 'Mikro (Vorlesung)', start, end: start + 5_400_000, allDay: false });
    expect(buildItems({ ...base, lectures: [lec(now + 3_600_000), lec(now + 5 * 3_600_000)] })).toHaveLength(1);
  });
  it('old unaccepted suggestions are dropped', () => {
    expect(buildItems({ ...base, suggestions: [dl('x', now - 10 * 86_400_000)] })).toHaveLength(0);
  });
  it('only a gap of 30 min or more is offered', () => {
    expect(buildItems({ ...base, gaps: [[now, now + 20 * 60_000]] })).toHaveLength(0);
    expect(buildItems({ ...base, gaps: [[now, now + 40 * 60_000]] })[0].kind).toBe('gap');
  });
});

describe('merging and dismissing', () => {
  it('merges the same text and joins the chips', () => {
    const a = { id: 'a', kind: 'deadline' as const, subject: 'BWL', title: 'Abgabe', why: ['Canvas'], horizon: 'today' as const, score: 50, action: { type: 'focus' as const, label: '' } };
    const out = mergeDuplicates([a, { ...a, id: 'b', score: 60, why: ['Timetable'] }]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('b');
    expect(out[0].why).toEqual(['Timetable', 'Canvas']);
  });
  it('dismissed items stay hidden for 7 days', () => {
    const items = buildItems({ ...base, cards: [{ subject: 'CFA', n: 1, href: '' }] });
    expect(visibleItems(items, { 'cards:CFA': now - 6 * 86_400_000 }, now)).toHaveLength(0);
    expect(visibleItems(items, { 'cards:CFA': now - 8 * 86_400_000 }, now)).toHaveLength(1);
  });
  it('groups in horizon order', () => {
    const items = buildItems({ ...base, accepted: [dl('1', at(9, 0, 20)), dl('2', now - 1000)] });
    expect(groupByHorizon(items).map((g) => g.horizon)).toEqual(['overdue', 'tomorrow']);
  });
});

describe('day', () => {
  it('puts study blocks into gaps of 45+ min around lectures', () => {
    const lec = { uid: 'l', title: 'BWL', start: at(12), end: at(13, 30), allDay: false };
    const blocks = buildDay(now, at(17), [lec], [], ['BWL', 'CFA']);
    expect(blocks.map((b) => b.kind)).toEqual(['study', 'lecture', 'study']);
    expect(blocks[0]).toMatchObject({ start: at(10), end: at(11, 30), subject: 'BWL' });
    expect(blocks[2]).toMatchObject({ start: at(13, 30), end: at(15), subject: 'CFA' });
  });
  it('skips gaps that are too short and logged time', () => {
    const blocks = buildDay(now, at(11, 30), [], [[at(10, 30), at(11)]], ['CFA']);
    expect(blocks).toEqual([]);
  });
});

describe('sources', () => {
  it('maps Canvas names to Focus subjects', () => {
    expect(focusSubject('Grundlagen der Finanzbuchhaltung')).toBe('Finanzbuchhaltung');
    expect(focusSubject('Politikwissenschaften')).toBe('Politikwissenschaft');
    expect(focusSubject('Psychologie in Krisenzeiten')).toBe('Psychologie in Krisenzeiten');
  });
  it('flags a stale inbox after 36 h', () => {
    expect(canvasStatus(new Date(now - 40 * 3_600_000).toISOString(), 5, 1, now).state).toBe('stale');
    expect(canvasStatus(new Date(now - 3_600_000).toISOString(), 5, 1, now).state).toBe('ok');
    expect(canvasStatus(undefined, 0, 0, now).state).toBe('failed');
  });
});
