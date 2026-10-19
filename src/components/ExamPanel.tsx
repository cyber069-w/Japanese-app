/** Course page → Exam Preparation: 6-week plan, mock exam, old exams found by the Canvas job. */
import { useMemo, useState } from 'react';
import { getState, useApp } from '../core/store';
import { useCourseMeters, useCtx } from '../core/hooks';
import { useCanvas } from '../core/canvas';
import { courseModules } from '../courses';
import type { CourseConfig } from '../courses/types';
import { examPlan, mockCards, PLAN_WEEKS } from '../core/exam';
import { startSession } from '../core/sessionConfig';
import { COURSE_SUBJECT, focusSubject } from '../core/today';
import { Icon } from './Icon';

export function ExamPanel({ course }: { course: CourseConfig }) {
  const ctx = useCtx();
  const settings = useApp((s) => s.settings);
  const meter = useCourseMeters()[course.id];
  const canvas = useCanvas();
  const mods = useMemo(() => courseModules(course), [course]);
  // Japanese: the exam covers vocabulary, grammar and listening – not script practice
  const examMods = useMemo(() => (course.id === 'japanese' ? mods.filter((m) => ['vocab', 'grammar', 'listening'].includes(m.id)) : mods), [course, mods]);
  const [count, setCount] = useState(30);
  const [minutes, setMinutes] = useState(30);
  const examDate = settings.examDates?.[course.id] || (course.id === 'japanese' ? settings.examDate : '');
  const plan = meter ? examPlan(examDate, meter) : null;
  const subject = COURSE_SUBJECT[course.id] ?? course.name;
  const old = (canvas.inbox?.exams ?? []).filter((e) => focusSubject(e.subject) === subject);
  const build = () => mockCards(examMods, { ...ctx, settings: getState().settings }, getState().cards, count);

  return (
    <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      <div className="card card-pad stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <b>Exam plan</b>
        {plan ? (
          <>
            <div className="small">
              <b>{plan.weeksLeft} week{plan.weeksLeft === 1 ? '' : 's'}</b> left ({plan.daysLeft} days) · suggested <b>{plan.weeklyHours} h</b> per week
            </div>
            {plan.open.length > 0 ? (
              <div className="small">Needs most work: {plan.open.map((o) => o.label).join(' · ')}</div>
            ) : (
              <div className="small muted">Every part looks solid – keep the reviews going.</div>
            )}
            <div className="faint tiny">Rule of thumb: 2 h + up to 8 h by how much is still open, ×1.5 in the last 2 weeks. It is a suggestion, not a promise.</div>
          </>
        ) : (
          <div className="muted small">
            {examDate ? `The plan starts ${PLAN_WEEKS} weeks before the exam.` : `Set the exam date for ${course.name} (Settings → Study) – the plan starts ${PLAN_WEEKS} weeks before it.`}
          </div>
        )}
      </div>

      <div className="card card-pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        <b>Mock exam</b>
        {examMods.length === 0 ? (
          <div className="muted small">Needs content in the course first.</div>
        ) : (
          <>
            <div className="muted small">Mixed questions from all modules of this subject, no repeats after a mistake, a countdown ends the test. The result lists your weak topics.</div>
            <div className="row">
              <label className="row small" style={{ gap: 6 }}>Questions <input className="input" type="number" min={5} max={100} style={{ width: 80 }} value={count} onChange={(e) => setCount(Math.min(100, Math.max(5, Number(e.target.value) || 30)))} /></label>
              <label className="row small" style={{ gap: 6 }}>Minutes <input className="input" type="number" min={5} max={180} style={{ width: 80 }} value={minutes} onChange={(e) => setMinutes(Math.min(180, Math.max(5, Number(e.target.value) || 30)))} /></label>
              <button className="btn btn-primary" onClick={() => startSession({ title: `Mock exam · ${course.name}`, cards: build(), back: `/c/${course.id}`, rebuild: build, mock: { minutes } })}>
                <Icon name="exam" size={17} /> Start mock exam
              </button>
            </div>
          </>
        )}
      </div>

      {old.length > 0 && (
        <div className="card card-pad stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <b>Old exams</b>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{old.map((e) => <li key={e.file}>{e.file}</li>)}</ul>
          <div className="faint tiny">Open the folder “{old[0].subject} / Prüfungen” in OneDrive – the app can’t open local files.</div>
        </div>
      )}
    </div>
  );
}
