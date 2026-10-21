/**
 * /learn/:id – one CFA lesson in two versions: the guided lesson (one short step at a time: its new words first,
 * then the explanation, example, quick check and "Ask tutor"; English or German explanations) and the original PDF.
 */
import { Fragment, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setSelection, useApp } from '../../core/store';
import { navigate } from '../../lib/router';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { TutorButton } from '../../components/TutorButton';
import type { TutorRequest } from '../../lib/tutor';
import { LessonPdfPanel } from './LessonPdf';
import { loadLessonPacks } from './lessonPacks';

const AnnotatedPdf = lazy(() => import('./AnnotatedPdf'));
type View = 'guided' | 'annotated' | 'pdf';
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
const deShort = (de: string) => de.split(/[:–]/)[0].trim().replace(/\.$/, '');

export function practiceLesson(l: CfaLesson) {
  setSelection('cfa', [l.id]);
  navigate('/m/cfa');
}

export function LearnScreen({ id }: { id: string }) {
  const lesson = useApp((s) => s.content.cfaLessons.find((l) => l.id === id));
  const [view, setViewState] = useState<View>(() => (read('cfa-lesson-view') as View | null) ?? 'pdf');
  // one language for the guided lesson and the notes
  const [lang, setLangState] = useState<Lang>(() => (read('cfa-learn-lang') ?? (read('cfa-learn-de') === '1' ? 'de' : 'en')) as Lang);
  useEffect(() => {
    void loadLessonPacks(); // an older copy on this device gets the current version (with its guided lesson)
  }, []);
  if (!lesson) {
    return (
      <div className="page">
        <div className="empty">Lesson not found – import it under CFA lessons → Import lesson.</div>
      </div>
    );
  }
  const setView = (v: View) => {
    setViewState(v);
    write('cfa-lesson-view', v);
  };
  const setLang = (l: Lang) => {
    setLangState(l);
    write('cfa-learn-lang', l);
  };
  const shown: View = view === 'guided' && !lesson.learn ? 'annotated' : view;
  const tabs: Array<[View, string, string, boolean]> = [
    ['pdf', 'text', 'Original', true],
    ['annotated', 'pen', 'Annotated', true],
    ['guided', 'book', 'Guided', !!lesson.learn],
  ];
  return (
    <div className="page learn">
      <a href={`#/c/cfa/t/${lesson.topic}`} className="btn btn-ghost btn-sm" style={{ marginLeft: -10, marginBottom: 6 }}>
        <Icon name="left" size={16} /> {CFA_TOPIC_NAMES[lesson.topic] ?? lesson.topic}
      </a>
      <h1 className="lesson-title">{lesson.title}</h1>
      <div className="lesson-bar">
        <div className="seg lesson-tabs" role="tablist" aria-label="Version">
          {tabs.map(([v, icon, label, enabled]) => (
            <button key={v} role="tab" aria-selected={shown === v} className={shown === v ? 'on' : ''} disabled={!enabled} onClick={() => setView(v)}>
              <Icon name={icon} size={16} /> {label}
            </button>
          ))}
        </div>
        <div className="lesson-bar-end">
          {shown !== 'pdf' && (
            <div className="seg seg-sm" role="group" aria-label="Language of the explanations">
              <button className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')} title="English">EN</button>
              <button className={lang === 'de' ? 'on' : ''} aria-pressed={lang === 'de'} onClick={() => setLang('de')} title="Deutsch">DE</button>
            </div>
          )}
          <button className="btn btn-sm btn-ghost" onClick={() => practiceLesson(lesson)}><Icon name="cards" size={16} /> Practise</button>
        </div>
      </div>
      {!lesson.learn && shown === 'annotated' && (
        <p className="faint small" style={{ margin: '0 0 12px' }}>
          The guided version isn’t on this device yet. It loads by itself when the app is online and unlocked – if it doesn’t appear,
          open <a href={`#/c/cfa/t/${lesson.topic}`}>{CFA_TOPIC_NAMES[lesson.topic] ?? lesson.topic}</a> and enter your course-pack passphrase there.
        </p>
      )}
      {shown === 'pdf' && <LessonPdfPanel lesson={lesson} />}
      {shown === 'annotated' && (
        <Suspense fallback={<p className="muted small">Loading…</p>}>
          <AnnotatedPdf lesson={lesson} lang={lang} />
        </Suspense>
      )}
      {shown === 'guided' && <Learn key={lesson.id} lesson={lesson} lang={lang} />}
    </div>
  );
}

type Lang = 'en' | 'de';
/** [[shown|glossary key]] → the glossary keys used in a text, in order. */
const wordKeys = (text = '') => [...text.matchAll(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g)].map((m) => (m[2] ?? m[1]).trim().toLowerCase());
/** Text without the [[…]] markup, for the tutor prompt. */
const plain = (text = '') => text.replace(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g, '$1');

function Learn({ lesson, lang }: { lesson: CfaLesson; lang: Lang }) {
  const learn = lesson.learn!;
  const total = learn.sections.length + 2; // intro · sections · summary
  const [step, setStepState] = useState(() => Math.min(Number(read(`cfa-learn-step:${lesson.id}`)) || 0, total - 1));
  const [word, setWord] = useState<CfaTerm | null>(null);
  const de = lang === 'de';

  const setStep = (n: number) => {
    setStepState(n);
    write(`cfa-learn-step:${lesson.id}`, String(n));
    window.scrollTo({ top: 0 });
  };
  const glossary = useMemo(() => {
    const m = new Map<string, CfaTerm>();
    for (const t of [...lesson.terms, ...learn.words]) m.set(t.term.toLowerCase(), t);
    return m;
  }, [lesson, learn]);

  /** For every step, the glossary words it uses for the first time in the lesson. */
  const newWords = useMemo(() => {
    const steps = [[learn.intro], ...learn.sections.map((x) => [x.text, x.example, x.remember, x.trap]), learn.summary];
    const seen = new Set<string>();
    return steps.map((texts) => {
      const fresh: CfaTerm[] = [];
      for (const k of texts.flatMap((t) => wordKeys(t))) {
        const t = glossary.get(k);
        if (t && !seen.has(k)) {
          seen.add(k);
          fresh.push(t);
        }
      }
      return fresh;
    });
  }, [learn, glossary]);

  const meaning = (t: CfaTerm) => (de && t.de ? t.de : t.definition);

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
  const sde = de ? section?.de : undefined;
  const missingDe = de && ((section && !sde?.text) || (step === 0 && !learn.de?.intro) || (step === total - 1 && !learn.de?.summary));
  const fresh = newWords[step] ?? [];
  const back = `/c/cfa/t/${lesson.topic}`;
  const stepTitle = step === 0 ? 'Introduction' : section ? section.title : 'Summary';

  const tutor = (): TutorRequest => ({
    courseId: 'cfa',
    courseName: 'CFA Level I',
    topic: `${CFA_TOPIC_NAMES[lesson.topic] ?? lesson.topic} – ${lesson.title} – ${stepTitle}`,
    context: section
      ? [plain(section.text), section.example && `Example:\n${plain(section.example)}`, section.remember && `Remember: ${plain(section.remember)}`, section.trap && `Exam trap: ${plain(section.trap)}`].filter(Boolean).join('\n\n')
      : plain(step === 0 ? learn.intro : learn.summary.join('\n')),
    task: de
      ? 'Erkläre mir diesen Schritt noch einmal einfacher, Schritt für Schritt, mit einem neuen kleinen Zahlenbeispiel. Antworte auf Deutsch und nenne die englischen Fachbegriffe in Klammern. Danach beantworte meine Fragen dazu.'
      : 'Explain this step again in simpler words, step by step, with one new small example with numbers. Answer in English and explain every technical term. Then answer my follow-up questions.',
  });

  return (
    <div>
      <div className="learn-steps" aria-label={`Step ${step + 1} of ${total}`}>
        <div className="learn-progress"><span style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
        <span className="learn-steps-count">{step + 1} / {total}</span>
      </div>

      <article className="card card-pad learn-card">
        <h2>{step === 0 ? lesson.title : section ? (sde?.title ?? section.title) : de ? 'Das Wichtigste' : 'What to take away'}</h2>
        {missingDe && <div className="faint small">This step isn’t in German yet – shown in English.</div>}

        {fresh.length > 0 && (
          <section className="learn-section">
            <div className="eyebrow">New words</div>
            <dl className="learn-newwords">
              {fresh.map((t) => (
                <div key={t.term}>
                  <dt><button type="button" className="learn-term" onClick={() => setWord(t)}>{t.term}</button></dt>
                  <dd>{meaning(t)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {step === 0 && (
          <>
            <section className="learn-section">
              <div className="eyebrow">What this lesson is about</div>
              <div className="learn-text">{rich((de && learn.de?.intro) || learn.intro)}</div>
            </section>
            {learn.words.length > 0 && (
              <details className="learn-section learn-all-words">
                <summary className="eyebrow">All words in this lesson ({learn.words.length + lesson.terms.length})</summary>
                <div className="learn-words">
                  {[...learn.words, ...lesson.terms].map((w) => (
                    <button key={w.term} type="button" className="learn-chip" onClick={() => setWord(w)}>
                      {w.term}
                      {de && w.de && <span className="learn-de"> · {deShort(w.de)}</span>}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {section && (
          <>
            <section className="learn-section">
              <div className="eyebrow">Explanation</div>
              <div className="learn-text">{rich(sde?.text ?? section.text)}</div>
            </section>
            {section.example && (
              <section className="learn-box example"><div className="eyebrow">Example</div>{rich(sde?.example ?? section.example)}</section>
            )}
            {section.remember && (
              <section className="learn-box remember"><div className="eyebrow">Remember</div>{rich(sde?.remember ?? section.remember)}</section>
            )}
            {section.trap && (
              <section className="learn-box trap"><div className="eyebrow">Exam trap</div>{rich(sde?.trap ?? section.trap)}</section>
            )}
            {section.check && <Check key={`${step}-${lang}`} q={sde?.check ?? section.check} />}
          </>
        )}

        {step === total - 1 && (
          <>
            <ul className="learn-summary">{((de && learn.de?.summary) || learn.summary).map((s, i) => <li key={i}>{rich(s)}</li>)}</ul>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => practiceLesson(lesson)}><Icon name="cards" size={16} /> Practise this lesson</button>
              <button className="btn" onClick={() => setStep(0)}><Icon name="refresh" size={16} /> Start again</button>
            </div>
          </>
        )}

        <div className="learn-tutor">
          <TutorButton small label="Ask tutor about this step" request={tutor} />
        </div>
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
          <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
            {de && word.de ? (
              <>
                <p>{word.de}</p>
                <p className="muted small">{word.definition}</p>
              </>
            ) : (
              <p>{word.definition}</p>
            )}
            <div>
              <TutorButton
                small
                label="Ask tutor about this word"
                request={() => ({
                  courseId: 'cfa',
                  courseName: 'CFA Level I',
                  topic: `${lesson.title} – term: ${word.term}`,
                  context: `Definition: ${word.definition}`,
                  task: de
                    ? 'Erkläre mir diesen Begriff ganz einfach auf Deutsch (englischer Fachbegriff in Klammern), mit einem Alltagsbeispiel und einem kleinen Zahlenbeispiel, und sag mir, wie er in der Prüfung vorkommt.'
                    : 'Explain this term very simply in English, with an everyday example and a small numeric example, and tell me how it shows up in the exam.',
                })}
              />
            </div>
          </div>
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
