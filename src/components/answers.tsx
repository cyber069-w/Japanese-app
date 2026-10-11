/**
 * Answer widgets used by the session screen – one per Answer type.
 * They report back through `onAnswer(correct, detail)` or `onGrade(grade)`.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Answer, ChoiceOption } from '../core/types';
import type { Grade } from '../core/srs';
import { toKana } from '../lib/romaji';
import { Ruby } from './Ruby';
import { DrawPad } from './Strokes';
import { Icon } from './Icon';
import { Recorder } from './Recorder';

export type Phase = 'ask' | 'done';

// ---------------------------------------------------------------------------
// Typing (romaji, kana via live conversion, numbers, free text)
// ---------------------------------------------------------------------------

export function TypingAnswer({
  answer, phase, correct, onAnswer, autoFocus = true,
}: {
  answer: Extract<Answer, { type: 'typing' }>;
  phase: Phase;
  correct: boolean | null;
  onAnswer: (ok: boolean, value: string) => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const toKanaMode = answer.input === 'kana' || answer.input === 'katakana';

  useEffect(() => {
    if (phase === 'ask' && autoFocus) {
      // small delay so mobile keyboards open reliably after the card animation
      const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 30);
      return () => clearTimeout(t);
    }
  }, [phase, autoFocus]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (phase !== 'ask') return;
    const v = toKanaMode ? toKana(value, { katakana: answer.input === 'katakana' }) : value;
    if (!v.trim()) return;
    setValue(v);
    onAnswer(answer.check(v), v);
  };

  const placeholder =
    answer.placeholder ??
    (answer.input === 'romaji' ? 'type in romaji…' : toKanaMode ? 'type romaji → かな' : answer.input === 'number' ? 'type the number…' : 'type your answer…');

  return (
    <form onSubmit={submit} className="answer-area">
      <input
        ref={input}
        className={`answer-input ${phase === 'done' ? (correct ? 'good' : 'bad') : ''}`}
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(toKanaMode ? toKana(v, { final: false, katakana: answer.input === 'katakana' }) : v);
        }}
        readOnly={phase === 'done'}
        placeholder={placeholder}
        lang={toKanaMode ? 'ja' : 'en'}
        inputMode={answer.input === 'number' ? 'numeric' : 'text'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="go"
        aria-label="Your answer"
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Multiple choice
// ---------------------------------------------------------------------------

export function ChoiceAnswer({
  answer, phase, chosen, onChoose,
}: {
  answer: Extract<Answer, { type: 'choice' }>;
  phase: Phase;
  chosen: number | null;
  onChoose: (i: number) => void;
}) {
  const n = answer.options.length;
  const cols = n === 4 ? 2 : n <= 3 ? n : 3;
  const isJa = answer.options.every((o) => o.lang === 'ja' && [...o.label].length <= 3);
  // long Japanese options get one per row on phones instead of breaking mid-word
  const wide = answer.options.some((o) => o.lang === 'ja' && [...o.label].length > 5);
  return (
    <div className="answer-area">
      <div className={`choices${wide ? ' wide' : ''}`} style={{ '--cols': isJa ? cols : Math.min(cols, 2) } as React.CSSProperties}>
        {answer.options.map((o: ChoiceOption, i) => {
          let cls = 'choice';
          if (phase === 'done') {
            if (i === answer.correct) cls += ' correct';
            else if (i === chosen) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={i} type="button" className={cls} disabled={phase === 'done'} onClick={() => onChoose(i)}>
              <span className="choice-key">{i + 1}</span>
              <span className={`choice-main ${o.lang}${[...o.label].length > 3 ? ' long' : ''}`} lang={o.lang === 'ja' ? 'ja' : undefined}>
                {o.ruby ? <Ruby text={o.ruby} /> : o.label}
              </span>
              {o.sub && <span className="choice-sub">{o.sub}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sentence ordering (word tiles)
// ---------------------------------------------------------------------------

export function OrderAnswer({
  answer, phase, correct, onAnswer,
}: {
  answer: Extract<Answer, { type: 'order' }>;
  phase: Phase;
  correct: boolean | null;
  onAnswer: (ok: boolean, value: string) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const check = () => {
    const ok = answer.solutions.some((s) => s.length === picked.length && s.every((t, i) => answer.tiles[t] === answer.tiles[picked[i]]));
    onAnswer(ok, picked.map((i) => answer.tiles[i]).join(' '));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'ask') return;
      if (e.key === 'Enter' && picked.length === answer.tiles.length) { e.preventDefault(); check(); }
      if (e.key === 'Backspace') { e.preventDefault(); setPicked((p) => p.slice(0, -1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="answer-area" style={{ maxWidth: 620 }}>
      <div className={`order-line ${phase === 'done' ? (correct ? 'good' : 'bad') : ''}`}>
        {picked.length === 0 && <span className="faint small">Tap the words in the right order</span>}
        {picked.map((t, i) => (
          <button key={i} type="button" className="order-tile" disabled={phase === 'done'} onClick={() => setPicked((p) => p.filter((_, j) => j !== i))}>
            {answer.tileRuby ? <Ruby text={answer.tileRuby[t]} /> : answer.tiles[t]}
          </button>
        ))}
      </div>
      <div className="order-bank">
        {answer.tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            className={`order-tile${picked.includes(i) ? ' used' : ''}`}
            disabled={phase === 'done' || picked.includes(i)}
            onClick={() => setPicked((p) => [...p, i])}
          >
            {answer.tileRuby ? <Ruby text={answer.tileRuby[i]} /> : tile}
          </button>
        ))}
      </div>
      {phase === 'ask' && (
        <div className="session-actions">
          <button type="button" className="btn btn-primary" disabled={picked.length !== answer.tiles.length} onClick={check}>
            Check <Icon name="check" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Self-graded: drawing and reveal cards
// ---------------------------------------------------------------------------

export function GradeButtons({ onGrade, hinted }: { onGrade: (g: Grade) => void; hinted?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = ({ '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' } as Record<string, Grade>)[e.key];
      if (g) { e.preventDefault(); onGrade(hinted && (g === 'good' || g === 'easy') ? 'hard' : g); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onGrade, hinted]);
  const b = (g: Grade, label: string, sub: string, key: string) => (
    <button type="button" className={`btn${g === 'again' ? ' btn-danger' : ''}`} onClick={() => onGrade(hinted && (g === 'good' || g === 'easy') ? 'hard' : g)}>
      {label}
      <small>
        <kbd>{key}</kbd> {sub}
      </small>
    </button>
  );
  return (
    <div className="grade-buttons">
      {b('again', 'Again', 'forgot', '1')}
      {b('hard', 'Hard', 'struggled', '2')}
      {b('good', 'Good', 'knew it', '3')}
      {b('easy', 'Easy', 'too easy', '4')}
    </div>
  );
}

export function DrawAnswer({
  answer, phase, revealed, onReveal, onGrade, guide, setGuide,
}: {
  answer: Extract<Answer, { type: 'draw' }>;
  phase: Phase;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (g: Grade) => void;
  guide: boolean;
  setGuide: (v: boolean) => void;
}) {
  const [strokes, setStrokes] = useState(0);
  return (
    <div className="answer-area stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <DrawPad char={answer.char} guide={guide} reveal={revealed} onChange={setStrokes} />
      {!revealed ? (
        <div className="session-actions">
          <button type="button" className={`btn btn-ghost${guide ? ' on' : ''}`} onClick={() => setGuide(!guide)}>
            <Icon name="eye" size={18} /> {guide ? 'Hide guide' : 'Trace guide'}
          </button>
          <button type="button" className="btn btn-primary" onClick={onReveal}>
            Check <Icon name="check" size={18} />
          </button>
        </div>
      ) : (
        phase === 'ask' && (
          <>
            <p className="small muted center">
              You drew <b>{strokes}</b> stroke{strokes === 1 ? '' : 's'} – how did it go?
            </p>
            <GradeButtons onGrade={onGrade} hinted={guide} />
          </>
        )
      )}
    </div>
  );
}

export function RevealAnswer({
  answer, phase, revealed, onReveal, onGrade,
}: {
  answer: Extract<Answer, { type: 'reveal' }>;
  phase: Phase;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (g: Grade) => void;
}) {
  return (
    <div className="answer-area stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      {answer.record && <Recorder storageKey={answer.record} hotkey />}
      {revealed ? (
        <>
          <div className="feedback good reveal-back">{answer.back}</div>
          {phase === 'ask' && <GradeButtons onGrade={onGrade} />}
        </>
      ) : (
        <div className="session-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={onReveal}>
            Show answer <Icon name="eye" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
