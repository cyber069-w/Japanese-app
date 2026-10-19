import { describe, expect, it } from 'vitest';
import { entriesCsv, newEntry, semesterOf, totals } from './finance';

describe('study costs', () => {
  it('assigns semesters the St. Gallen way', () => {
    expect(semesterOf('2026-09-01')).toBe('HS 2026/27');
    expect(semesterOf('2027-02-28')).toBe('HS 2026/27');
    expect(semesterOf('2027-03-01')).toBe('FS 2027');
    expect(semesterOf('2027-08-31')).toBe('FS 2027');
  });
  it('totals per month, semester and category, never mixing currencies', () => {
    const e = [newEntry({ date: '2026-10-02', amount: 1200, category: 'Semester fees' }), newEntry({ date: '2026-10-20', amount: 80.5, category: 'Books & materials' }), newEntry({ date: '2026-11-03', amount: 20, currency: 'EUR', category: 'Books & materials' })];
    const t = totals(e);
    expect(t.month['2026-10']).toEqual({ CHF: 1280.5 });
    expect(t.semester['HS 2026/27']).toEqual({ CHF: 1280.5, EUR: 20 });
    expect(t.category['Books & materials']).toEqual({ CHF: 80.5, EUR: 20 });
  });
  it('csv is sorted, quoted and has a header', () => {
    const csv = entriesCsv([newEntry({ date: '2026-10-20', amount: 5, note: 'a "b", c' }), newEntry({ date: '2026-10-02', amount: 1.5 })]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('date,amount,currency,category,note,receipt,semester');
    expect(lines[1].startsWith('2026-10-02,1.50,CHF')).toBe(true);
    expect(lines[2]).toContain('"a ""b"", c"');
  });
});
