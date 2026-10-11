import type { Hint } from '../core/types';
import { Ruby } from './Ruby';

/**
 * The visual memory hint: big keyword ("MOO"), the mnemonic picture with the kana
 * drawn into it, a short explanation, and flags for exceptions.
 */
export function HintPanel({ hint }: { hint: Hint }) {
  const hasImg = !!hint.image;
  return (
    <div className={`hint-panel${hasImg ? '' : ' no-img'}`} role="note" aria-label="Memory hint">
      {hasImg && (
        <div className="hint-img">
          <img src={hint.image} alt={hint.keyword ? `Mnemonic picture: ${hint.keyword}` : 'Mnemonic picture'} />
        </div>
      )}
      <div>
        {hint.keyword && <div className="hint-keyword">{hint.keyword}</div>}
        {hint.ruby && <Ruby text={hint.ruby} className="hint-ruby serif" />}
        {hint.text && <p className="hint-text">{hint.text}</p>}
        {hint.rules && hint.rules.length > 0 && (
          <div className="hint-rules">
            {hint.rules.map((r) => (
              <span key={r}>{r}</span>
            ))}
          </div>
        )}
        {hint.flags && hint.flags.length > 0 && (
          <div className="hint-flags">
            {hint.flags.map((f) => (
              <span key={f} className="tag tag-warn">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
      {hint.strip && hint.strip.length > 0 && (
        <div className="hint-strip">
          {hint.strip.map((s, i) => (
            <div className="hint-strip-item" key={i}>
              {s.image ? (
                <div className="hint-img">
                  <img src={s.image} alt={s.keyword ?? s.kana} />
                </div>
              ) : (
                <div className="serif">{s.kana}</div>
              )}
              {s.keyword && <b>{s.keyword}</b>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
