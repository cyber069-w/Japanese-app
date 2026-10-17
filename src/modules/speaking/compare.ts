/**
 * Compares what the recogniser heard with the sentence you were reading, word chunk by word chunk.
 * The recogniser returns kanji/kana; a chunk counts as said when its written form or its reading
 * appears, in order, in what was heard.
 */
import { toHiragana } from '../../lib/romaji';
import { sentenceRomaji, type Sentence } from '../grammar/sentence';

export interface WordCheck { romaji: string; ok: boolean }

const norm = (s: string) => toHiragana(s).replace(/[\s。、？！?!・「」.,～〜]/g, '');
const PARTICLE_SOUND: Record<string, string> = { は: 'わ', へ: 'え', を: 'お' };

export function compareSpoken(s: Sentence, heard: string): { words: WordCheck[]; score: number } {
  const h = norm(heard);
  let pos = 0;
  const words = s.chunks.map((chunk) => {
    let ok = true;
    for (const seg of chunk.segs) {
      const forms = [seg.text, seg.reading, seg.particle ? PARTICLE_SOUND[seg.text] : undefined].filter(Boolean).map((f) => norm(f!)).filter(Boolean);
      if (!forms.length) continue;
      const hits = forms.map((f) => ({ i: h.indexOf(f, pos), len: f.length })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
      if (hits.length) pos = hits[0].i + hits[0].len;
      else ok = false;
    }
    return { romaji: sentenceRomaji({ ...s, chunks: [chunk] }), ok };
  });
  const said = words.filter((w) => w.ok).length;
  return { words, score: words.length ? said / words.length : 0 };
}

/** Best of the recogniser's alternatives. */
export function bestMatch(s: Sentence, alternatives: string[]) {
  return alternatives.map((a) => ({ heard: a, ...compareSpoken(s, a) })).sort((a, b) => b.score - a.score)[0];
}
