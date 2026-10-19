/** Home → "Today": what to do now, from Canvas, timetable, Focus log and due cards (rules in core/today.ts). */
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../core/store';
import { useDueCounts } from '../core/hooks';
import { storage } from '../core/db';
import { inboxView, markSeen, useCanvas } from '../core/canvas';
import { loadCalendar, occurrences, type CalendarData } from '../core/calendar';
import { dayWindow, initFocus, startTimer, useFocus } from '../core/focusStore';
import { coverage, gaps, sessionIntervals } from '../core/focus';
import { COURSES } from '../courses';
import { useStored } from '../core/kv';
import type { PlannedBlock } from '../core/targets';
import { askTutor } from '../lib/tutor';
import { notesRequest } from '../lib/notesPrompt';
import { daysUntil } from '../lib/date';
import { navigate } from '../lib/router';
import { Icon } from './Icon';
import {
  buildDay, buildItems, COURSE_SUBJECT, canvasStatus, groupByHorizon, HORIZON_LABEL, pruneDismissed, visibleItems,
  type SourceStatus, type TodayAction, type TodayItem,
} from '../core/today';

const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const DISMISS_KEY = 'today:dismissed';

function useDismissed() {
  const [map, setMap] = useState<Record<string, number>>({});
  useEffect(() => {
    void storage.get<Record<string, number>>(DISMISS_KEY).then((m) => setMap(pruneDismissed(m ?? {}, Date.now())));
  }, []);
  const save = (next: Record<string, number>) => {
    setMap(next);
    void storage.set(DISMISS_KEY, next);
  };
  return {
    map,
    dismiss: (id: string) => save({ ...map, [id]: Date.now() }),
    restore: (id: string) => save(Object.fromEntries(Object.entries(map).filter(([k]) => k !== id))),
  };
}

export function TodayHub() {
  const settings = useApp((s) => s.settings);
  const due = useDueCounts();
  const focus = useFocus();
  const canvasState = useCanvas();
  const [calendar, setCalendar] = useState<CalendarData | null | undefined>(undefined);
  const [all, setAll] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [planned] = useStored<PlannedBlock[]>('today:planned', []);
  const { map: dismissed, dismiss, restore } = useDismissed();
  const [now, setNow] = useState(Date.now());
  useEffect(initFocus, []);
  useEffect(() => {
    void loadCalendar().then((c) => setCalendar(c ?? null));
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const view = inboxView(canvasState, now);
  const [winStart, winEnd] = dayWindow(now);
  const lectures = useMemo(() => (calendar ? occurrences(calendar.events, now - 3_600_000, winEnd + 8 * 86_400_000) : []), [calendar, now, winEnd]);

  const { items, day, sources } = useMemo(() => {
    const intervals = focus.sessions.flatMap(sessionIntervals);
    const open = gaps(intervals, Math.max(winStart, now - 60_000), Math.min(winEnd, Math.max(now, winStart)), 30 * 60_000);
    const cards = COURSES.map((c) => {
      const exam = settings.examDates?.[c.id] || (c.id === 'japanese' ? settings.examDate : '');
      return { subject: COURSE_SUBJECT[c.id] ?? c.name, n: due.perCourse[c.id] ?? 0, href: `#/c/${c.id}`, examDays: exam ? daysUntil(exam, now) : undefined };
    });
    const built = buildItems({
      now, accepted: view.accepted, suggestions: view.suggestions, announcements: view.unseenImportant, files: view.files, cards, lectures, gaps: open,
    });
    const ranked = [...new Set(built.filter((i) => i.subject !== '–').map((i) => i.subject))];
    const today = lectures.filter((l) => l.start < winEnd);
    const src: SourceStatus[] = [
      canvasStatus(canvasState.inbox?.at, view.suggestions.length + view.accepted.length + view.announcements.length + view.files.length, view.badge, now),
      calendar === undefined ? { name: 'Timetable', read: 0, act: 0, state: 'ok' }
        : calendar ? { name: 'Timetable', read: calendar.events.length, act: today.filter((l) => l.start > now && l.start - now <= 2 * 3_600_000).length, state: now - calendar.importedAt > 14 * 86_400_000 ? 'stale' : 'ok', note: now - calendar.importedAt > 14 * 86_400_000 ? 'Timetable import is older than 2 weeks – import again on the Lectures page' : undefined }
        : { name: 'Timetable', read: 0, act: 0, state: 'failed', note: 'No timetable imported yet (Focus → Lectures)' },
      { name: 'Focus', read: focus.sessions.length, act: open.length, state: 'ok' },
      { name: 'Cards', read: COURSES.length, act: cards.filter((c) => c.n > 0).length, state: 'ok' },
    ];
    return { items: built, day: buildDay(now, winEnd, today, intervals.filter(([a]) => a < winEnd), ranked, 45, planned), sources: src };
  }, [view.accepted, view.suggestions, view.unseenImportant, view.files, view.announcements, view.badge, lectures, focus.sessions, calendar, due.perCourse, settings.examDates, settings.examDate, canvasState.inbox, planned, now, winStart, winEnd]);

  const shown = visibleItems(items, dismissed, now);
  const hiddenItems = items.filter((i) => !shown.includes(i));
  const top = all ? shown : shown.slice(0, 12);
  const covered = Math.round(coverage(focus.sessions.flatMap(sessionIntervals), winStart, Math.min(now, winEnd)) * 100);

  const run = (a: TodayAction) => {
    if (a.type === 'study') navigate(a.href.replace(/^#/, ''));
    else if (a.type === 'link') window.open(a.url, '_blank', 'noopener');
    else if (a.type === 'focus') navigate('/focus');
    else if (a.type === 'timer') {
      if (!focus.active) startTimer(a.subject);
      navigate('/focus');
    } else void askTutor(notesRequest(a.subject, a.topic, !!a.notes));
  };

  const row = (i: TodayItem) => (
    <li key={i.id} className="today-row">
      <div className="grow">
        <div className="today-title">{i.title.length > 140 ? `${i.title.slice(0, 137)}…` : i.title}</div>
        <div className="row" style={{ gap: 6, marginTop: 4 }}>
          {i.subject !== '–' && <span className="tag">{i.subject}</span>}
          {i.why.map((w) => <span key={w} className="tag tag-accent">{w}</span>)}
          {i.due !== undefined && <span className="faint tiny">due {new Date(i.due).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
      </div>
      <button className="btn btn-sm btn-primary" onClick={() => run(i.action)}>{i.action.label}</button>
      <button className="btn btn-sm btn-ghost" aria-label={i.kind === 'notes' ? 'Done' : 'Dismiss'} title={i.kind === 'notes' ? 'Done – remove' : 'Dismiss for 7 days'} onClick={() => (i.kind === 'notes' ? (markSeen([i.id.replace(/^file:/, '')]), dismiss(i.id)) : dismiss(i.id))}>{i.kind === 'notes' ? 'Done' : <Icon name="x" size={15} />}</button>
    </li>
  );

  return (
    <section className="section" aria-label="Today">
      <div className="section-head"><h2>Today</h2><span className="faint tiny">{shown.length} open · rules, no AI</span></div>

      <div className="row" style={{ gap: 8, marginBottom: 14 }}>
        {sources.map((s) => (
          <span key={s.name} className={`tag ${s.state === 'ok' ? '' : 'tag-bad'}`} title={s.note}>
            {s.name}: {s.read} read · {s.act} to act on
          </span>
        ))}
      </div>
      {sources.filter((s) => s.note).map((s) => <div key={s.name} className="muted tiny" style={{ marginBottom: 6 }}>{s.name}: {s.note}</div>)}

      {shown.length === 0 ? (
        <div className="card card-pad muted">Nothing needs you right now.</div>
      ) : (
        groupByHorizon(top).map((g) => (
          <div key={g.horizon} className="card card-pad" style={{ marginBottom: 12 }}>
            <div className="eyebrow">{HORIZON_LABEL[g.horizon]}</div>
            <ul className="today-list">{g.items.map(row)}</ul>
          </div>
        ))
      )}
      {shown.length > 12 && <button className="btn btn-sm" onClick={() => setAll(!all)}>{all ? 'Show top 12' : `Show all (${shown.length})`}</button>}
      {hiddenItems.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowDismissed(!showDismissed)}>Dismissed ({hiddenItems.length})</button>
          {showDismissed && (
            <ul className="today-list">
              {hiddenItems.map((i) => (
                <li key={i.id} className="today-row">
                  <div className="grow muted">{i.title.slice(0, 100)}</div>
                  <button className="btn btn-sm" onClick={() => restore(i.id)}>Restore</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>Your day</h2>
        <span className="faint tiny">{hhmm(winStart)}–{hhmm(winEnd)} · {covered}% logged so far · <a href="#/focus">Focus</a></span>
      </div>
      {day.length === 0 ? (
        <div className="card card-pad muted">No free block of 45 min or more left in your day window.</div>
      ) : (
        <ul className="today-list card card-pad">
          {day.map((b) => (
            <li key={`${b.kind}${b.start}`} className="today-row">
              <span className="today-time">{hhmm(b.start)}–{hhmm(b.end)}</span>
              <div className="grow">{b.kind === 'lecture' ? <b>{b.title}</b> : b.title}<span className="tag" style={{ marginLeft: 8 }}>{b.kind === 'lecture' ? 'lecture' : b.planned ? 'planned' : 'suggested'}</span></div>
              {b.kind === 'study' && b.subject && <button className="btn btn-sm" onClick={() => run({ type: 'timer', label: '', subject: b.subject! })}>Start timer</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
