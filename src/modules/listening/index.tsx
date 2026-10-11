/** Listening: dictation and comprehension using words and sentences from the other modules. */
import type { BaseItem, Exercise, Meaning, Question, RubyText, StudyContext, StudyModule } from '../../core/types';
import { shuffle } from '../../core/session';
import { kanaEquals, toRomaji } from '../../lib/romaji';
import { vocabAccepts, vocabItems } from '../vocab/items';
import { grammarSentences } from '../grammar';
import hiraganaWords from '../hiragana/words.json';
import katakanaWords from '../katakana/words.json';

interface ListenItem extends BaseItem, Meaning {
  kana: string;
  ruby: RubyText;
  check: (v: string) => boolean;
}

const kanaWord = (prefix: string, group: string) => (w: { kana: string } & Meaning): ListenItem => ({
  id: `${prefix}-${toRomaji(w.kana).replace(/'/g, '')}`, label: w.kana, groups: [group], kana: w.kana, ruby: [[w.kana]], de: w.de, en: w.en,
  check: (v) => kanaEquals(v, w.kana),
});
const KANA_ITEMS: ListenItem[] = [...hiraganaWords.map(kanaWord('h', 'kana')), ...katakanaWords.map(kanaWord('k', 'kana'))];

let cache: { vocab: unknown; items: ListenItem[] } | null = null;
function wordItems(ctx: StudyContext): ListenItem[] {
  if (cache?.vocab === ctx.content.vocab) return cache.items;
  const vocab = vocabItems(ctx)
    .filter((v) => !/[～〜]/.test(v.entry.kana))
    .map((v): ListenItem => ({
      id: `v-${v.id}`, label: v.label, groups: ['vocab'], lesson: v.lesson, kana: v.kana, ruby: v.ruby, de: v.de, en: v.en,
      check: (x) => vocabAccepts(x, v),
    }));
  cache = { vocab: ctx.content.vocab, items: [...vocab, ...KANA_ITEMS] };
  return cache.items;
}

const sentenceItems: ListenItem[] = grammarSentences.map((s) => ({
  id: `s-${s.id}`, label: s.s.text, groups: ['sentences'], lesson: s.lesson, kana: s.s.reading, ruby: s.s.ruby, de: s.ex.de, en: s.ex.en,
  check: () => false,
}));

const m = (it: Meaning, ctx: StudyContext) => it[ctx.settings.meaningLang];

const dictation: Exercise<ListenItem> = {
  id: 'dictation',
  name: 'Dictation',
  description: 'Hear a word, type what you hear (romaji turns into kana).',
  icon: '耳',
  items: wordItems,
  question: (it, ctx): Question => ({
    prompt: { audioOnly: true, lang: 'ja', size: 'large', instruction: 'Type what you hear' },
    answer: { type: 'typing', input: /^[゠-ヿ]+$/.test(it.kana) ? 'katakana' : 'kana', check: it.check },
    solution: { main: it.label, ruby: it.ruby, lang: 'ja', sub: `${it.kana} · ${m(it, ctx)}` },
    hint: { text: `${[...it.kana.replace(/\s/g, '')].length} kana · means “${m(it, ctx)}”` },
    speak: it.kana,
    speakWhen: 'prompt',
    fastMs: 5000,
  }),
};

const meaning: Exercise<ListenItem> = {
  id: 'meaning',
  name: 'What does it mean?',
  description: 'Hear a word, pick its meaning.',
  icon: '意',
  items: wordItems,
  question: (it, ctx): Question => {
    const pool = (ctx.pool as ListenItem[]).filter((x) => m(x, ctx) !== m(it, ctx));
    const wrong = shuffle(pool, ctx.rng).filter((x, i, a) => a.findIndex((y) => m(y, ctx) === m(x, ctx)) === i).slice(0, 3);
    const opts = shuffle([it, ...wrong], ctx.rng);
    return {
      prompt: { audioOnly: true, lang: 'ja', size: 'large', instruction: 'What does it mean?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: m(o, ctx), lang: 'latin' })), correct: opts.indexOf(it) },
      solution: { main: it.label, ruby: it.ruby, lang: 'ja', sub: m(it, ctx) },
      speak: it.kana,
      speakWhen: 'prompt',
      fastMs: 4000,
    };
  },
};

const sentences: Exercise<ListenItem> = {
  id: 'sentences',
  name: 'Sentences',
  description: 'Hear a sentence from the grammar lessons, pick the translation.',
  icon: '文',
  items: () => sentenceItems,
  question: (it, ctx): Question => {
    const near = sentenceItems.filter((x) => x.id !== it.id && m(x, ctx) !== m(it, ctx) && Math.abs((x.lesson ?? 0) - (it.lesson ?? 0)) <= 1);
    const wrong = shuffle(near, ctx.rng).slice(0, 3);
    const opts = shuffle([it, ...wrong], ctx.rng);
    return {
      prompt: { audioOnly: true, lang: 'ja', size: 'large', instruction: 'What did you hear?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: m(o, ctx), lang: 'latin' })), correct: opts.indexOf(it) },
      solution: { main: it.label, ruby: it.ruby, lang: 'ja', sub: m(it, ctx) },
      hint: { text: 'Press Space to hear it again. You can slow the voice down in Settings › Sound.' },
      speak: it.kana,
      speakWhen: 'prompt',
      fastMs: 6000,
    };
  },
};

export const listening: StudyModule = {
  id: 'listening',
  name: 'Listening',
  nameJa: '聴解',
  icon: '聴',
  description: 'Dictation and comprehension with words and sentences from your other modules.',
  status: 'ready',
  exercises: [dictation, meaning, sentences],
  groups: (ctx) => [
    ...(ctx.content.vocab.length ? [{ id: 'vocab', label: 'Your vocab', sub: 'Minna no Nihongo', section: 'Sources' }] : []),
    { id: 'kana', label: 'Kana words', sub: 'ねこ, コーヒー …', section: 'Sources' },
    { id: 'sentences', label: 'Grammar sentences', sub: 'lessons 1–10', section: 'Sources' },
  ],
  presets: [],
};
