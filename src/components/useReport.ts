import { useMemo } from 'react';
import { useApp } from '../core/store';
import { useFocus } from '../core/focusStore';
import { inboxView, useCanvas } from '../core/canvas';
import { courseOfModule } from '../courses';
import { COURSE_SUBJECT } from '../core/today';
import { useStored } from '../core/kv';
import { weekStart, type Targets } from '../core/targets';
import { buildReport, reportMarkdown } from '../core/report';

/** The weekly report of the week `offset` weeks from now (0 = this week) and its Markdown. */
export function useWeeklyReport(offset = 0) {
  const days = useApp((s) => s.days);
  const focus = useFocus();
  const canvas = inboxView(useCanvas());
  const [targets] = useStored<Targets>('focus:targets', {});
  const now = Date.now();
  const report = useMemo(
    () => buildReport({
      start: weekStart(now, offset), now, sessions: focus.sessions, days, targets,
      subjectOfModule: (m) => { const c = courseOfModule(m); return COURSE_SUBJECT[c.id] ?? c.name; },
      deadlines: canvas.accepted, files: canvas.files,
    }),
    [offset, focus.sessions, days, targets, canvas.accepted, canvas.files, now],
  );
  return { report, md: reportMarkdown(report) };
}
