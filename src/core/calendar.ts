/**
 * Lecture calendar from an .ics file (Outlook: Calendar → Share/Publish → ICS link or export).
 * Parses VEVENTs, expands simple recurrences (DAILY/WEEKLY, INTERVAL, COUNT, UNTIL, BYDAY, EXDATE).
 * Times without a zone are taken as this device's local time; "…Z" times are converted.
 */
import { storage } from './db';

export interface CalEvent {
  uid: string;
  title: string;
  location?: string;
  /** Start of the first occurrence, ms. */
  start: number;
  /** Duration in ms. */
  duration: number;
  allDay: boolean;
  rrule?: string;
  exdates: number[];
}

export interface Occurrence { uid: string; title: string; location?: string; start: number; end: number; allDay: boolean }

export interface CalendarData { events: CalEvent[]; source: string; importedAt: number; url?: string }

const unfold = (text: string) => text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
const unescape = (s: string) => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

/** "20261019T081500Z" / "20261019T081500" / "20261019" → ms (and whether it was a date only). */
function parseDate(value: string): { ms: number; allDay: boolean } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2] - 1, +m[3]];
  if (m[4] === undefined) return { ms: new Date(y, mo, d).getTime(), allDay: true };
  const [h, mi, s] = [+m[4], +m[5], +m[6]];
  return { ms: m[7] ? Date.UTC(y, mo, d, h, mi, s) : new Date(y, mo, d, h, mi, s).getTime(), allDay: false };
}

export function parseIcs(text: string): CalEvent[] {
  const events: CalEvent[] = [];
  let cur: Record<string, string[]> | null = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') cur = {};
    else if (line === 'END:VEVENT' && cur) {
      const ev = toEvent(cur);
      if (ev) events.push(ev);
      cur = null;
    } else if (cur) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const name = line.slice(0, i).split(';')[0].toUpperCase();
      (cur[name] ??= []).push(line.slice(i + 1));
    }
  }
  return events;
}

function toEvent(p: Record<string, string[]>): CalEvent | null {
  const s = p.DTSTART?.[0] ? parseDate(p.DTSTART[0]) : null;
  if (!s || p.STATUS?.[0] === 'CANCELLED') return null;
  const e = p.DTEND?.[0] ? parseDate(p.DTEND[0]) : null;
  const duration = e ? Math.max(0, e.ms - s.ms) : s.allDay ? 86400_000 : 3600_000;
  const exdates = (p.EXDATE ?? []).flatMap((v) => v.split(',')).map((v) => parseDate(v)?.ms).filter((x): x is number => x !== undefined);
  return {
    uid: p.UID?.[0] ?? `${s.ms}-${p.SUMMARY?.[0] ?? ''}`,
    title: unescape(p.SUMMARY?.[0] ?? 'Untitled'),
    location: p.LOCATION?.[0] ? unescape(p.LOCATION[0]) : undefined,
    start: s.ms, duration, allDay: s.allDay, rrule: p.RRULE?.[0], exdates,
  };
}

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** All occurrences that overlap [from, to). */
export function occurrences(events: CalEvent[], from: number, to: number): Occurrence[] {
  const out: Occurrence[] = [];
  const push = (ev: CalEvent, start: number) => {
    if (start + ev.duration <= from || start >= to || ev.exdates.includes(start)) return;
    out.push({ uid: ev.uid, title: ev.title, location: ev.location, start, end: start + ev.duration, allDay: ev.allDay });
  };
  for (const ev of events) {
    if (!ev.rrule) { push(ev, ev.start); continue; }
    const r = Object.fromEntries(ev.rrule.split(';').map((kv) => kv.split('=') as [string, string]));
    const freq = r.FREQ;
    if (freq !== 'DAILY' && freq !== 'WEEKLY') { push(ev, ev.start); continue; }
    const interval = Math.max(1, +r.INTERVAL || 1);
    const until = r.UNTIL ? parseDate(r.UNTIL)?.ms ?? Infinity : Infinity;
    const max = r.COUNT ? +r.COUNT : Infinity;
    const first = new Date(ev.start);
    const days = freq === 'WEEKLY' ? (r.BYDAY ? r.BYDAY.split(',').map((d) => DAYS.indexOf(d.slice(-2))).filter((d) => d >= 0) : [first.getDay()]) : [first.getDay()];
    const weekStart = new Date(first.getFullYear(), first.getMonth(), first.getDate() - first.getDay());
    let count = 0;
    for (let step = 0; step < 2000 && count < max; step++) {
      const base = new Date(weekStart);
      if (freq === 'WEEKLY') base.setDate(base.getDate() + step * 7 * interval);
      else base.setDate(first.getDate() + step * interval);
      const candidates = freq === 'WEEKLY' ? days.map((d) => { const x = new Date(base); x.setDate(x.getDate() + d); return x; }) : [base];
      candidates.sort((a, b) => +a - +b);
      for (const day of candidates) {
        const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), first.getHours(), first.getMinutes(), first.getSeconds()).getTime();
        if (start < ev.start) continue;
        if (start > until || count >= max) { step = 2000; break; }
        count++;
        push(ev, start);
      }
      if (+base > to && step > 0) break;
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** "Mikroökonomik (Vorlesung) – Hörsaal 1" → "Mikroökonomik" */
export const subjectOf = (title: string) => title.replace(/\s*[(\[].*?[)\]]\s*/g, ' ').replace(/\s+[-–—]\s+.*$/, '').trim() || title;

export const loadCalendar = () => storage.get<CalendarData>('calendar');
export const saveCalendar = (c: CalendarData | null) => storage.set('calendar', c);
