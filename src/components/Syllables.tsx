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

export function Syllables({ text }: { text: string }) {
  let n = 0;
  return (
    <span lang="ja">
      {splitMorae(text).map((m, i) =>
        /[\s～〜。、？！?!・[\]()（）]/.test(m) ? m : <span key={i} className={`syl syl-${n++ % 4}`}>{m}</span>,
      )}
    </span>
  );
}
