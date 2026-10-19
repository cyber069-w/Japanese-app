import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, fold } from './ics';

const start = new Date(2026, 9, 19, 22, 30).getTime();
describe('ics', () => {
  it('writes a valid calendar with CRLF line ends', () => {
    const s = buildIcs([{ title: 'Shutdown', start, end: start + 900_000 }], start);
    expect(s.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(s.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(s).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(s.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
  it('repeating event with alarm and URL', () => {
    const s = buildIcs([{ title: 'Shutdown, "evening"', start, end: start + 900_000, rrule: 'FREQ=WEEKLY;BYDAY=MO', alarmMin: 0, url: 'https://x.github.io/app/#/shutdown', description: 'a;b\nc' }], start);
    expect(s).toContain('DTSTART:20261019T223000\r\n');
    expect(s).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO');
    expect(s).toContain('SUMMARY:Shutdown\\, "evening"');
    expect(s).toContain('DESCRIPTION:a\;b\\nc');
    expect(s).toContain('BEGIN:VALARM\r\nACTION:DISPLAY');
    expect(s).toContain('TRIGGER:PT0S');
    expect(s).toContain('URL:https://x.github.io/app/#/shutdown');
  });
  it('all-day events use dates; alarm before start', () => {
    const s = buildIcs([{ title: 'Deadline', start, allDay: true, alarmMin: 60 }], start);
    expect(s).toContain('DTSTART;VALUE=DATE:20261019');
    expect(s).toContain('DTEND;VALUE=DATE:20261020');
    expect(s).toContain('TRIGGER:-PT60M');
  });
  it('folds long lines without splitting characters', () => {
    const long = 'DESCRIPTION:' + 'ä'.repeat(80);
    const f = fold(long);
    expect(f.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(f.replace(/\r\n /g, '')).toBe(long);
    expect(escapeText('a,b;c')).toBe('a\\,b\;c');
  });
});

import { shutdownReminders } from './shutdownReminders';
describe('shutdown reminders', () => {
  it('makes seven weekly events with the right weekday and time', () => {
    const times = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), d === 6 ? '23:00' : '22:30']));
    const ev = shutdownReminders(times, new Date(2026, 9, 19, 12).getTime(), 'https://x/#/shutdown'); // Monday
    expect(ev).toHaveLength(7);
    const mon = ev.find((e) => e.rrule?.endsWith('MO'))!;
    expect(new Date(mon.start).getDate()).toBe(19);
    const sat = ev.find((e) => e.rrule?.endsWith('SA'))!;
    expect(new Date(sat.start).getDate()).toBe(24);
    expect(new Date(sat.start).getHours()).toBe(23);
    expect(sat.end! - sat.start).toBe(900_000);
    expect(ev.every((e) => e.alarmMin === 0 && e.url)).toBe(true);
  });
});
