import { describe, expect, it } from 'vitest';
import { clubDates, newClub, newItem } from './clubs';

describe('clubs', () => {
  it('lists only open dated items', () => {
    const c = { ...newClub('Debate'), items: [newItem('Prepare motion', '2026-10-25'), { ...newItem('Book room', '2026-10-22'), done: true }, newItem('Someday')] };
    const d = clubDates([c]);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ title: 'Debate: Prepare motion', club: 'Debate' });
    expect(d[0].due).toBe(new Date('2026-10-25T23:59:00').getTime());
  });
  it('trims item text and drops an empty date', () => {
    expect(newItem('  x  ', '')).toMatchObject({ text: 'x', due: undefined });
  });
});
