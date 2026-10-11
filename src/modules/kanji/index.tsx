/** Kanji: meanings, readings, example words and writing with stroke order. */
import type { BaseItem, ChartSection, Exercise, FilterGroup, Question, StudyContext, StudyModule } from '../../core/types';
import { shuffle } from '../../core/session';
import { kanaEquals, toRomaji } from '../../lib/romaji';
import { alignRuby } from '../../lib/furigana';
import { exampleMeaning, formatKun, kanjiItems, kanjiMeaning, type KanjiExample, type KanjiItem } from './data';
import { KanjiBrowser } from './KanjiBrowser';
import { MyKanjiList } from './MyKanjiList';

interface WordItem extends BaseItem { k: KanjiItem['k']; ex: KanjiExample }

const readings = (it: KanjiItem) => [it.k.on.join('・'), it.k.kun.map(formatKun).join('・')].filter(Boolean).join('  /  ');

function others<T extends { id: string }>(it: T, pool: T[], all: T[], n: number, rng: () => number, same: (a: T, b: T) => boolean): T[] {
  const out: T[] = [];
  for (const src of [pool, all]) for (const x of shuffle(src, rng)) if (out.length < n && x.id !== it.id && !same(x, it) && !out.some((o) => same(o, x))) out.push(x);
  return out;
}

const meaning: Exercise<KanjiItem> = {
  id: 'meaning',
  name: 'Kanji → meaning',
  description: 'See a kanji, pick what it means.',
  icon: '意',
  items: kanjiItems,
  question: (it, ctx): Question => {
    const opts = shuffle([it, ...others(it, ctx.pool as KanjiItem[], kanjiItems(ctx), 3, ctx.rng, (a, b) => kanjiMeaning(a.k, ctx) === kanjiMeaning(b.k, ctx))], ctx.rng);
    return {
      prompt: { text: it.k.kanji, lang: 'ja', size: 'hero', instruction: 'What does this kanji mean?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: kanjiMeaning(o.k, ctx), lang: 'latin' })), correct: opts.indexOf(it) },
      solution: { main: kanjiMeaning(it.k, ctx), lang: 'latin', sub: readings(it), notes: it.k.examples.slice(0, 2).map((e) => `${e.w} (${e.r}) – ${exampleMeaning(e, ctx)}`) },
      hint: it.k.examples[0] ? { text: `Used in ${it.k.examples[0].w} (${it.k.examples[0].r})` } : undefined,
      fastMs: 3000,
    };
  },
};

const reading: Exercise<KanjiItem> = {
  id: 'reading',
  name: 'Kanji → reading',
  description: 'See a kanji, pick its on’yomi / kun’yomi readings.',
  icon: '音',
  items: (ctx) => kanjiItems(ctx).filter((k) => k.k.on.length || k.k.kun.length),
  question: (it, ctx): Question => {
    const opts = shuffle([it, ...others(it, ctx.pool as KanjiItem[], kanjiItems(ctx), 3, ctx.rng, (a, b) => readings(a) === readings(b))], ctx.rng);
    return {
      prompt: { text: it.k.kanji, lang: 'ja', size: 'hero', instruction: 'Which readings belong to it? (on’yomi in katakana / kun’yomi in hiragana)' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: readings(o), lang: 'ja' })), correct: opts.indexOf(it) },
      solution: { main: readings(it), lang: 'ja', sub: kanjiMeaning(it.k, ctx), notes: it.k.examples.map((e) => `${e.w} (${e.r}) – ${exampleMeaning(e, ctx)}`) },
      fastMs: 4000,
    };
  },
};

let wordCache: { items: KanjiItem[]; words: WordItem[] } | null = null;
function wordItems(ctx: StudyContext): WordItem[] {
  const items = kanjiItems(ctx);
  if (wordCache?.items === items) return wordCache.words;
  const seen = new Set<string>();
  const words: WordItem[] = [];
  for (const it of items) {
    for (const ex of it.k.examples) {
      if (seen.has(ex.w)) continue;
      seen.add(ex.w);
      words.push({ id: `w-${ex.w}`, label: ex.w, sub: ex.r, groups: it.groups, lesson: it.lesson, k: it.k, ex });
    }
  }
  wordCache = { items, words };
  return words;
}

const words: Exercise<WordItem> = {
  id: 'words',
  name: 'Word → reading',
  description: 'Read words like 毎日, 銀行, 食べる – type the reading.',
  icon: '読',
  items: wordItems,
  question: (it, ctx): Question => ({
    prompt: { text: it.ex.w, lang: 'ja', size: 'large', instruction: 'Type the reading', sub: exampleMeaning(it.ex, ctx) },
    answer: { type: 'typing', input: 'kana', check: (v) => kanaEquals(v, it.ex.r) },
    solution: { main: it.ex.w, ruby: alignRuby(it.ex.w, it.ex.r), lang: 'ja', sub: `${it.ex.r} · ${toRomaji(it.ex.r)}` },
    hint: { text: `${it.k.kanji}: ${it.k.on.join('・') || '–'} / ${it.k.kun.map(formatKun).join('・') || '–'}` },
    speak: it.ex.r,
    fastMs: 4000,
  }),
};

const write: Exercise<KanjiItem> = {
  id: 'write',
  selfRated: true,
  name: 'Writing',
  description: 'Draw the kanji from its meaning, then check the stroke order.',
  icon: '筆',
  items: kanjiItems,
  question: (it, ctx): Question => ({
    prompt: { text: kanjiMeaning(it.k, ctx), lang: 'latin', size: 'medium', instruction: `Write the kanji · ${it.k.strokes} strokes`, sub: readings(it) },
    answer: { type: 'draw', char: it.k.kanji },
    solution: { main: it.k.kanji, lang: 'ja', sub: readings(it) },
    speak: it.k.examples[0]?.r,
  }),
};

export const kanji: StudyModule = {
  id: 'kanji',
  name: 'Kanji',
  nameJa: '漢字',
  icon: '字',
  description: 'N5 kanji (or your own list) with meanings, readings, example words and stroke order.',
  status: 'ready',
  exercises: [meaning, reading, words, write],
  groups: (ctx): FilterGroup[] => {
    const items = kanjiItems(ctx);
    const lessons = [...new Set(items.map((i) => i.lesson).filter((l): l is number => l !== undefined))].sort((a, b) => a - b);
    const groups: FilterGroup[] = lessons.map((l) => ({
      id: `L${l}`, label: l === 0 ? 'Intro' : `第${l}課`, sub: `${items.filter((i) => i.lesson === l).length}`, section: 'First used in your Minna no Nihongo vocab',
    }));
    const more = items.filter((i) => i.groups[0] === 'more').length;
    if (more) groups.push({ id: 'more', label: lessons.length ? 'Other kanji' : 'All kanji', sub: `${more}`, section: lessons.length ? 'Not in your vocab yet' : 'Kanji' });
    return groups;
  },
  presets: [],
  chart: (ctx): ChartSection[] => [{ title: 'Your kanji', columns: 10, cells: kanjiItems(ctx).map((k) => ({ id: k.id, label: k.label })) }],
  tools: [
    { id: 'browse', name: 'Kanji list', description: 'Every kanji with stroke order, readings and example words.', icon: '覧', component: KanjiBrowser },
    { id: 'mylist', name: 'My kanji list', description: 'Paste the kanji from your course to study exactly those.', icon: '選', component: MyKanjiList },
  ],
};
