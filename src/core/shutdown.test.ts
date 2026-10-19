import { describe, expect, it } from 'vitest';
import { iaWriterUrl, shutdownDay, shutdownMarkdown, shutdownNudge, shutdownPath, shutdownStreak, type ShutdownLog } from './shutdown';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();
const times = { '0': '22:30', '1': '22:30', '2': '22:30', '3': '22:30', '4': '22:30', '5': '22:30', '6': '23:00' };
const e = { at: 0, quick: false, top3: [] };

describe('shutdown day and streak', () => {
  it('after midnight still belongs to the evening before', () => {
    expect(shutdownDay(at(20, 1, 30))).toBe('2026-10-19');
    expect(shutdownDay(at(20, 5, 1))).toBe('2026-10-20');
  });
  it('counts consecutive days, not breaking before today is due', () => {
    const log: ShutdownLog = { '2026-10-17': e, '2026-10-18': e, '2026-10-19': e };
    expect(shutdownStreak(log, at(19, 23))).toBe(3);
    expect(shutdownStreak({ '2026-10-17': e, '2026-10-18': e }, at(19, 12))).toBe(2);
    expect(shutdownStreak({ '2026-10-15': e }, at(19, 12))).toBe(0);
  });
});
describe('nudges', () => {
  it('shows nothing before the weekday time', () => {
    expect(shutdownNudge(at(19, 21), times, {})).toBeNull(); // Monday 21:00
  });
  it('due after the time, late after 00:30, nothing once done', () => {
    expect(shutdownNudge(at(19, 22, 45), times, {})).toBe('due');
    expect(shutdownNudge(at(20, 0, 10), times, {})).toBe('due');
    expect(shutdownNudge(at(20, 1, 0), times, {})).toBe('late');
    expect(shutdownNudge(at(19, 23), times, { '2026-10-19': e })).toBeNull();
  });
  it('offers the quick version next morning, once per day, only for people who use it', () => {
    const log = { '2026-10-17': e };
    expect(shutdownNudge(at(20, 9), times, log)).toBe('missed');
    expect(shutdownNudge(at(20, 9), times, log, '2026-10-20')).toBeNull();
    expect(shutdownNudge(at(20, 9), times, {})).toBeNull();
  });
});
describe('note', () => {
  it('has the prompts and url-encodes for iA Writer', () => {
    const md = shutdownMarkdown({ date: '2026-10-19', focus: [{ subject: 'BWL', hours: 1.46 }], cards: 12, todosDone: 3, todosOpen: 2, top3: ['A', 'B'] });
    expect(md).toContain('- BWL: 1.5 h');
    expect(md).toContain('3. \n');
    expect(md).toContain('## One thing to change');
    expect(iaWriterUrl('/Shutdown/2026-10-19.md', 'a b\n#')).toBe('ia-writer://new?path=%2FShutdown%2F2026-10-19.md&text=a%20b%0A%23');
    expect(shutdownPath(' Shutdown/ ', '2026-10-19', true)).toBe('/Shutdown/2026-10-19.md');
    expect(shutdownPath('Notes', '2026-10-19', false)).toBe('/Notes/Shutdown.md');
  });
});
