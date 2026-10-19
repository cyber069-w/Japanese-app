import { describe, expect, it } from 'vitest';
import { mergePlanned, parsePlan, planPrompt } from './plan';

const now = new Date(2026, 9, 19, 10, 0).getTime();
const ok = '{"blocks":[{"day":"2026-10-20","start":"16:00","end":"17:30","subject":"BWL","note":"Kap. 3"},{"day":"2026-10-20","start":"17:00","end":"18:00","subject":"CFA"},{"day":"2026-10-20","start":"09:00","end":"13:30","subject":"Mikro"},{"day":"2026-10-18","start":"09:00","end":"10:00","subject":"Alt"},{"day":"x","start":"1","end":"2","subject":"?"}]}';

describe('parsePlan', () => {
  it('keeps valid blocks and explains what it skipped', () => {
    const r = parsePlan('Hier dein Plan:\n```json\n' + ok + '\n```', now, 8 * 60, 22 * 60);
    expect(r.blocks.map((b) => b.subject)).toEqual(['BWL']);
    expect(r.blocks[0]).toMatchObject({ note: 'Kap. 3', end: new Date(2026, 9, 20, 17, 30).getTime() });
    expect(r.problems.join(' ')).toMatch(/overlaps|longer than 3 hours|past|missing/);
    expect(r.problems).toHaveLength(4);
  });
  it('rejects text without the JSON', () => {
    expect(parsePlan('Sorry, ich kann das nicht', now).blocks).toEqual([]);
    expect(parsePlan('{"blocks": 5}', now).problems[0]).toMatch(/not the JSON/);
  });
  it('a new plan replaces the old pasted one but keeps manual blocks', () => {
    const manual = { id: 'plan-BWL-1', subject: 'BWL', start: now + 1e6, end: now + 2e6 };
    const oldAi = { id: 'ai-1-X', subject: 'X', start: now + 1e6, end: now + 2e6 };
    const fresh = { id: 'ai-2-Y', subject: 'Y', start: now + 3e6, end: now + 4e6 };
    expect(mergePlanned([manual, oldAi], [fresh], now)).toEqual([manual, fresh]);
  });
});
describe('planPrompt', () => {
  it('lists the inputs and asks for JSON only', () => {
    const p = planPrompt({ now, dayStart: '08:00', dayEnd: '22:00', lectures: [{ title: 'BWL', start: now, end: now + 5_400_000 }], deadlines: [{ title: 'Abgabe', subject: 'BWL', due: now + 1e8 }], exams: [], targets: [{ subject: 'CFA', target: 4, done: 1 }], dueCards: 12, todos: ['Mail'] });
    expect(p).toMatch(/NUR mit einem JSON/);
    expect(p).toContain('BWL: Abgabe');
    expect(p).toContain('CFA: Ziel 4 h');
    expect(p).toContain('Fällige Lernkarten heute: 12');
  });
});
