import { describe, expect, it } from 'vitest';
import { applicationDates, blankApplication, moveStage, nextStage, parseRules, seedApplications, suggestFromEmail, watchFilter } from './applications';

const now = new Date(2026, 9, 19, 12).getTime();
describe('stages', () => {
  it('flows forward and stops at offer', () => {
    expect(nextStage('researching')).toBe('applied');
    expect(nextStage('assessment')).toBe('offer');
    expect(nextStage('offer')).toBeNull();
    expect(nextStage('rejected')).toBeNull();
  });
  it('every move adds a history entry and sets the applied date once', () => {
    const a = moveStage(blankApplication(now), 'applied', now);
    expect(a.history.map((h) => h.stage)).toEqual(['researching', 'applied']);
    expect(a.applied).toBe('2026-10-19');
    expect(moveStage(a, 'applied', now + 1)).toBe(a);
    expect(moveStage(a, 'interview', now + 1).applied).toBe('2026-10-19');
  });
});
describe('email rules', () => {
  it('suggests a stage, EN and DE, first match wins', () => {
    expect(suggestFromEmail('We invite you to interview next week').stage).toBe('interview');
    expect(suggestFromEmail('Please complete the HireVue video interview').stage).toBe('video-interview');
    expect(suggestFromEmail('Complete our online assessment: numerical reasoning').stage).toBe('online-test');
    expect(suggestFromEmail('Unfortunately we cannot offer you a place. Interview feedback attached').stage).toBe('rejected');
    expect(suggestFromEmail('We are pleased to offer you the role').stage).toBe('offer');
    expect(suggestFromEmail('Leider müssen wir Ihnen absagen').stage).toBe('rejected');
    expect(suggestFromEmail('Hello there').stage).toBeNull();
  });
  it('takes the date and subject from the headers', () => {
    const s = suggestFromEmail('From: hr@x.com\nDate: Mon, 12 Oct 2026 09:30:00 +0200\nSubject: Your HireVue invitation\n\nHi', undefined, now);
    expect(s).toMatchObject({ stage: 'video-interview', date: '2026-10-12', firstLine: 'Your HireVue invitation' });
    expect(suggestFromEmail('\n\nDear Max,\nsomething', undefined, now)).toMatchObject({ date: '2026-10-19', firstLine: 'Dear Max,' });
  });
  it('validates edited rules', () => {
    expect(parseRules('{"rules":[{"stage":"offer","keywords":["yes"]}]}')).toHaveLength(1);
    expect(() => parseRules('{"rules":[{"stage":"nope","keywords":[]}]}')).toThrow();
  });
});
describe('watchlist and dates', () => {
  const mk = (p: Partial<ReturnType<typeof blankApplication>>) => ({ ...blankApplication(now), ...p });
  it('filters open / soon / closing', () => {
    const l = [mk({ company: 'A', opens: '2026-10-01', deadline: '2026-11-30' }), mk({ company: 'B', opens: '2026-10-25' }), mk({ company: 'C', deadline: '2026-10-30' }), mk({ company: 'D', opens: '2026-10-01', deadline: '2026-10-10' })];
    expect(watchFilter(l, 'open', now).map((a) => a.company)).toEqual(['A', 'C']);
    expect(watchFilter(l, 'soon', now).map((a) => a.company)).toEqual(['B']);
    expect(watchFilter(l, 'closing', now).map((a) => a.company)).toEqual(['C']);
    expect(watchFilter(mk({ company: 'R', opens: '2026-10-01', deadline: '2026-10-10', rolling: true }) ? [mk({ opens: '2026-10-01', deadline: '2026-10-10', rolling: true })] : [], 'open', now)).toHaveLength(1);
  });
  it('lists deadlines (researching) and next steps of active entries only', () => {
    const l = [mk({ company: 'A', deadline: '2026-10-25', stage: 'researching' }), mk({ company: 'B', stage: 'interview', nextStep: 'Call', nextDate: '2026-10-22T14:00' }), mk({ company: 'C', stage: 'rejected', deadline: '2026-10-25' })];
    expect(applicationDates(l, now).map((d) => [d.company, d.kind])).toEqual([['A', 'deadline'], ['B', 'next']]);
  });
  it('seeds three entries without invented details', () => {
    const s = seedApplications(now);
    expect(s.map((a) => a.company)).toEqual(['Nomura', 'FNF', 'PEVC Mentorship']);
    expect(s.every((a) => a.stage === 'researching' && !a.deadline)).toBe(true);
  });
});
