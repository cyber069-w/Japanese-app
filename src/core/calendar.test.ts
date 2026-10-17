import { describe, expect, it } from 'vitest';
import { occurrences, parseIcs, subjectOf } from './calendar';

const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:a
SUMMARY:Mikro (Vorlesung)
LOCATION:Hörsaal 1
DTSTART:20261019T081500
DTEND:20261019T100000
RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4
EXDATE:20261021T081500
END:VEVENT
BEGIN:VEVENT
UID:b
SUMMARY:Einmalig\\, mit Komma
DTSTART:20261020T120000Z
DTEND:20261020T130000Z
END:VEVENT
BEGIN:VEVENT
UID:c
SUMMARY:Abgesagt
STATUS:CANCELLED
DTSTART:20261020T120000
END:VEVENT
END:VCALENDAR`;

describe('ics', () => {
  const events = parseIcs(ics);
  it('parses events, skips cancelled, unescapes text', () => {
    expect(events.map((e) => e.title)).toEqual(['Mikro (Vorlesung)', 'Einmalig, mit Komma']);
    expect(events[0].duration).toBe(105 * 60_000);
  });
  it('expands weekly BYDAY with COUNT and EXDATE', () => {
    const occ = occurrences(events.slice(0, 1), new Date(2026, 9, 1).getTime(), new Date(2026, 11, 1).getTime());
    // MO 19, (WE 21 excluded), MO 26, WE 28 → count 4 includes the excluded one: 19, 21, 26, 28
    expect(occ.map((o) => new Date(o.start).getDate())).toEqual([19, 26, 28]);
  });
  it('converts UTC times', () => {
    expect(events[1].start).toBe(Date.UTC(2026, 9, 20, 12));
  });
  it('derives the subject from the title', () => {
    expect(subjectOf('Mikro (Vorlesung) – Hörsaal 1')).toBe('Mikro');
  });
});
