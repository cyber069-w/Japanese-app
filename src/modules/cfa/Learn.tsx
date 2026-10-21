/**
 * /learn/:id – one CFA lesson in two versions: the guided lesson (one short step at a time, plain English,
 * tap a highlighted word for its meaning, a quick check after each step, German only with the DE switch)
 * and the original PDF.
 */
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { setSelection, useApp } from '../../core/store';
import { navigate } from '../../lib/router';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { LessonPdfPanel } from './LessonPdf';
import { CFA_TOPIC_NAMES, type CfaLesson, type CfaQuestion, type CfaTerm } from './lessons';

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode – fine */
  }
};

/** "Holding period return – Haltedauerrendite: …" → the German word only (before the first ":"). */
const deShort = (de: string) => de.split(/[:–]/)[0].trim();

export function practiceLesson(l: CfaLesson) {
  setSelection('cfa', [l.id]);
  navigate('/m/cfa');
}

export function LearnScreen({ id }: { id: string }) {
  const lesson = useApp((s) => s.content.cfaLessons.find((l) => l.id === id));
  const [view, setViewState] = useState<'guided' | 'pdf'>(() => (read('cfa-lesson-view') === 'pdf' ? 'pdf' : 'guided'));
  if (!lesson) {
    return (
      <div className="page">
        <div className="empty">Lesson not found – import it under CFA lessons → Import lesson.</div>
      </div>
    );
  }
  const setView = (v: 'guided' | 'pdf') => {
    setViewState(v);
    write('cfa-lesson-view', v);
  };
  const shown = lesson.learn ? view : 'pdf';
  return (
    <div className="page learn">
      <a href={`#/c/cfa/t/${lesson.topic}`} className="btn btn-ghost btn-sm" style={{ marginLeft: -10, marginBottom: 6 }}>
        <Icon name="left" size={16} /> {CFA_TOPIC_NAMES[lesson.topic] ?? lesson.topic}
      </a>
      <h1 className="lesson-title">{lesson.title}</h1>
      <div className="row lesson-head">
        <div className="seg" role="tablist" aria-label="Version">
          <button role="tab" aria-selected={shown === 'guided'} className={shown === 'guided' ? 'on' : ''} disabled={!lesson.learn} onClick={() => setView('guided')}>
            <Icon name="book" size={16} /> {lesson.learn ? 'Guided lesson' : 'Guided (coming soon)'}
          </button>
          <button role="tab" aria-selected={shown === 'pdf'} className={shown === 'pdf' ? 'on' : ''} onClick={() => setView('pdf')}>
            <Icon name="text" size={16} /> Original PDF
          </button>
        </div>
        <span className="grow" />
        <button className="btn btn-sm" onClick={() => practiceLesson(lesson)}><Icon name="cards" size={16} /> Practise</button>
      </div>
      {shown === 'guided' ? <Learn key={lesson.id} lesson={lesson} /> : <LessonPdfPanel lesson={lesson} />}
    </div>
  );
}

function Learn({ lesson }: { lesson: CfaLesson }) {
  const learn = lesson.learn!;
  const total = learn.sections.length + 2; // intro · sections · summary
  const [step, setStepState] = useState(() => Math.min(Number(read(`cfa-learn-step:${lesson.id}`)) || 0, total - 1));
  const [de, setDeState] = useState(() => read('cfa-learn-de') === '1');
  const [word, setWord] = useState<CfaTerm | null>(null);

  const setStep = (n: number) => {
    setStepState(n);
    write(`cfa-learn-step:${lesson.id}`, String(n));
    window.scrollTo({ top: 0 });
  };
  const toggleDe = () => {
    setDeState(!de);
    write('cfa-learn-de', de ? '0' : '1');
  };

  const glossary = useMemo(() => {
    const m = new Map<string, CfaTerm>();
    for (const t of [...lesson.terms, ...learn.words]) m.set(t.term.toLowerCase(), t);
    return m;
  }, [lesson, learn]);

  /** Paragraphs with [[word]] / [[shown text|glossary word]] as tappable words. */
  const rich = (text: string): ReactNode =>
    text.split(/\n\s*\n/).map((para, p) => (
      <p key={p}>
        {para.split(/(\[\[[^\]]+\]\])/).map((part, i) => {
          const m = /^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/.exec(part);
          if (!m) return <Fragment key={i}>{part}</Fragment>;
          const t = glossary.get((m[2] ?? m[1]).trim().toLowerCase());
          if (!t) return <b key={i}>{m[1]}</b>;
          return (
            // a span, not a button: a button can't wrap across lines inside the sentence
            <span key={i} role="button" tabIndex={0} className="learn-word" onClick={() => setWord(t)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setWord(t))}>
              {m[1]}
              {de && t.de && <span className="learn-de"> ({deShort(t.de)})</span>}
            </span>
          );
        })}
      </p>
    ));

  const section = step >= 1 && step <= learn.sections.length ? learn.sections[step - 1] : null;
  const back = `/c/cfa/t/${lesson.topic}`;

  return (
    <div>
      <div className="row learn-steps">
        <div className="eyebrow grow">Step {step + 1} of {total}</div>
        <button type="button" className={`btn btn-sm learn-de-toggle${de ? ' on' : ''}`} onClick={toggleDe} aria-pressed={de} title="Show German translations">DE</button>
      </div>
      <div className="learn-progress"><span style={{ width: `${((step + 1) / total) * 100}%` }} /></div>

      <article className="card card-pad learn-card">
        {step === 0 && (
          <>
            <div className="learn-text">{rich(learn.intro)}</div>
            {learn.words.length > 0 && (
              <>
                <h3>Words you will meet</h3>
                <div className="learn-words">
                  {learn.words.map((w) => (
                    <button key={w.term} type="button" className="learn-chip" onClick={() => setWord(w)}>
                      {w.term}
                      {de && w.de && <span className="learn-de"> · {deShort(w.de)}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {section && (
          <>
            <h2>{section.title}</h2>
            <div className="learn-text">{rich(section.text)}</div>
            {section.example && (
              <div className="learn-box example"><div className="eyebrow">Example</div>{rich(section.example)}</div>
            )}
            {section.remember && (
              <div className="learn-box remember"><div className="eyebrow">Remember</div>{rich(section.remember)}</div>
            )}
            {section.trap && (
              <div className="learn-box trap"><div className="eyebrow">Exam trap</div>{rich(section.trap)}</div>
            )}
            {section.check && <Check key={step} q={section.check} />}
          </>
        )}

        {step === total - 1 && (
          <>
            <h2>What to take away</h2>
            <ul className="learn-summary">{learn.summary.map((s, i) => <li key={i}>{rich(s)}</li>)}</ul>
            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn btn-primary" onClick={() => practiceLesson(lesson)}><Icon name="cards" size={16} /> Practise this lesson</button>
              <button className="btn" onClick={() => setStep(0)}><Icon name="refresh" size={16} /> Start again</button>
            </div>
          </>
        )}
      </article>

      <div className="row learn-nav">
        <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}><Icon name="left" size={16} /> Back</button>
        <span className="grow" />
        {step < total - 1 ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Next <Icon name="right" size={16} /></button>
        ) : (
          <button className="btn" onClick={() => navigate(back)}>Done</button>
        )}
      </div>

      {word && (
        <Sheet title={word.term} onClose={() => setWord(null)}>
          <p>{word.definition}</p>
          {de && word.de && <p className="muted small" style={{ marginTop: 10 }}><b>DE</b> · {word.de}</p>}
        </Sheet>
      )}
    </div>
  );
}

function Check({ q }: { q: CfaQuestion }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="learn-check">
      <div className="eyebrow">Quick check</div>
      <p><b>{q.q}</b></p>
      <div className="choices wide" style={{ '--cols': 1 } as React.CSSProperties}>
        {q.options.map((o, i) => (
          <button
            key={i}
            type="button"
            className={`choice${picked === null ? '' : i === q.answer ? ' correct' : i === picked ? ' wrong' : ''}`}
            disabled={picked !== null}
            onClick={() => setPicked(i)}
          >
            <span className="choice-main latin">{'ABC'[i] ?? i + 1}) {o}</span>
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className={`notice ${picked === q.answer ? 'good' : 'bad'} small`} style={{ marginTop: 10 }}>
          <b>{picked === q.answer ? 'Right.' : `Not quite – it is ${'ABC'[q.answer]}.`}</b> {q.explain}
        </div>
      )}
    </div>
  );
}
