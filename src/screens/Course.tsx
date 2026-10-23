/** A course: its five areas – Study · Practice & Review · Exam Preparation · Imports · Tutor. */
import { useEffect, useMemo } from 'react';
import { getState, updateSettings, useApp } from '../core/store';
import { useStored } from '../core/kv';
import { useCtx, useDueCounts } from '../core/hooks';
import { buildReviewQueue, buildWeakQueue, weakCardIds } from '../core/session';
import { startSession } from '../core/sessionConfig';
import { getModule } from '../modules';
import { courseModules, entryInfo, getCourse } from '../courses';
import type { CourseConfig, CourseSection, Topic } from '../courses/types';
import { CourseBar } from '../components/CourseBar';
import { ModuleCard, PlaceholderCard } from '../components/ModuleCard';
import { ExamPanel } from '../components/ExamPanel';
import { Icon } from '../components/Icon';
import { TutorButton } from '../components/TutorButton';
import { TutorNotes } from '../components/TutorNotes';
import { CFA_DONE_KEY, CfaTopicLessons } from '../modules/cfa/TopicLessons';

const AREAS = [
  { id: 'study', label: 'Study' },
  { id: 'practice', label: 'Practice & Review' },
  { id: 'exam', label: 'Exam Preparation' },
  { id: 'imports', label: 'Imports' },
  { id: 'tutor', label: 'Tutor' },
] as const;

/** /c/:id – opens a course (and makes it the current one on this device). */
export function CourseRoute({ id }: { id: string }) {
  const course = getCourse(id);
  const current = useApp((s) => s.settings.course);
  useEffect(() => {
    if (current !== course.id) updateSettings({ course: course.id });
  }, [current, course.id]);
  return <CoursePage course={course} />;
}

export function CoursePage({ course }: { course: CourseConfig }) {
  return (
    <div className="page">
      <CourseBar />
      <div className="page-head">
        <div className="grow">
          <h1>{course.name}</h1>
          <div className="muted" style={{ marginTop: 4 }}>{course.description}</div>
        </div>
      </div>
      <nav className="area-nav" aria-label="Areas">
        {AREAS.map((a) => (
          <button key={a.id} className="chip" onClick={() => document.getElementById(`area-${a.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {a.label}
          </button>
        ))}
      </nav>

      <Area id="study" title="Study">
        {course.topics?.length ? <TopicGrid course={course} /> : null}
        <Sections sections={course.study} />
        {!course.topics?.length && !course.study.length && <Empty text="No study material yet – it will come from your own notes (Imports)." />}
      </Area>

      <Area id="practice" title="Practice & Review">
        <PracticeCard course={course} />
      </Area>

      <Area id="exam" title="Exam Preparation">
        <ExamPanel course={course} />
        <Sections sections={course.exam} />
      </Area>

      <Area id="imports" title="Imports">
        <Empty text="Coming in a later update: put your OneNote pages, PDFs and photos into an inbox, and approve the lessons drafted from them here." />
      </Area>

      <Area id="tutor" title="Tutor">
        <div className="card card-pad stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <p className="muted small">
            Opens Claude with a prompt for this subject already copied – paste it and add your question. Set the link to this subject’s Claude Project in Settings → Tutor to keep everything in one place.
          </p>
          <div>
            <TutorButton
              request={() => ({
                courseId: course.id,
                courseName: course.name,
                topic: course.name,
                context: course.description,
                task: 'Beantworte meine Frage, die ich gleich stelle. Erkläre Schritt für Schritt und prüfungsnah.',
              })}
            />
          </div>
          <TutorNotes courseId={course.id} />
        </div>
      </Area>
    </div>
  );
}

function Area({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="section area" id={`area-${id}`} aria-labelledby={`area-${id}-h`}>
      <h2 className="area-title" id={`area-${id}-h`}>{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="card card-pad muted small">{text}</div>;
}

function Sections({ sections }: { sections: CourseSection[] }) {
  const due = useDueCounts();
  return (
    <>
      {sections.map((s) => (
        <div className="area-group" key={s.title}>
          <div className="section-head">
            <h3>{s.title}</h3>
            {s.note && <span className="faint small">{s.note}</span>}
          </div>
          <div className="grid module-grid" style={{ '--min': '220px' } as React.CSSProperties}>
            {(s.modules ?? []).map((e) => {
              const mod = getModule(entryInfo(e).id);
              return mod ? <ModuleCard key={mod.id} mod={mod} due={due.per[mod.id] ?? 0} /> : null;
            })}
            {(s.placeholders ?? []).map((p) => (
              <PlaceholderCard key={p.name} p={p} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

const TOPIC_ICONS: Record<string, string> = {
  quant: 'math', economics: 'gauge', corporate: 'bank', fsa: 'table', equities: 'chart-line',
  'fixed-income': 'numbers', derivatives: 'shapes', alternatives: 'grid', portfolio: 'target', ethics: 'scale',
};

function TopicGrid({ course }: { course: CourseConfig }) {
  const lessons = useApp((s) => s.content.cfaLessons);
  const [done] = useStored<string[]>(CFA_DONE_KEY, []);
  return (
    <div className="grid module-grid topic-grid" style={{ '--min': '240px' } as React.CSSProperties}>
      {course.topics!.map((t, i) => (
        <a key={t.id} className="card card-link module-card topic-card" href={`#/c/${course.id}/t/${t.id}`}>
          <div className="row" style={{ alignItems: 'center' }}>
            <div className="module-glyph">{TOPIC_ICONS[t.id] ? <Icon name={TOPIC_ICONS[t.id]} size={26} /> : t.name[0]}</div>
            <span className="spacer" />
            <span className="topic-no">Topic {i + 1}</span>
          </div>
          <h3>{t.name}</h3>
          {(() => {
            // Official modules you ticked as studied (a lesson beyond the official count, like the calculator guide, isn't one).
            const mine = course.id === 'cfa' ? lessons.filter((l) => l.topic === t.id) : [];
            const studied = new Set(mine.filter((l) => done.includes(l.id) && (l.module ?? 0) >= 1 && (l.module ?? 0) <= t.modules).map((l) => l.module)).size;
            const pct = Math.round((studied / t.modules) * 100);
            return (
              <>
                <div className="topic-weight" title={`${studied} of ${t.modules} learning modules ticked as studied`}>
                  <span className="topic-weight-bar"><i style={{ width: `${pct}%` }} /></span>
                  <b>{pct}%</b>
                </div>
                <div className="meta"><span>{studied}/{t.modules} studied · {t.weight[0]}–{t.weight[1]}% of the exam</span></div>
              </>
            );
          })()}
        </a>
      ))}
    </div>
  );
}

function PracticeCard({ course }: { course: CourseConfig }) {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  const due = useDueCounts().perCourse[course.id] ?? 0;
  const mods = useMemo(() => courseModules(course), [course]);
  const ids = useMemo(() => mods.map((m) => m.id), [mods]);
  const weak = useMemo(() => (ids.length ? weakCardIds(cards, Date.now(), ids).length : 0), [cards, ids]);
  if (!mods.length) return <Empty text="Nothing to practise yet. Practice questions and key terms appear here – with spaced repetition – once the course has lessons." />;
  const review = () => {
    const build = () => buildReviewQueue(mods, ctx, getState().cards);
    startSession({ title: `Review · ${course.name}`, cards: build(), back: '/study', rebuild: build });
  };
  return (
    <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <span className="tile-value">{due}</span>
        <span className="muted small">card{due === 1 ? '' : 's'} due today in {course.name}</span>
      </div>
      <div className="row">
        <button className="btn btn-primary" disabled={!due} onClick={review}>
          <Icon name="review" size={18} /> Review now
        </button>
        <button
          className="btn"
          disabled={!weak}
          onClick={() => { const build = () => buildWeakQueue(mods, ctx, cards, Date.now(), ids); startSession({ title: `Weakest · ${course.name}`, cards: build(), back: '/study', rebuild: build }); }}
        >
          <Icon name="zap" size={18} /> Weakest {Math.min(weak, 20) || ''}
        </button>
      </div>
      <div className="faint small">Wrong answers come back sooner, known ones later. Every module's own review is on its page.</div>
    </div>
  );
}

/** /c/:id/t/:topic – one curriculum topic with its learning modules. */
export function TopicPage({ courseId, topicId }: { courseId: string; topicId: string }) {
  const course = getCourse(courseId);
  const topic: Topic | undefined = course.topics?.find((t) => t.id === topicId);
  if (!topic) {
    return (
      <div className="page">
        <div className="empty">Topic not found.</div>
      </div>
    );
  }
  return (
    <div className="page">
      <a href={`#/c/${course.id}`} className="btn btn-ghost btn-sm" style={{ marginLeft: -10, marginBottom: 14 }}>
        <Icon name="left" size={16} /> {course.name}
      </a>
      <div className="page-head">
        <div className="grow">
          <h1>{topic.name}</h1>
          <div className="muted" style={{ marginTop: 4 }}>
            {topic.modules} learning modules · {topic.weight[0]}–{topic.weight[1]}% of the exam
          </div>
        </div>
      </div>
      {course.id === 'cfa' ? (
        <CfaTopicLessons topicId={topic.id} />
      ) : (
        <div className="card card-pad">
          {Array.from({ length: topic.modules }, (_, i) => (
            <div className="mod-row" key={i}>
              <span className="serif">{i + 1}</span>
              <span>
                <b>Learning module {i + 1}</b>
                <span className="faint small"> · no notes yet</span>
              </span>
              <span className="tag">empty</span>
            </div>
          ))}
        </div>
      )}
      <p className="faint small" style={{ marginTop: 14 }}>
        Notes, key terms, formulas, worked examples and practice questions for each module will come from your own material.
      </p>
    </div>
  );
}
