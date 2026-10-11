/**
 * One factory for both kana modules – Hiragana and Katakana only differ in data.
 */
import type { BaseItem, ChartSection, Exercise, Hint, Meaning, Question, StudyContext, StudyModule } from '../../core/types';
import { shuffle } from '../../core/session';
import { matchesReading, toRomaji } from '../../lib/romaji';
import {
  buildKana, kanaChartLayout, kanaGroups, kanaPresets, rowsOfWord, type KanaChar, type Script,
} from './table';
import { KanaChart } from './KanaChart';

export interface Mnemonic { kw: string; text: string }

export interface KanaItem extends BaseItem, KanaChar {}
export interface WordItem extends BaseItem, Meaning { kana: string; romaji: string }

export interface KanaModuleOptions {
  id: string;
  script: Script;
  name: string;
  nameJa: string;
  icon: string;
  description: string;
  mnemonics: Record<string, Mnemonic>;
  words: Array<{ kana: string } & Meaning>;
  wordsName: string;
  wordsDescription: string;
  /** Look-alike groups for multiple-choice distractors (and the katakana drill). */
  confusables: string[][];
  confusableDrill?: boolean;
}

/** Things worth flagging – the four marked "Ausnahme" in the Tofugu notes come first. */
const FLAGS: Record<string, string[]> = {
  shi: ['Ausnahme · shi, not si'],
  chi: ['Ausnahme · chi, not ti'],
  tsu: ['Ausnahme · tsu, not tu'],
  fu: ['Ausnahme · fu, not hu – soft, between h and f'],
  ji: ['ji, not zi'],
  ji2: ['Same sound as じ (ji) – rarely used'],
  zu2: ['Same sound as ず (zu) – rarely used'],
  wo: ['Pronounced o – used as the object particle'],
  ha: ['As the particle は it is read wa'],
  he: ['As the particle へ it is read e'],
  n: ['Before b / m / p it sounds like m'],
  ra: ['Pronunciation: a light tapped r, between r, l and d'],
  ri: ['Pronunciation: a light tapped r'],
  ru: ['Pronunciation: a light tapped r'],
  re: ['Pronunciation: a light tapped r'],
  ro: ['Pronunciation: a light tapped r'],
  sha: ['sha, not sya'],
  shu: ['shu, not syu'],
  sho: ['sho, not syo'],
  cha: ['cha, not tya'],
  chu: ['chu, not tyu'],
  cho: ['cho, not tyo'],
  ja: ['ja, not zya'],
  ju: ['ju, not zyu'],
  jo: ['jo, not zyo'],
};

const DAKU_RULE: Record<string, string> = {
  ga: '゛ (dakuten) makes k → g',
  za: '゛ makes s → z (but じ = ji)',
  da: '゛ makes t → d (ぢ = ji, づ = zu – rare)',
  ba: '゛ makes h → b',
  pa: '゜ (handakuten, the little circle) makes h → p',
};

export function createKanaModule(o: KanaModuleOptions): StudyModule {
  const chars = buildKana(o.script);
  const byId = new Map(chars.map((c) => [c.id, c]));
  const byKana = new Map(chars.map((c) => [c.kana, c]));
  const items: KanaItem[] = chars.map((c) => ({ ...c, label: c.kana, sub: c.romaji, groups: [c.row] }));
  const confusable = new Map<string, string[]>();
  for (const g of o.confusables) for (const k of g) confusable.set(k, [...(confusable.get(k) ?? []), ...g.filter((x) => x !== k)]);

  const words: WordItem[] = [];
  for (const w of o.words) {
    const rows = rowsOfWord(w.kana, chars);
    if (!rows) continue;
    const romaji = toRomaji(w.kana);
    words.push({ id: `w-${romaji.replace(/'/g, '')}`, label: w.kana, sub: romaji, groups: rows, kana: w.kana, romaji, de: w.de, en: w.en });
  }

  const mnemonicOf = (c: KanaChar) => o.mnemonics[c.id];
  const images = (ctx: StudyContext) => ctx.content.hints[o.script] ?? {};

  /** The visual hint for a character; `withImage` = false when the picture would give the answer away. */
  function hintFor(c: KanaChar, ctx: StudyContext, withImage = true): Hint {
    const img = images(ctx);
    const flags = FLAGS[c.id];
    if (c.type === 'basic') {
      const m = mnemonicOf(c);
      return { keyword: m?.kw, text: m?.text, image: withImage ? img[c.id] : undefined, flags };
    }
    const base = c.base ? byKana.get(c.base) : undefined;
    const bm = base ? mnemonicOf(base) : undefined;
    const bimg = withImage && base ? img[base.id] : undefined;
    if (c.type === 'dakuten') {
      return {
        keyword: bm?.kw,
        text: `Start from ${c.base} (${base?.romaji}) – ${bm?.text ?? ''}`,
        image: bimg,
        rules: [DAKU_RULE[c.row], `${c.base} ${base?.romaji} → ${withImage ? c.kana + ' ' : ''}${c.romaji}`],
        flags,
      };
    }
    const small = [...c.kana].slice(1).join('');
    if (c.type === 'combo') {
      return {
        keyword: bm?.kw,
        image: bimg,
        rules: [`${c.base} (${base?.romaji}) + small ${small} → ${c.romaji}`, 'The i-sound melts away: ki + ya = kya, one beat'],
        flags,
      };
    }
    return { rules: [`${c.base} + small ${small} → ${c.romaji}`], text: 'Extra sounds used for foreign words.', flags };
  }

  const solutionNotes = (c: KanaChar, ctx: StudyContext) => {
    const notes = [...(FLAGS[c.id] ?? [])];
    if (ctx.settings.leniency !== 'strict' && /shi|chi|tsu|fu|ji/.test(c.romaji)) {
      const alt = c.romaji.replace('shi', 'si').replace('chi', 'ti').replace('tsu', 'tu').replace('fu', 'hu').replace('ji', 'zi');
      if (alt !== c.romaji) notes.push(`“${alt}” is accepted too`);
    }
    return notes;
  };

  /** Up to n wrong options: look-alikes first, then the same kind of kana. */
  function distractors(c: KanaItem, pool: KanaItem[], n: number, rng: () => number): KanaItem[] {
    const out: KanaItem[] = [];
    const ok = (x: KanaItem | undefined): x is KanaItem =>
      !!x && x.id !== c.id && x.romaji !== c.romaji && !out.includes(x) && !['ji2', 'zu2', 'uo'].includes(x.id);
    const look = [...(confusable.get(c.kana) ?? [])];
    if (c.base) look.push(c.base);
    if (c.type === 'dakuten') {
      const sib = c.row === 'ba' ? 'pa' : c.row === 'pa' ? 'ba' : null;
      if (sib) look.push(...items.filter((x) => x.row === sib && x.romaji.slice(-1) === c.romaji.slice(-1)).map((x) => x.kana));
    }
    if (c.type === 'combo') {
      look.push(...items.filter((x) => x.type === 'combo' && (x.base === c.base || x.kana.slice(-1) === c.kana.slice(-1))).map((x) => x.kana));
    }
    for (const k of shuffle(look, rng)) {
      const x = items.find((i) => i.kana === k);
      if (ok(x) && out.length < Math.min(2, n)) out.push(x);
    }
    for (const x of shuffle(pool.filter((p) => p.type === c.type), rng)) if (out.length < n && ok(x)) out.push(x);
    for (const x of shuffle(items.filter((p) => p.type === c.type), rng)) if (out.length < n && ok(x)) out.push(x);
    for (const x of shuffle(items, rng)) if (out.length < n && ok(x)) out.push(x);
    return out;
  }

  const meaning = (m: Meaning, ctx: StudyContext) => m[ctx.settings.meaningLang];

  // ----------------------------------------------------------------- exercises

  const read: Exercise<KanaItem> = {
    id: 'read',
    name: 'Kana → Romaji',
    description: 'See a character, type how it’s read.',
    icon: o.script === 'hiragana' ? 'あ' : 'ア',
    items: () => items,
    question: (c, ctx): Question => ({
      prompt: { text: c.kana, lang: 'ja', size: 'hero', instruction: 'Type the reading' },
      answer: { type: 'typing', input: 'romaji', check: (v) => matchesReading(v, c.kana, ctx.settings.leniency) },
      solution: { main: c.romaji, lang: 'latin', notes: solutionNotes(c, ctx) },
      hint: hintFor(c, ctx),
      speak: c.kana,
      fastMs: 2500,
    }),
  };

  const recall: Exercise<KanaItem> = {
    id: 'recall',
    name: 'Romaji → Kana',
    description: 'See the sound, pick the right character.',
    icon: 'a',
    items: () => items.filter((c) => !['ji2', 'zu2', 'uo'].includes(c.id)),
    question: (c, ctx): Question => {
      const options = shuffle([c, ...distractors(c, ctx.pool as KanaItem[], 5, ctx.rng)], ctx.rng);
      return {
        prompt: { text: c.romaji, lang: 'latin', size: 'hero', instruction: `Which ${o.script} is this?` },
        answer: { type: 'choice', options: options.map((x) => ({ label: x.kana, lang: 'ja' })), correct: options.indexOf(c) },
        solution: { main: c.kana, lang: 'ja', sub: c.romaji },
        hint: hintFor(c, ctx, false),
        revealHint: hintFor(c, ctx, true),
        speak: c.kana,
        fastMs: 2500,
      };
    },
  };

  const wordStrip = (w: WordItem, ctx: StudyContext) => {
    const strip: NonNullable<Hint['strip']> = [];
    const ks = [...w.kana];
    for (let i = 0; i < ks.length; i++) {
      const two = ks[i] + (ks[i + 1] ?? '');
      let c = byKana.get(two);
      if (c && c.type !== 'basic' && /[ゃゅょャュョィェォァ]/.test(ks[i + 1] ?? '')) i++;
      else c = byKana.get(ks[i]);
      if (!c) { strip.push({ kana: ks[i] }); continue; }
      const h = hintFor(c, ctx);
      strip.push({ kana: c.kana, keyword: h.keyword ? `${c.kana} ${h.keyword}` : c.kana, image: h.image });
    }
    return strip;
  };

  const wordsEx: Exercise<WordItem> = {
    id: 'words',
    name: o.wordsName,
    description: o.wordsDescription,
    icon: o.script === 'hiragana' ? 'ねこ' : 'パン',
    items: () => words,
    question: (w, ctx): Question => ({
      prompt: { text: w.kana, lang: 'ja', size: 'large', instruction: 'Read the word – type it in romaji' },
      answer: { type: 'typing', input: 'romaji', check: (v) => matchesReading(v, w.kana, ctx.settings.leniency) },
      solution: { main: w.romaji, lang: 'latin', sub: meaning(w, ctx) },
      hint: { strip: wordStrip(w, ctx) },
      speak: w.kana,
      fastMs: 1500 + 700 * [...w.kana].length,
    }),
  };

  const write: Exercise<KanaItem> = {
    id: 'write',
    name: 'Writing',
    description: 'Draw the character, then compare with the stroke order.',
    icon: '筆',
    items: () => items.filter((c) => c.type === 'basic' || c.type === 'dakuten'),
    question: (c, ctx): Question => ({
      prompt: { text: c.romaji, lang: 'latin', size: 'large', instruction: `Write “${c.romaji}” in ${o.script}` },
      answer: { type: 'draw', char: c.kana },
      solution: { main: c.kana, lang: 'ja', sub: c.romaji },
      hint: hintFor(c, ctx, false),
      revealHint: hintFor(c, ctx, true),
      speak: c.kana,
    }),
  };

  const exercises: Exercise<any>[] = [read, recall, wordsEx, write];

  if (o.confusableDrill) {
    const drillItems = items.filter((c) => confusable.has(c.kana) && c.type === 'basic');
    exercises.push({
      id: 'lookalikes',
      name: 'Look-alikes',
      description: 'シ or ツ? ソ or ン? Drill the characters that are easy to mix up.',
      icon: 'シツ',
      items: () => drillItems,
      question: (c: KanaItem, ctx): Question => {
        const group = (confusable.get(c.kana) ?? []).map((k) => byKana.get(k)).filter((x): x is KanaChar => !!x);
        const opts = shuffle([c, ...group.filter((g) => g.romaji !== c.romaji)].slice(0, 6), ctx.rng);
        const showChar = ctx.rng() < 0.5;
        return showChar
          ? {
              prompt: { text: c.kana, lang: 'ja', size: 'hero', instruction: 'Which sound is this?' },
              answer: { type: 'choice', options: opts.map((x) => ({ label: x.romaji, lang: 'latin' })), correct: opts.indexOf(c) },
              solution: { main: c.romaji, lang: 'latin', notes: [o.mnemonics[c.id]?.text ?? ''].filter(Boolean) },
              hint: hintFor(c, ctx),
              speak: c.kana,
              fastMs: 2500,
            }
          : {
              prompt: { text: c.romaji, lang: 'latin', size: 'hero', instruction: 'Pick the right character' },
              answer: { type: 'choice', options: opts.map((x) => ({ label: x.kana, lang: 'ja' })), correct: opts.indexOf(c) },
              solution: { main: c.kana, lang: 'ja', notes: [o.mnemonics[c.id]?.text ?? ''].filter(Boolean) },
              hint: hintFor(c, ctx, false),
              revealHint: hintFor(c, ctx),
              speak: c.kana,
              fastMs: 2500,
            };
      },
    });
  }

  const layout = kanaChartLayout();
  const cell = (id: string | null) => {
    if (!id) return null;
    const c = byId.get(id);
    return c ? { id, label: c.kana, sub: c.romaji } : null;
  };
  const chart = (): ChartSection[] => {
    const s: ChartSection[] = [
      { title: 'Basic', columns: 5, cells: layout.basic.map(cell) },
      { title: 'Dakuten ゛ ゜', columns: 5, cells: layout.dakuten.map(cell) },
      { title: 'Combinations', columns: 3, cells: layout.combos.map(cell) },
    ];
    if (o.script === 'katakana') s.push({ title: 'Loanword sounds', columns: 5, cells: layout.extended.map(cell) });
    return s;
  };

  const mod: StudyModule = {
    id: o.id,
    name: o.name,
    nameJa: o.nameJa,
    icon: o.icon,
    description: o.description,
    status: 'ready',
    exercises,
    groups: () => kanaGroups(o.script),
    presets: kanaPresets(o.script),
    defaultGroups: ['a', 'ka'],
    chart,
    tools: [
      {
        id: 'chart',
        name: `${o.name} chart`,
        description: 'Every character with its picture, sound and stroke order.',
        icon: o.script === 'hiragana' ? 'あ' : 'ア',
        component: ({ ctx }) => (
          <KanaChart ctx={ctx} moduleId={o.id} sections={chart()} chars={byId} hintFor={(c) => hintFor(c, ctx)} />
        ),
      },
    ],
  };
  return mod;
}
