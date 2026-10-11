/**
 * Turns raw vocab entries (from the course pack or your CSV imports) into study items.
 *
 * Entry notation (as printed in Minna no Nihongo):
 *   "だれ (どなた)"            → two accepted answers
 *   "[お]みやげ"               → optional part: おみやげ or みやげ
 *   "～かい (～がい)"          → ～ is a placeholder and ignored when checking
 */
import type { BaseItem, RubyText, StudyContext, VocabEntry } from '../../core/types';
import { alignRuby } from '../../lib/furigana';
import { kanaEquals } from '../../lib/romaji';

export interface VocabItem extends BaseItem {
  entry: VocabEntry;
  /** Main kana form for display (brackets removed). */
  kana: string;
  /** Alternative form shown in brackets, e.g. どなた */
  alt?: string;
  kanji?: string;
  ruby: RubyText;
  /** All accepted kana answers. */
  answers: string[];
  de: string;
  en: string;
}

const PUNCT = /[\s～〜。、？！?!・,.「」]/g;

function splitAlt(s: string): [string, string | undefined] {
  const m = /^(.*?)\s*[(（]([^)）]+)[)）]\s*$/.exec(s);
  return m ? [m[1].trim(), m[2].trim()] : [s.trim(), undefined];
}

/** All combinations with and without the [optional] parts. */
function expandOptional(s: string): string[] {
  const m = /\[([^\]]+)\]/.exec(s);
  if (!m) return [s];
  const before = s.slice(0, m.index), after = s.slice(m.index + m[0].length);
  return [...expandOptional(before + m[1] + after), ...expandOptional(before + after)];
}

const clean = (s: string) => s.replace(/[[\]]/g, '');

export function buildVocabItem(e: VocabEntry): VocabItem {
  const [mainKana, altKana] = splitAlt(e.kana);
  const [mainKanji] = e.kanji ? splitAlt(e.kanji) : [undefined];
  const answers = [...new Set([mainKana, ...(altKana ? [altKana] : [])].flatMap(expandOptional).map((a) => a.replace(PUNCT, '')))].filter(Boolean);
  const kana = clean(mainKana);
  const kanji = mainKanji ? clean(mainKanji) : undefined;
  const ruby = kanji ? alignRuby(kanji.replace(/\s/g, ''), kana.replace(/\s/g, '')) : [[kana] as [string]];
  const tags = e.tags ?? [];
  const optional = tags.find((t) => t === 'extra' || t === 'place');
  return {
    id: e.id,
    label: kanji ?? kana,
    sub: e.de,
    groups: [`L${e.lesson}`, ...(optional ? [optional] : [])],
    lesson: e.lesson,
    entry: e,
    kana,
    alt: altKana ? clean(altKana) : undefined,
    kanji,
    ruby,
    answers,
    de: e.de,
    en: e.en,
  };
}

/** Accept the answer if it matches any form. In phrases, particles は/を/へ typed as わ/お/え also pass. */
export function vocabAccepts(input: string, item: VocabItem): boolean {
  const v = input.replace(PUNCT, '');
  const phrase = /[\s。？！?]|は$/.test(item.entry.kana.trim());
  const particles = (a: string) => a.replace(/は/g, 'わ').replace(/を/g, 'お').replace(/へ/g, 'え');
  return item.answers.some((a) => kanaEquals(v, a) || (phrase && kanaEquals(v, particles(a))));
}

export const lessonLabel = (n: number) => (n === 0 ? 'Intro' : `L${n}`);

let cache: { vocab: unknown; items: VocabItem[] } | null = null;
/** All vocab items from the current content (cached until the content changes). */
export function vocabItems(ctx: StudyContext): VocabItem[] {
  if (cache?.vocab !== ctx.content.vocab) cache = { vocab: ctx.content.vocab, items: ctx.content.vocab.map(buildVocabItem) };
  return cache.items;
}
