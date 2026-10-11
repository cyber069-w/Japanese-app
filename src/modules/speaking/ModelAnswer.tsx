/** Model answers for the oral exam questions – used on the answer side of a card and in the question list. */
import type { StudyContext } from '../../core/types';
import { Ruby } from '../../components/Ruby';
import { Icon } from '../../components/Icon';
import { speak } from '../../lib/speech';
import { parseSentence, sentenceRomaji } from '../grammar/sentence';
import { resolve } from './intro';
import type { ModelAnswer, OralQuestion } from './questions';

export function SayButton({ text, ctx, label = 'Play' }: { text: string; ctx: StudyContext; label?: string }) {
  return (
    <button type="button" className="icon-btn say-btn" onClick={() => speak(text, ctx.settings.voiceRate)} aria-label={label} title={label}>
      <Icon name="speaker" size={17} />
    </button>
  );
}

/** One Japanese sentence with furigana, a play button and its translation. */
export function SpokenLine({ ja, meaning, ctx, size = 'md', romaji = false }: {
  ja: string; meaning?: string; ctx: StudyContext; size?: 'md' | 'lg'; romaji?: boolean;
}) {
  const s = parseSentence(ja);
  return (
    <div className={`spoken-line ${size}`}>
      <SayButton text={s.spoken} ctx={ctx} />
      <div className="spoken-text">
        <Ruby text={s.ruby} className="serif" />
        {romaji && <div className="faint tiny">{sentenceRomaji(s)}</div>}
        {meaning && <div className="muted small">{meaning}</div>}
      </div>
    </div>
  );
}

/** Answer side of a question card: question (for listening mode), model answer, alternatives, tip. */
export function ModelBack({ q, ctx, showQuestion = false, exampleNote = true }: {
  q: OralQuestion; ctx: StudyContext; showQuestion?: boolean; exampleNote?: boolean;
}) {
  const lang = ctx.settings.meaningLang;
  const r = resolve(ctx.content.profile);
  const answers: ModelAnswer[] = q.answers(r, new Date());
  const example = q.uses?.some((f) => r.missing.has(f));
  const [main, ...alts] = answers;
  return (
    <div className="model stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      {showQuestion && (
        <div>
          <div className="eyebrow">Question</div>
          <SpokenLine ja={q.q} meaning={q[lang]} ctx={ctx} />
        </div>
      )}
      <div>
        <div className="eyebrow">{example ? 'Example answer' : 'Model answer'}</div>
        <SpokenLine ja={main.ja} meaning={main[lang]} ctx={ctx} size="lg" romaji />
      </div>
      {alts.length > 0 && (
        <div>
          <div className="eyebrow">Also possible</div>
          {alts.map((x) => (
            <SpokenLine key={x.ja} ja={x.ja} meaning={x[lang]} ctx={ctx} />
          ))}
        </div>
      )}
      {q.tip && (
        <div className="model-tip">
          <Icon name="bulb" size={16} /> <span>{q.tip[lang]}</span>
        </div>
      )}
      {example && exampleNote && (
        <div className="notice small">
          Example person. <a href="#/m/speaking/t/intro">Write your self-introduction</a> to get answers about you.
        </div>
      )}
    </div>
  );
}
