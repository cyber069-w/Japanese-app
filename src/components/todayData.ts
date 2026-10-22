/** Home → "Today": what to do now, from Canvas, timetable, Focus log and due cards (rules in core/today.ts). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { entryKey, markOutcome, registerShown, settleIgnored, trim, type RuleLog } from '../core/rules';
import { useApp } from '../core/store';
import { useDueCounts } from '../core/hooks';
import { storage } from '../core/db';
import { acceptExamDate } from '../core/examDates';
import { accept as canvasAccept, ignore as canvasIgnore, inboxView, useCanvas } from '../core/canvas';
import { loadCalendar, occurrences, type CalendarData } from '../core/calendar';
import { dayWindow, initFocus, startTimer, useFocus } from '../core/focusStore';
import { coverage, gaps, sessionIntervals } from '../core/focus';
import { COURSES } from '../courses';
import { useStored } from '../core/kv';
import { clubDates, type Club } from '../core/clubs';
import { applicationDates, type Application } from '../core/applications';
import { warmupDone, type Attempt } from '../modules/interview/stats';
import { hoursBySubject, weekStart, type PlannedBlock, type Targets } from '../core/targets';
import { planDemands, rollingPlan, type RollingPlan } from '../core/rollingPlan';
import { askTutor } from '../lib/tutor';
import { notesRequest } from '../lib/notesPrompt';
import { daysUntil } from '../lib/date';
import { navigate } from '../lib/router';
import {
  buildDay, buildItems, COURSE_SUBJECT, canvasStatus, focusSubject, pruneDismissed, visibleItems,
  type DayBlock, type SourceStatus, type TodayAction,
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
  const [targets] = useStored<Targets>('focus:targets', {});
  const [otherExams] = useStored<Record<string, string>>('exams:other', {});
  const [apps] = useStored<Application[]>('applications', []);
  const [clubs] = useStored<Club[]>('clubs', []);
  const [attempts] = useStored<Attempt[]>('interview:attempts', []);
  const hasInterview = (useApp((s) => s.content.interviewQs) ?? []).length > 0;
  const { map: dismissed, dismiss: dismissRaw, restore } = useDismissed();
  const [ruleLog, setRuleLog, ruleLoaded] = useStored<RuleLog>('rules:log', {});
  const [now, setNow] = useState(Date.now());
  const [draft, setDraft] = useState<{ id: string; subject: string; file: string; format: string; text: string } | null>(null);
  useEffect(initFocus, []);
  useEffect(() => {
    void loadCalendar().then((c) => setCalendar(c ?? null));
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const view = inboxView(canvasState, now);
  const [winStart, winEnd] = dayWindow(now);
  const lectures = useMemo(() => (calendar ? occurrences(calendar.events, now - 3_600_000, winEnd + 8 * 86_400_000) : []), [calendar, now, winEnd]);

  const { items, day, plan, sources } = useMemo(() => {
    const intervals = focus.sessions.flatMap(sessionIntervals);
    const open = gaps(intervals, Math.max(winStart, now - 60_000), Math.min(winEnd, Math.max(now, winStart)), 30 * 60_000);
    const cards = COURSES.map((c) => {
      const exam = settings.examDates?.[c.id] || (c.id === 'japanese' ? settings.examDate : '');
      return { subject: COURSE_SUBJECT[c.id] ?? c.name, n: due.perCourse[c.id] ?? 0, href: `#/c/${c.id}`, examDays: exam ? daysUntil(exam, now) : undefined };
    });
    const built = buildItems({
      now, accepted: view.accepted, suggestions: view.suggestions, announcements: view.unseenImportant, files: view.files, cards, lectures, gaps: open, applications: applicationDates(apps, now), examProposals: view.examProposals, drafts: view.draftsPending, gradings: view.gradingsNew.length, clubs: clubDates(clubs), warmup: hasInterview && !warmupDone(attempts, now),
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
    // rolling plan for the rest of today and tomorrow, from the weekly targets (falls back to simple suggestions without targets)
    const [tomStart, tomEnd] = dayWindow(now + 86_400_000);
    const busy: Array<[number, number]> = [
      ...lectures.filter((l) => !l.allDay).map((l) => [l.start, l.end] as [number, number]),
      ...intervals,
      ...(focus.active ? [[focus.active.startedAt, now + 15 * 60_000] as [number, number]] : []), // the running timer
      ...planned.map((p) => [p.start, p.end] as [number, number]),
      ...(canvasState.inbox?.busy ?? []).map((b) => [Date.parse(b.start), Date.parse(b.end)] as [number, number]),
    ];
    const exams = [
      ...COURSES.flatMap((c) => { const d = settings.examDates?.[c.id] || (c.id === 'japanese' ? settings.examDate : ''); return d ? [{ subject: COURSE_SUBJECT[c.id] ?? c.name, due: Date.parse(d) }] : []; }),
      ...Object.entries(otherExams).map(([subject, d]) => ({ subject, due: Date.parse(d) })),
    ];
    const deadlines = view.accepted.map((d) => ({ subject: focusSubject(d.subject), due: d.due ? Date.parse(d.due) : undefined }));
    const demands = planDemands(targets, hoursBySubject(focus.sessions, weekStart(now)), deadlines, exams, now);
    const plan: RollingPlan | null = demands.length ? rollingPlan(now, [[Math.max(now, winStart), Math.max(now, winEnd)], [tomStart, tomEnd]], busy, demands) : null;
    const base = buildDay(now, winEnd, today, intervals.filter(([a]) => a < winEnd), plan ? [] : ranked, 45, planned);
    const rolled = (plan?.blocks ?? []).filter((b) => b.day === 'today').map((b): DayBlock => ({ kind: 'study', start: b.start, end: b.end, title: `Study ${b.subject}`, subject: b.subject, why: b.why }));
    return { items: built, day: [...base, ...rolled].sort((x, y) => x.start - y.start), plan, sources: src };
  }, [targets, otherExams, focus.active, view.accepted, view.suggestions, view.unseenImportant, view.files, view.announcements, view.badge, view.examProposals, view.draftsPending, view.gradingsNew.length, lectures, focus.sessions, calendar, due.perCourse, settings.examDates, settings.examDate, canvasState.inbox, planned, apps, clubs, attempts, hasInterview, now, winStart, winEnd]);

  const shown = visibleItems(items, dismissed, now);
  const hiddenItems = items.filter((i) => !shown.includes(i));
  const covered = Math.round(coverage(focus.sessions.flatMap(sessionIntervals), winStart, Math.min(now, winEnd)) * 100);

  const run = (a: TodayAction) => {
    if (a.type === 'study') navigate(a.href.replace(/^#/, ''));
    else if (a.type === 'link') window.open(a.url, '_blank', 'noopener');
    else if (a.type === 'draft') setDraft(a.draft);
    else if (a.type === 'exam') { void acceptExamDate(a.proposal); canvasAccept(a.proposal.id); }
    else if (a.type === 'focus') navigate('/focus');
    else if (a.type === 'timer') {
      if (!focus.active) startTimer(a.subject);
      navigate('/focus');
    } else void askTutor(notesRequest(a.subject, a.topic, !!a.notes));
  };

  // measure the rules: every suggestion ends as acted, dismissed or ignored (Settings → History)
  const logRef = useRef(ruleLog);
  logRef.current = ruleLog;
  const shownKey = shown.map((i) => i.id).join('|');
  useEffect(() => {
    if (!ruleLoaded) return;
    const at = Date.now();
    let next = registerShown(logRef.current, shown, at);
    next = settleIgnored(next, shown.map((i) => entryKey(i.id, at)), at);
    if (next !== logRef.current) setRuleLog(trim(next));
  }, [shownKey, ruleLoaded]); // eslint-disable-line react-hooks/exhaustive-deps
  const outcome = (id: string, o: 'acted' | 'dismissed') => { const n = markOutcome(logRef.current, id, o, Date.now()); if (n !== logRef.current) setRuleLog(n); };
  const dismiss = (id: string) => { outcome(id, 'dismissed'); if (id.startsWith('exam:x-')) canvasIgnore(id.slice(5)); else if (id.startsWith('draft:')) canvasIgnore(id.slice(6)); else dismissRaw(id); };
  const act = (i: { id: string; action: TodayAction }) => { outcome(i.id, 'acted'); run(i.action); };
  return { draft, closeDraft: () => setDraft(null), shown, hiddenItems, act, day, plan, hasTargets: Object.values(targets).some((t) => t > 0), sources, lectures, calendar, covered, winStart, winEnd, now, run, dismiss, restore };
}
