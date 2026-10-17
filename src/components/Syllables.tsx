import { toRomaji } from '../lib/romaji';

/** Kana split into syllables (morae), each in its own colour so word length and rhythm are easy to see. */
const SMALL = /[ゃゅょぁぃぅぇぉャュョァィゥェォ]/;

export function splitMorae(text: string): string[] {
  const out: string[] = [];
  for (const c of text) {
    if (out.length && SMALL.test(c)) out[out.length - 1] += c;
    else out.push(c);
  }
  return out;
}

/** With `romaji`, each kana gets its romaji underneath in the same colour. */
export function Syllables({ text, romaji }: { text: string; romaji?: boolean }) {
  let n = 0;
  return (
    <span lang="ja">
      {splitMorae(text).map((m, i) =>
        /[\s～〜。、？！?!・[\]()（）]/.test(m) ? m : <span key={i} className={`syl syl-${n++ % 2}${romaji ? ' syl-r' : ''}`}>
            {m}
            {romaji && <small>{m === 'っ' || m === 'ッ' ? '·' : m === 'ー' ? '–' : toRomaji(m)}</small>}
          </span>,
      )}
    </span>
  );
}
