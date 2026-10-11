import type { RubyText } from '../core/types';

/** Japanese text with furigana. Readings are hidden globally when furigana is off (.no-furigana). */
export function Ruby({ text, className }: { text: RubyText; className?: string }) {
  return (
    <span className={className} lang="ja">
      {text.map(([base, reading], i) =>
        reading ? (
          <ruby key={i}>
            {base}
            <rp>(</rp>
            <rt>{reading}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <span key={i}>{base}</span>
        ),
      )}
    </span>
  );
}
