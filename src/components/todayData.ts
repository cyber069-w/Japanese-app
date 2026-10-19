/** Home → "Today": what to do now, from Canvas, timetable, Focus log and due cards (rules in core/today.ts). */
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../core/store';
import { useDueCounts } from '../core/hooks';
import { storage } from '../core/db';
import { inboxView, useCanvas } from '../core/canvas';
import { loadCalendar, occurrences, type CalendarData } from '../core/calendar';
import { dayWindow, initFocus, startTimer, useFocus } from '../core/focusStore';
import { coverage, gaps, sessionIntervals } from '../core/focus';
import { COURSES } from '../courses';
import { useStored } from '../core/kv';
import { clubDates, type Club } from '../core/clubs';
import { applicationDates, type Application } from '../core/applications';
import { warmupDone, type Attempt } from '../modules/interview/stats';
import type { PlannedBlock } from '../core/targets';
import { askTutor } from '../lib/tutor';
import { notesRequest } from '../lib/notesPrompt';
import { daysUntil } from '../lib/date';
import { navigate } from '../lib/router';
import {
  buildDay, buildItems, COURSE_SUBJECT, canvasStatus, pruneDismissed, visibleItems,
  type SourceStatus, type TodayAction,
} from '../core/today';

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

export function useToday() {
  const settings = useApp((s) => s.settings);
  const due = useDueCounts();
  const focus = useFocus();
  const canvasState = useCanvas();
  const [calendar, setCalendar] = useState<CalendarData | null | undefined>(undefined);
  const [planned] = useStored<PlannedBlock[]>('today:planned', []);
  const [apps] = useStored<Application[]>('applications', []);
  const [clubs] = useStored<Club[]>('clubs', []);
  const [attempts] = useStored<Attempt[]>('interview:attempts', []);
  const hasInterview = (useApp((s) => s.content.interviewQs) ?? []).length > 0;
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
      now, accepted: view.accepted, suggestions: view.suggestions, announcements: view.unseenImportant, files: view.files, cards, lectures, gaps: open, applications: applicationDates(apps, now), clubs: clubDates(clubs), warmup: hasInterview && !warmupDone(attempts, now),
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
  }, [view.accepted, view.suggestions, view.unseenImportant, view.files, view.announcements, view.badge, lectures, focus.sessions, calendar, due.perCourse, settings.examDates, settings.examDate, canvasState.inbox, planned, apps, clubs, attempts, hasInterview, now, winStart, winEnd]);

  const shown = visibleItems(items, dismissed, now);
  const hiddenItems = items.filter((i) => !shown.includes(i));
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

  return { shown, hiddenItems, day, sources, lectures, calendar, covered, winStart, winEnd, now, run, dismiss, restore };
}
