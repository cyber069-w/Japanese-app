/** Calendar export: events → .ics file (RFC 5545), downloadable. Works with Apple Calendar, Outlook and Google Calendar. */
export interface IcsEvent {
  title: string;
  start: number;
  /** ms; ignored for all-day events (they last one day, or until `end` as a date) */
  end?: number;
  allDay?: boolean;
  /** e.g. "FREQ=WEEKLY;BYDAY=MO" (without the "RRULE:" prefix) */
  rrule?: string;
  /** minutes before the start; 0 = at start */
  alarmMin?: number;
  url?: string;
  description?: string;
  location?: string;
  /** stable id so importing again updates instead of duplicating */
  uid?: string;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const utc = (t: number) => { const d = new Date(t); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; };
const day = (t: number) => { const d = new Date(t); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; };
/** Local wall-clock time (floating): repeating events keep their clock time across daylight saving. */
const local = (t: number) => { const d = new Date(t); return `${day(t)}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; };

export const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets are folded (continuation lines start with a space). */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74;
    if (enc.encode(cur + ch).length > limit) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(events: IcsEvent[], now = Date.now(), prodId = '-//Study Desk//EN'): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${prodId}`, 'CALSCALE:GREGORIAN'];
  events.forEach((e, i) => {
    const end = e.end ?? e.start + 3_600_000;
    lines.push('BEGIN:VEVENT', `UID:${e.uid ?? `${e.start}-${i}-${e.title.replace(/\W+/g, '').slice(0, 20)}@studydesk`}`, `DTSTAMP:${utc(now)}`);
    if (e.allDay) lines.push(`DTSTART;VALUE=DATE:${day(e.start)}`, `DTEND;VALUE=DATE:${day(Math.max(end, e.start + 86_400_000))}`);
    else lines.push(e.rrule ? `DTSTART:${local(e.start)}` : `DTSTART:${utc(e.start)}`, e.rrule ? `DTEND:${local(end)}` : `DTEND:${utc(end)}`);
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.rrule) lines.push(`RRULE:${e.rrule}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.alarmMin !== undefined) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:${e.alarmMin === 0 ? 'PT0S' : `-PT${e.alarmMin}M`}`, 'END:VALARM');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(events: IcsEvent[], filename = 'study-desk.ics') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
