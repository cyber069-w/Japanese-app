/**
 * Listening: dictation, comprehension and sound discrimination, using the words
 * and sentences of the other modules (your vocab, the kana words, the grammar examples).
 */
import type { BaseItem, Exercise, FilterGroup, Meaning, Question, RubyText, StudyContext, StudyModule } from '../../core/types';
import { shuffle } from '../../core/session';
import { kanaEquals, matchesReading, phraseRomaji, toRomaji } from '../../lib/romaji';
import { vocabAccepts, vocabItems } from '../vocab/items';
import { grammarSentences } from '../grammar';
import hiraganaWords from '../hiragana/words.json';
import katakanaWords from '../katakana/words.json';
import { ALIKE_NOTE, pickAlikes, soundAlikes } from './soundAlikes';
import { ListeningBanner } from './ListeningBanner';

interface ListenItem extends BaseItem, Meaning {
  /** Expected kana (may contain spaces and punctuation). */
  kana: string;
  /** What the voice says. */
  say: string;
  ruby: RubyText;
  /** Exact spelling check (leniency is added on top in the exercises). */
  exact: (v: string) => boolean;
  /** Other accepted spellings, e.g. the particle は written わ in a dictation. */
  variants?: string[];
}

const isKatakana = (s: string) => /^[゠-ヿ\s・]+$/.test(s);
const lessonGroup = (l: number | undefined) => (l === undefined ? [] : [`L${l}`]);

const kanaWord = (prefix: string) => (w: { kana: string } & Meaning): ListenItem => ({
  id: `${prefix}-${toRomaji(w.kana).replace(/'/g, '')}`,
  label: w.kana,
  sub: w.de,
  groups: ['kana'],
  kana: w.kana,
  say: w.kana,
  ruby: [[w.kana]],
  de: w.de,
  en: w.en,
  exact: (v) => kanaEquals(v, w.kana),
});
const KANA_ITEMS: ListenItem[] = [...hiraganaWords.map(kanaWord('h')), ...katakanaWords.map(kanaWord('k'))];

let cache: { vocab: unknown; items: ListenItem[] } | null = null;
/** Single words and short phrases: your vocab + the kana module words. */
function wordItems(ctx: StudyContext): ListenItem[] {
  if (cache?.vocab === ctx.content.vocab) return cache.items;
  const vocab = vocabItems(ctx)
    .filter((v) => !/[～〜]/.test(v.entry.kana))
    .map((v): ListenItem => ({
      id: `v-${v.id}`,
      label: v.label,
      sub: v.de,
      groups: ['vocab', ...lessonGroup(v.lesson)],
      lesson: v.lesson,
      kana: v.kana,
      say: v.kana,
      ruby: v.ruby,
      de: v.de,
      en: v.en,
      exact: (x) => vocabAccepts(x, v),
    }));
  cache = { vocab: ctx.content.vocab, items: [...vocab, ...KANA_ITEMS] };
  return cache.items;
}

/** は / へ / を as particles sound like わ / え / お – every mix of both spellings is a valid dictation. */
function particleSpellings(segs: Array<{ text: string; reading?: string; particle?: boolean }>): string[] {
  let out = [''];
  const PHON: Record<string, string> = { は: 'わ', へ: 'え', を: 'お' };
  for (const s of segs) {
    const r = s.reading ?? s.text;
    out = s.particle && PHON[r] ? out.flatMap((o) => [o + r, o + PHON[r]]) : out.map((o) => o + r);
    if (out.length > 64) break;
  }
  return out;
}

const SENTENCES: ListenItem[] = grammarSentences.map((s) => ({
  id: `s-${s.id}`,
  label: s.s.text,
  sub: s.ex.de,
  groups: ['sentences', ...lessonGroup(s.lesson)],
  lesson: s.lesson,
  kana: s.s.reading,
  say: s.s.spoken,
  ruby: s.s.ruby,
  de: s.ex.de,
  en: s.ex.en,
  exact: (v) => kanaEquals(v, s.s.reading),
  variants: particleSpellings(s.s.chunks.flatMap((c) => c.segs)),
}));
const kanaCount = (s: string) => [...s.replace(/[\s。、？！?!・]/g, '')].length;
/** Sentences short enough to type after hearing them once or twice. */
const SHORT_SENTENCES = SENTENCES.filter((s) => kanaCount(s.kana) <= 16);

const m = (it: Meaning, ctx: StudyContext) => it[ctx.settings.meaningLang] || it.de || it.en;

/** Exact spelling first; by ear, ei/ee, ou/oo, を/お and particle spellings also count (not in strict mode). */
function heardRight(v: string, it: ListenItem, ctx: StudyContext) {
  if (it.exact(v) || it.variants?.some((x) => kanaEquals(v, x))) return true;
  if (ctx.settings.leniency === 'strict') return false;
  return matchesReading(v, it.kana.replace(/[\s。、？！?!・]/g, ''), 'normal', it.variants);
}

function meaningOptions(it: ListenItem, pool: ListenItem[], all: ListenItem[], ctx: StudyContext) {
  const out: ListenItem[] = [];
  const mine = m(it, ctx);
  for (const src of [pool, all]) {
    for (const x of shuffle(src, ctx.rng)) {
      if (out.length >= 3) break;
      if (m(x, ctx) !== mine && x.kana !== it.kana && !out.some((o) => m(o, ctx) === m(x, ctx))) out.push(x);
    }
  }
  return shuffle([it, ...out], ctx.rng);
}

/** "kana · romaji · meaning" – the kana only when the word is shown with kanji above it. */
const solutionSub = (it: ListenItem, ctx: StudyContext) =>
  [it.label !== it.kana && it.kana.replace(/\s+/g, ' '), phraseRomaji(it.kana), m(it, ctx)].filter(Boolean).join(' · ');

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

const dictation: Exercise<ListenItem> = {
  id: 'dictation',
  name: 'Dictation',
  description: 'Hear a word, type what you hear – romaji turns into kana as you type.',
  icon: '耳',
  items: wordItems,
  question: (it, ctx): Question => ({
    prompt: { audioOnly: true, lang: 'ja', size: 'large', instruction: 'Type what you hear' },
    answer: { type: 'typing', input: isKatakana(it.kana) ? 'katakana' : 'kana', check: (v) => heardRight(v, it, ctx) },
    solution: { main: it.label, ruby: it.ruby, lang: 'ja', sub: solutionSub(it, ctx) },
    hint: { text: `${kanaCount(it.kana)} kana · means “${m(it, ctx)}”` },
    revealHint: null,
    speak: it.say,
    speakWhen: 'prompt',
    fastMs: 4000 + kanaCount(it.kana) * 350,
  }),
};

const meaning: Exercise<ListenItem> = {
  id: 'meaning',
  name: 'What does it mean?',
  description: 'Hear a word, pick its meaning.',
  icon: '意',
  items: wordItems,
  question: (it, ctx): Question => {
    const opts = meaningOptions(it, ctx.pool as ListenItem[], wordItems(ctx), ctx);
    return {
      prompt: { audioOnly: true, lang: 'ja', size: 'large', instruction: 'What does it mean?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: m(o, ctx), lang: 'latin' })), correct: opts.indexOf(it) },
      solution: { main: it.label, ruby: it.ruby, lang: 'ja', sub: solutionSub(it, ctx) },
      hint: { ruby: it.ruby, text: 'Read it instead of listening.' },
      revealHint: null,
      speak: it.say,
      speakWhen: 'prompt',
      fastMs: 4000,
    };
  },
};

/** Words that have at least three near-miss spellings. */
let alikeCache: { items: ListenItem[]; out: ListenItem[] } | null = null;
function alikeItems(ctx: StudyContext): ListenItem[] {
  const items = wordItems(ctx);
  if (alikeCache?.items === items) return alikeCache.out;
  const seen = new Set<string>();
  const out = items.filter((it) => {
    const k = it.kana;
    if (seen.has(k) || /[\s。、？！?!・]/.test(k) || kanaCount(k) < 2 || kanaCount(k) > 7) return false;
    seen.add(k);
    return soundAlikes(k).length >= 3;
  });
  alikeCache = { items, out };
  return out;
}

const alikes: Exercise<ListenItem> = {
  id: 'alikes',
  name: 'Hear the difference',
  description: 'ビル or ビール? きて or きって? Pick exactly what you heard.',
  icon: '音',
  items: alikeItems,
  question: (it, ctx): Question => {
    const wrong = pickAlikes(it.kana, 3, ctx.rng);
    const opts = shuffle([it.kana, ...wrong.map((w) => w.kana)], ctx.rng);
    return {
      prompt: { audioOnly: true, lang: 'ja', size: 'large', instruction: 'Which one did you hear?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: o, lang: 'ja' })), correct: opts.indexOf(it.kana) },
      solution: { main: it.kana, lang: 'ja', sub: m(it, ctx), notes: wrong.map((w) => `not ${w.kana} – ${ALIKE_NOTE[w.kind]}`) },
      speak: it.say,
      speakWhen: 'prompt',
      fastMs: 3500,
    };
  },
};

const sentences: Exercise<ListenItem> = {
  id: 'sentences',
  name: 'Sentences',
  description: 'Hear a sentence from the grammar lessons, pick the translation.',
  icon: '文',
  items: () => SENTENCES,
  question: (it, ctx): Question => {
    const near = SENTENCES.filter((x) => Math.abs((x.lesson ?? 0) - (it.lesson ?? 0)) <= 1);
    const opts = meaningOptions(it, near, SENTENCES, ctx);
    return {
      prompt: { audioOnly: true, lang: 'ja', size: 'large', instruction: 'What did you hear?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: m(o, ctx), lang: 'latin' })), correct: opts.indexOf(it) },
      solution: { main: it.label, ruby: it.ruby, lang: 'ja', sub: m(it, ctx) },
      hint: { ruby: it.ruby, text: 'Read along – or replay it slower (Shift + Space).' },
      revealHint: null,
      speak: it.say,
      speakWhen: 'prompt',
      fastMs: 6000,
    };
  },
};

const sentenceDictation: Exercise<ListenItem> = {
  id: 'sentence-dictation',
  name: 'Sentence dictation',
  description: 'Hear a short sentence and type it in kana. は/わ, へ/え, を/お both count.',
  icon: '書',
  items: () => SHORT_SENTENCES,
  question: (it, ctx): Question => ({
    prompt: { audioOnly: true, lang: 'ja', size: 'large', instruction: 'Type the sentence you hear', sub: m(it, ctx) },
    answer: { type: 'typing', input: 'kana', check: (v) => heardRight(v, it, ctx), placeholder: 'type romaji → かな' },
    solution: { main: it.label, ruby: it.ruby, lang: 'ja', sub: `${it.kana} · ${phraseRomaji(it.say)}`, notes: particleNote(it) },
    hint: { text: `${kanaCount(it.kana)} kana. Particles: は is said “wa”, へ “e”, を “o”.` },
    revealHint: null,
    speak: it.say,
    speakWhen: 'prompt',
    fastMs: 9000 + kanaCount(it.kana) * 400,
  }),
};

function particleNote(it: ListenItem): string[] | undefined {
  const n = it.variants && it.variants.length > 1;
  return n ? ['The particles は / へ / を are said wa / e / o – both spellings count here.'] : undefined;
}

export const listening: StudyModule = {
  id: 'listening',
  name: 'Listening',
  nameJa: '聴解',
  icon: '聴',
  description: 'Dictation, comprehension and sound drills with words and sentences from your other modules.',
  status: 'ready',
  exercises: [dictation, meaning, alikes, sentences, sentenceDictation],
  groups: (ctx): FilterGroup[] => {
    const words = wordItems(ctx);
    const hasVocab = words.some((w) => w.groups[0] === 'vocab');
    const lessons = [...new Set([...words, ...SENTENCES].map((i) => i.lesson).filter((l): l is number => l !== undefined))].sort((a, b) => a - b);
    return [
      ...(hasVocab ? [{ id: 'vocab', label: 'Your vocab', sub: 'Minna no Nihongo', section: 'Sources' }] : []),
      { id: 'kana', label: 'Kana words', sub: 'ねこ, コーヒー …', section: 'Sources' },
      { id: 'sentences', label: 'Grammar sentences', sub: `${SENTENCES.length}`, section: 'Sources' },
      ...lessons.map((l) => ({ id: `L${l}`, label: l === 0 ? 'Intro' : `第${l}課`, section: 'Lessons' })),
    ];
  },
  banner: ListeningBanner,
};
