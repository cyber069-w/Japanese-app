/** Kanji data (built by scripts/build-kanji.mjs from KANJIDIC2 + JMdict) and the study list. */
import type { BaseItem, StudyContext } from '../../core/types';
import raw from './kanji.json';
import { vocabItems } from '../vocab/items';

export interface KanjiExample { w: string; r: string; en: string; de?: string }
export interface KanjiInfo {
  kanji: string;
  strokes: number;
  grade?: number;
  jlpt?: number;
  n5: boolean;
  on: string[];
  kun: string[];
  en: string[];
  de?: string;
  examples: KanjiExample[];
}

export const KANJI = raw as KanjiInfo[];
export const KANJI_BY_CHAR = new Map(KANJI.map((k) => [k.kanji, k]));
export const DEFAULT_LIST = KANJI.filter((k) => k.n5).map((k) => k.kanji);

export interface KanjiItem extends BaseItem { k: KanjiInfo }

/** Meaning in the chosen language (German meanings exist for the default list; otherwise English). */
export const kanjiMeaning = (k: KanjiInfo, ctx: StudyContext) =>
  ctx.settings.meaningLang === 'de' && k.de ? k.de : k.en.slice(0, 3).join(', ');

export const exampleMeaning = (e: KanjiExample, ctx: StudyContext) => (ctx.settings.meaningLang === 'de' && e.de ? e.de : e.en);

/** "い.く" → "い(く)", "-び" → "～び" */
export const formatKun = (r: string) => r.replace(/^-/, '～').replace(/-$/, '～').replace(/\.(.+)$/, '($1)');

let cache: { key: unknown[]; items: KanjiItem[] } | null = null;

/**
 * The kanji you study: your own list (Kanji › My list) or the default N5 list.
 * Each kanji is tagged with the first Minna no Nihongo lesson whose vocab uses it.
 */
export function kanjiItems(ctx: StudyContext): KanjiItem[] {
  const key = [ctx.content.kanjiList, ctx.content.vocab, ctx.settings.meaningLang];
  if (cache && cache.key.every((k, i) => k === key[i])) return cache.items;
  const list = ctx.content.kanjiList.length ? ctx.content.kanjiList : DEFAULT_LIST;
  const firstLesson = new Map<string, number>();
  for (const v of vocabItems(ctx)) {
    if (!v.kanji || v.entry.source !== 'mnn') continue;
    for (const ch of v.kanji) {
      if (/\p{Script=Han}/u.test(ch) && (firstLesson.get(ch) ?? 99) > v.lesson!) firstLesson.set(ch, v.lesson!);
    }
  }
  const items = list
    .map((ch) => KANJI_BY_CHAR.get(ch))
    .filter((k): k is KanjiInfo => !!k)
    .map((k) => {
      const lesson = firstLesson.get(k.kanji);
      return { id: k.kanji, label: k.kanji, sub: kanjiMeaning(k, ctx), groups: [lesson !== undefined ? `L${lesson}` : 'more'], lesson, k };
    });
  cache = { key, items };
  return items;
}
