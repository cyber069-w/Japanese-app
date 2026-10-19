/**
 * Runs a study session: shows one question at a time, checks the answer,
 * records it in the SRS, and brings wrong items back a few cards later.
 * Fully keyboard driven: Enter = next, 1–6 = choose, Space = audio, ? = hint, Esc = exit.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSession, type SessionConfig } from '../core/sessionConfig';
import { exerciseItems, shuffle, type SessionCard } from '../core/session';
import { gradeFromAnswer, type Grade } from '../core/srs';
import { recordAnswer, useApp } from '../core/store';
import { cardId, type Hint, type Question, type StudyContext } from '../core/types';
import { getModule } from '../modules';
import { navigate } from '../lib/router';
import { slowRate, speak, speechSupported, useSpeaking } from '../lib/speech';
import { formatDuration } from '../lib/date';
import { weakTopics } from '../core/exam';
import { Icon } from '../components/Icon';
import { Ruby } from '../components/Ruby';
import { HintPanel } from '../components/HintPanel';
import { ChoiceAnswer, DrawAnswer, OrderAnswer, RevealAnswer, TypingAnswer, type Phase } from '../components/answers';

export function SessionScreen() {
  const [cfg, setCfg] = useState<SessionConfig | null>(() => getSession());
  const [run, setRun] = useState(0);
  if (!cfg || cfg.cards.length === 0) {
    return (
      <div className="session">
        <div className="finish card">
          <Icon name="study" size={44} />
          <h2 style={{ margin: '8px 0' }}>Nothing to study here</h2>
          <p className="muted">Pick a module and an exercise to start a session.</p>
          <div className="session-actions">
            <button className="btn btn-primary" onClick={() => navigate('/study')}>
              Go to Study
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <Runner
      key={run}
      cfg={cfg}
      restart={(c) => {
        setCfg(c);
        setRun((r) => r + 1);
      }}
    />
  );
}

interface Result { card: SessionCard; correct: boolean }

const PRAISE = ['Correct', 'Nice', 'Great', 'Well done', 'Spot on', 'Yes!'];

function Runner({ cfg, restart }: { cfg: SessionConfig; restart: (c: SessionConfig) => void }) {
  const settings = useApp((s) => s.settings);
  const content = useApp((s) => s.content);
  const ctx: StudyContext = useMemo(() => ({ settings, content, rng: Math.random }), [settings, content]);

  const [queue, setQueue] = useState<SessionCard[]>(cfg.cards);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ask');
  const [outcome, setOutcome] = useState<{ correct: boolean; value?: string; chosen?: number } | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [guide, setGuide] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const startedAt = useRef(Date.now());
  const shownAt = useRef(Date.now());
  const requeued = useRef(new Map<string, number>());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [left, setLeft] = useState(cfg.mock ? cfg.mock.minutes * 60 : null);
  useEffect(() => {
    if (!cfg.mock) return;
    const t = setInterval(() => setLeft(Math.max(0, cfg.mock!.minutes * 60 - Math.round((Date.now() - startedAt.current) / 1000))), 1000);
    return () => clearInterval(t);
  }, [cfg.mock]);

  const card = queue[index] as SessionCard | undefined;
  const mod = card ? getModule(card.moduleId) : undefined;
  const ex = mod?.exercises.find((e) => e.id === card!.exerciseId);

  const question: Question | null = useMemo(() => {
    if (!card || !mod || !ex) return null;
    const pool = cfg.pools?.[`${card.moduleId}:${card.exerciseId}`] ?? exerciseItems(ex, ctx);
    return ex.question(card.item, { ...ctx, pool });
    // a question must stay stable while it is on screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.key]);

  const audioFirst = question?.speakWhen === 'prompt';
  const play = useCallback(() => {
    if (question?.speak) speak(question.speak, settings.voiceRate);
  }, [question, settings.voiceRate]);
  const playSlow = useCallback(() => {
    if (question?.speak) speak(question.speak, slowRate(settings.voiceRate));
  }, [question, settings.voiceRate]);

  // audio that belongs to the prompt (listening) plays right away
  useEffect(() => {
    if (question && audioFirst) {
      const t = setTimeout(play, 250);
      return () => clearTimeout(t);
    }
  }, [question, audioFirst, play]);

  const next = useCallback(() => {
    clearTimeout(timer.current);
    setIndex((i) => i + 1);
    setPhase('ask');
    setOutcome(null);
    setHintOpen(false);
    setHintUsed(false);
    setRevealed(false);
    setGuide(false);
    shownAt.current = Date.now();
  }, []);

  const commit = (correct: boolean, grade: Grade, extra: { value?: string; chosen?: number } = {}, selfGraded = false) => {
    if (!card || !ex || phase !== 'ask') return;
    const ms = Date.now() - shownAt.current;
    recordAnswer(cardId(card.moduleId, card.exerciseId, card.item.id), card.moduleId, grade, ms, ex.srs !== false);
    setResults((r) => [...r, { card, correct }]);
    if (!correct && !ex.generative && !cfg.mock) {
      // bring the item back a few cards later (max. twice per session)
      const k = `${card.moduleId}:${card.exerciseId}:${card.item.id}`;
      const n = requeued.current.get(k) ?? 0;
      if (n < 2) {
        requeued.current.set(k, n + 1);
        setQueue((q) => {
          const copy = [...q];
          copy.splice(Math.min(copy.length, index + 4), 0, { ...card, key: `${card.key}+${n}` });
          return copy;
        });
      }
    }
    if (selfGraded) {
      next();
      return;
    }
    setOutcome({ correct, ...extra });
    setPhase('done');
    if (settings.sound && question?.speak) play();
    if (correct && settings.autoAdvance) {
      const wait = question?.solution.sub || hintUsed ? 1900 : 1000;
      timer.current = setTimeout(next, wait);
    }
  };

  const onAnswer = (ok: boolean, value: string) =>
    commit(ok, gradeFromAnswer(ok, { hinted: hintUsed, ms: Date.now() - shownAt.current, fastMs: question?.fastMs }), { value });

  const onChoose = (i: number) => {
    if (!question || question.answer.type !== 'choice' || phase !== 'ask') return;
    const ok = i === question.answer.correct;
    commit(ok, gradeFromAnswer(ok, { hinted: hintUsed, ms: Date.now() - shownAt.current, fastMs: question.fastMs }), { chosen: i });
  };

  const onGrade = (g: Grade) => commit(g !== 'again', g, {}, true);

  const toggleHint = () => {
    if (phase !== 'ask' || !question?.hint) return;
    setHintOpen((o) => !o);
    setHintUsed(true);
    // keep typing after opening the hint with the mouse
    setTimeout(() => document.querySelector<HTMLInputElement>('.answer-input')?.focus({ preventScroll: true }), 0);
  };

  const exit = () => navigate(cfg.back);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' && (target as HTMLInputElement).value !== '';
      if (e.key === 'Escape') { e.preventDefault(); exit(); return; }
      if (e.key === '?') { e.preventDefault(); toggleHint(); return; }
      if (e.key === ' ' && e.shiftKey && question?.speak) { e.preventDefault(); playSlow(); return; }
      if (phase === 'done') {
        if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); next(); }
        else if (e.key === ' ' && !typing) { e.preventDefault(); play(); }
        return;
      }
      if (e.key === ' ' && !typing && (audioFirst || question?.answer.type === 'choice')) {
        e.preventDefault();
        if (audioFirst) play();
        return;
      }
      if (question?.answer.type === 'choice' && /^[1-6]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < question.answer.options.length) { e.preventDefault(); onChoose(i); }
      }
      if ((question?.answer.type === 'reveal' || question?.answer.type === 'draw') && e.key === 'Enter' && !revealed) {
        e.preventDefault();
        setRevealed(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  // ----- finished -----
  if (!card || !question || !mod || !ex || left === 0) {
    return <Finish cfg={cfg} results={results} ms={Date.now() - startedAt.current} restart={restart} />;
  }

  const p = question.prompt;
  const progress = index / queue.length;
  const praise = PRAISE[(index * 7 + 3) % PRAISE.length];
  const shownHint = withoutRepeats(question.revealHint === null ? undefined : question.revealHint ?? question.hint, question.solution.notes);

  return (
    <div className="session">
      <div className="session-top">
        <button className="icon-btn" onClick={exit} aria-label="End session">
          <Icon name="x" />
        </button>
        <div className="bar" aria-label={`Progress ${Math.round(progress * 100)}%`}>
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="session-count">
          {left !== null && <b style={{ marginRight: 10 }} aria-label="Time left">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</b>}
          {Math.min(index + 1, queue.length)} / {queue.length}
        </div>
      </div>
      <div className="faint small center" style={{ marginTop: 2 }}>
        {cfg.title}
        {cfg.title !== `${mod.name} · ${ex.name}` && <> · {mod.name}</>}
      </div>

      <div
        key={card.key}
        className={`qcard card${phase === 'done' && outcome ? (outcome.correct ? ' correct' : ' wrong shake') : ''}`}
      >
        <div className="q-tools">
          {question.speak && speechSupported() && !p.audioOnly && (audioFirst || phase === 'done' || question.answer.type === 'draw') && (
            <button className="icon-btn" onClick={play} aria-label="Play pronunciation" title="Play (Space)">
              <Icon name="speaker" />
            </button>
          )}
          {question.hint && phase === 'ask' && (
            <button className={`icon-btn${hintOpen ? ' on' : ''}`} onClick={toggleHint} aria-label="Show hint" title="Hint (?)">
              <Icon name="bulb" />
            </button>
          )}
        </div>
        <div className="q-instruction">{p.instruction}</div>
        {p.audioOnly ? (
          <AudioPrompt play={play} playSlow={playSlow} />
        ) : (
          (p.text || p.ruby) && (
            <div className={`q-prompt ${p.size} ${p.lang}`} lang={p.lang === 'ja' ? 'ja' : undefined}>
              {p.ruby ? <Ruby text={p.ruby} /> : p.text}
            </div>
          )
        )}
        {p.visual}
        {p.sub && <div className="q-sub">{p.sub}</div>}

        {hintOpen && phase === 'ask' && question.hint && <HintPanel hint={question.hint} />}

        {question.answer.type === 'typing' && (
          <TypingAnswer answer={question.answer} phase={phase} correct={outcome?.correct ?? null} onAnswer={onAnswer} />
        )}
        {question.answer.type === 'choice' && (
          <ChoiceAnswer answer={question.answer} phase={phase} chosen={outcome?.chosen ?? null} onChoose={onChoose} />
        )}
        {question.answer.type === 'order' && (
          <OrderAnswer answer={question.answer} phase={phase} correct={outcome?.correct ?? null} onAnswer={onAnswer} />
        )}
        {question.answer.type === 'draw' && (
          <DrawAnswer
            answer={question.answer}
            phase={phase}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onGrade={(g) => onGrade(hintUsed && g !== 'again' ? 'hard' : g)}
            guide={guide}
            setGuide={(v) => {
              setGuide(v);
              if (v) setHintUsed(true);
            }}
          />
        )}
        {question.answer.type === 'reveal' && (
          <RevealAnswer answer={question.answer} phase={phase} revealed={revealed} onReveal={() => setRevealed(true)} onGrade={onGrade} />
        )}
        {question.answer.type === 'draw' && revealed && (
          <SolutionBlock q={question} />
        )}

        {phase === 'done' && outcome && (
          <div className={`feedback ${outcome.correct ? 'good' : 'bad'}`} style={{ width: '100%' }}>
            <div className="feedback-head">
              <Icon name={outcome.correct ? 'check' : 'x'} size={20} stroke={2.4} />
              <span className="nowrap">{outcome.correct ? praise : 'Not quite'}</span>
              {!outcome.correct && outcome.value && (
                <span className="faint small feedback-typed">
                  you wrote “{outcome.value}”
                </span>
              )}
            </div>
            <SolutionBlock q={question} />
            {(!outcome.correct || hintUsed) && shownHint && <HintPanel hint={shownHint} />}
            <div className="session-actions" style={{ justifyContent: 'flex-start' }}>
              <button className="btn btn-primary" onClick={next} autoFocus={!outcome.correct}>
                Continue <kbd style={{ background: 'transparent', color: 'inherit', borderColor: 'currentColor' }}>Enter</kbd>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="kbd-help">
        <span><kbd>Enter</kbd> check / next</span>
        {question.answer.type === 'choice' && <span><kbd>1</kbd>–<kbd>{question.answer.options.length}</kbd> choose</span>}
        {question.speak && <span><kbd>Space</kbd> audio</span>}
        {question.speak && audioFirst && <span><kbd>Shift</kbd>+<kbd>Space</kbd> slow</span>}
        {question.hint && <span><kbd>?</kbd> hint</span>}
        {question.answer.type === 'reveal' && question.answer.record && <span><kbd>R</kbd> record</span>}
        <span><kbd>Esc</kbd> quit</span>
      </div>
    </div>
  );
}

/** Listening prompt: a big replay button that pulses while the audio plays, plus a slow replay. */
function AudioPrompt({ play, playSlow }: { play: () => void; playSlow: () => void }) {
  const speaking = useSpeaking();
  if (!speechSupported()) {
    return <div className="notice warn" style={{ margin: '12px 0' }}>This browser can’t play Japanese audio. Try Safari or Chrome.</div>;
  }
  return (
    <div className="audio-prompt">
      <button className={`audio-play${speaking ? ' speaking' : ''}`} onClick={play} aria-label="Play again" title="Play again (Space)">
        <Icon name="speaker" size={34} />
      </button>
      <button className="btn btn-sm btn-ghost" onClick={playSlow} title="Slow replay (Shift+Space)">
        <Icon name="gauge" size={16} /> Slower
      </button>
    </div>
  );
}

/** The hint shown with the solution, minus lines the solution notes already say. Undefined if nothing is left. */
function withoutRepeats(hint: Hint | undefined, notes: string[] | undefined): Hint | undefined {
  if (!hint || !notes?.length) return hint;
  const said = new Set(notes);
  const h: Hint = {
    ...hint,
    text: hint.text && said.has(hint.text) ? undefined : hint.text,
    rules: hint.rules?.filter((r) => !said.has(r)),
    flags: hint.flags?.filter((f) => !said.has(f)),
  };
  const empty = !h.keyword && !h.text && !h.image && !h.rules?.length && !h.flags?.length && !h.strip?.length && !h.ruby;
  return empty ? undefined : h;
}

function SolutionBlock({ q }: { q: Question }) {
  const s = q.solution;
  const long = [...s.main].length > (s.lang === 'ja' ? 9 : 20);
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 2 }}>Answer</div>
      <div className={`solution-main ${s.lang}${long ? ' long' : ''}`} lang={s.lang === 'ja' ? 'ja' : undefined}>
        {s.ruby ? <Ruby text={s.ruby} /> : s.main}
      </div>
      {s.sub && <div className="solution-sub">{s.sub}</div>}
      {s.notes && s.notes.length > 0 && (
        <ul className="solution-notes">
          {s.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Finish({ cfg, results, ms, restart }: { cfg: SessionConfig; results: Result[]; ms: number; restart: (c: SessionConfig) => void }) {
  // accuracy on the first attempt of each card
  const first = new Map<string, Result>();
  for (const r of results) {
    const k = `${r.card.moduleId}:${r.card.exerciseId}:${r.card.item.id}`;
    if (!first.has(k)) first.set(k, r);
  }
  const firsts = [...first.values()];
  const right = firsts.filter((r) => r.correct).length;
  const pct = firsts.length ? Math.round((right / firsts.length) * 100) : 0;
  const mistakes = firsts.filter((r) => !r.correct);
  const mood = pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Well done!' : pct >= 40 ? 'Keep going!' : 'One more round!';

  return (
    <div className="session">
      <div className="finish card">
        <div className="eyebrow">Session complete</div>
        <div className="serif" style={{ fontSize: '1.4rem', margin: '10px 0 2px' }}>{mood}</div>
        <div className="big">{pct}%</div>
        <p className="muted">
          {right} of {firsts.length} right on the first try · {formatDuration(ms)}
        </p>
        {cfg.mock && mistakes.length > 0 && (
          <div className="section" style={{ marginTop: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Weak topics</div>
            <div className="mistake-list">
              {weakTopics(mistakes.map((m) => m.card), (id) => getModule(id)?.name ?? id).map((t) => <span key={t.name}>{t.name} · {t.n} wrong</span>)}
            </div>
          </div>
        )}
        {mistakes.length > 0 && (
          <div className="section" style={{ marginTop: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>To practise</div>
            <div className="mistake-list">
              {mistakes.map((m) => (
                <span key={m.card.key}>{m.card.item.label}</span>
              ))}
            </div>
          </div>
        )}
        <div className="session-actions" style={{ marginTop: 26 }}>
          {mistakes.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() =>
                restart({
                  ...cfg,
                  title: 'Mistakes',
                  mock: undefined,
                  cards: shuffle(mistakes.map((m) => ({ ...m.card, key: m.card.key + '~m' }))),
                })
              }
            >
              <Icon name="refresh" size={18} /> {cfg.mock ? 'Drill these' : 'Practise mistakes'}
            </button>
          )}
          {cfg.rebuild && (
            <button className="btn" onClick={() => restart({ ...cfg, cards: cfg.rebuild!() })}>
              Another round
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => navigate(cfg.back)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
