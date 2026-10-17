/**
 * Grammar: Minna no Nihongo lessons 1–10 – a lexicon to look things up, plus drills (particles,
 * sentence building, forms, translation). Shown in romaji + German unless the kana layer is on.
 */
import type { BaseItem, Exercise, Meaning, Question, RubyText, StudyContext, StudyModule } from '../../core/types';
import { shuffle } from '../../core/session';
import { toRomaji } from '../../lib/romaji';
import { CONFUSED, PARTICLES, PARTICLE_ROMAJI, chunkRuby, chunkText, parseSentence, sentenceRomaji, validOrders, type Chunk, type Sentence } from './sentence';
import { Lexicon } from './Lexicon';
import formsData from './data/forms.json';
import LEXICON from './data/lexicon.json';
import { POINTS, type GrammarPoint, type RawExample } from './points';

interface ExampleItem extends BaseItem { point: GrammarPoint; ex: RawExample; s: Sentence }
interface BlankItem extends ExampleItem { blank: { chunk: number; seg: number; particle: string } }
interface FormItem extends BaseItem { ja: string; options: string[]; answer: number; t: Meaning }

const lessonGroup = (l: number) => [`L${l}`];

const exampleItems: ExampleItem[] = POINTS.flatMap((p) =>
  p.examples.map((ex, i) => {
    const s = parseSentence(ex.ja);
    return { id: `${p.id}-${i}`, label: s.text, sub: ex.en, groups: lessonGroup(p.lesson), lesson: p.lesson, point: p, ex, s };
  }),
);

const blankItems: BlankItem[] = exampleItems.flatMap((e) =>
  e.s.chunks.flatMap((ch, ci) =>
    ch.segs
      .map((seg, si) => ({ seg, si }))
      .filter(({ seg }) => seg.particle && PARTICLES.includes(seg.text))
      .map(({ seg, si }) => ({ ...e, id: `${e.id}-p${ci}.${si}`, blank: { chunk: ci, seg: si, particle: seg.text } })),
  ),
);

// sentence building: single-clause sentences with 3–6 chunks
const orderItems = exampleItems.filter((e) => e.s.chunks.length >= 3 && e.s.chunks.length <= 6 && !/[、…]/.test(e.s.text));

const formItems: FormItem[] = (formsData as Array<{ id: string; lesson: number; ja: string; options: string[]; answer: number } & Meaning>).map((f) => ({
  id: f.id, label: f.ja.replace(/\[[^\]]*\]|[{}]/g, ''), groups: lessonGroup(f.lesson), lesson: f.lesson, ja: f.ja, options: f.options, answer: f.answer, t: { de: f.de, en: f.en },
}));

const tr = (m: Meaning, ctx: StudyContext) => m[ctx.settings.meaningLang];
const kanaOn = (ctx: StudyContext) => ctx.settings.kanaLayer;
const lex = (p: GrammarPoint) => (LEXICON as Record<string, { name: string; formation: string; rule: string }>)[p.id];
/** Pattern + name for solutions, in romaji / German unless the kana layer is on. */
const patternLine = (p: GrammarPoint, ctx: StudyContext) => (kanaOn(ctx) ? `${p.pattern} – ${tr(p.title, ctx)}` : `${lex(p).formation} – ${lex(p).name}`);
const ruleText = (p: GrammarPoint, ctx: StudyContext) => (kanaOn(ctx) ? tr(p.explain, ctx) : lex(p).rule);
const particleRomaji = (p: string) => PARTICLE_ROMAJI[p] ?? toRomaji(p);
const chunkRomaji = (c: Chunk) => sentenceRomaji({ text: chunkText(c), chunks: [c] } as Sentence);
/** Romaji of a sentence with one particle replaced by a blank. */
function romajiWithBlank(e: BlankItem): string {
  const chunks = e.s.chunks.map((ch, ci) =>
    ci === e.blank.chunk ? { segs: ch.segs.map((seg, si) => (si === e.blank.seg ? { text: '＿', particle: true } : seg)) } : ch,
  );
  return sentenceRomaji({ ...e.s, chunks }).replace(/＿/g, '(   )');
}
const formRomaji = (o: string) => toRomaji(o).replace(/(ja|dewa|deha)arimasen/, '$1 arimasen').replace(/masendeshita$/, 'masen deshita');

/** Sentence with one particle replaced by a blank. */
function withBlank(e: BlankItem): RubyText {
  const out: RubyText = [];
  e.s.chunks.forEach((ch, ci) => {
    ch.segs.forEach((seg, si) => {
      if (ci === e.blank.chunk && si === e.blank.seg) out.push(['（　）']);
      else out.push(seg.reading ? [seg.text, seg.reading] : [seg.text]);
    });
    if (ci < e.s.chunks.length - 1) out.push([' ']);
  });
  return out;
}

const particles: Exercise<BlankItem> = {
  id: 'particles',
  name: 'Particles',
  description: 'Fill in the missing particle – は が を に で へ と も の か …',
  icon: 'は',
  items: () => blankItems,
  question: (it, ctx): Question => {
    const correct = it.blank.particle;
    const ok = new Set([correct, ...(it.ex.ok?.[correct] ?? [])]);
    const pool = [...(CONFUSED[correct] ?? []), ...shuffle(PARTICLES, ctx.rng)].filter((p) => !ok.has(p));
    const wrong = [...new Set(pool)].slice(0, 3);
    const opts = shuffle([correct, ...wrong], ctx.rng);
    return {
      prompt: kanaOn(ctx)
        ? { ruby: withBlank(it), lang: 'ja', size: 'medium', instruction: 'Which particle fits?', sub: tr(it.ex, ctx) }
        : { text: romajiWithBlank(it), lang: 'latin', size: 'medium', instruction: 'Which particle fits?', sub: tr(it.ex, ctx) },
      answer: { type: 'choice', options: opts.map((o) => (kanaOn(ctx) ? { label: o, lang: 'ja' as const } : { label: particleRomaji(o), lang: 'latin' as const })), correct: opts.indexOf(correct) },
      solution: kanaOn(ctx)
        ? { main: it.s.text, ruby: it.s.ruby, lang: 'ja', sub: patternLine(it.point, ctx) }
        : { main: sentenceRomaji(it.s), lang: 'latin', sub: patternLine(it.point, ctx) },
      hint: { text: ruleText(it.point, ctx) },
      speak: it.s.spoken,
      fastMs: 4000,
    };
  },
};

const order: Exercise<ExampleItem> = {
  id: 'order',
  name: 'Build the sentence',
  description: 'Put the word tiles in the right order.',
  icon: '並',
  items: () => orderItems,
  question: (it, ctx): Question => {
    const chunks = it.s.chunks;
    const strip = (t: string) => t.replace(/[。？]$/, '');
    const tiles = chunks.map((c) => (kanaOn(ctx) ? strip(chunkText(c)) : chunkRomaji(c)));
    const tileRuby = kanaOn(ctx) ? chunks.map((c) => chunkRuby(c).map(([b, r]) => [strip(b), r] as [string, string?]).filter(([b]) => b !== '')) : undefined;
    const solutions = validOrders(chunks);
    // shuffle the tiles until they are not already in a correct order
    let perm = chunks.map((_, i) => i);
    for (let t = 0; t < 10; t++) {
      perm = shuffle(perm, ctx.rng);
      if (!solutions.some((s) => s.join() === perm.join())) break;
    }
    return {
      prompt: { text: tr(it.ex, ctx), lang: 'latin', size: 'medium', instruction: 'Build the sentence in Japanese' },
      answer: { type: 'order', tiles: perm.map((i) => tiles[i]), tileRuby: tileRuby && perm.map((i) => tileRuby[i]), solutions: solutions.map((s) => s.map((i) => perm.indexOf(i))) },
      solution: kanaOn(ctx)
        ? { main: it.s.text, ruby: it.s.ruby, lang: 'ja', sub: patternLine(it.point, ctx) }
        : { main: sentenceRomaji(it.s), lang: 'latin', sub: patternLine(it.point, ctx) },
      hint: { text: ruleText(it.point, ctx) },
      speak: it.s.spoken,
    };
  },
};

const forms: Exercise<FormItem> = {
  id: 'forms',
  name: 'Choose the form',
  description: 'desu or ja arimasen? masu, masen, mashita or masen deshita?',
  icon: '形',
  items: () => formItems,
  question: (it, ctx): Question => {
    const s = parseSentence(it.ja);
    const ruby: RubyText = s.ruby.map(([b, r]) => [b.replace('＿＿', '（　　）'), r] as [string, string?]);
    const opts = shuffle(it.options.map((o, i) => ({ o, i })), ctx.rng);
    const full = parseSentence(it.ja.replace('＿＿', it.options[it.answer]));
    return {
      prompt: kanaOn(ctx)
        ? { ruby, lang: 'ja', size: 'medium', instruction: 'Choose the right form', sub: tr(it.t, ctx) }
        : { text: sentenceRomaji(s).replace(/＿＿/, '(   )'), lang: 'latin', size: 'medium', instruction: 'Choose the right form', sub: tr(it.t, ctx) },
      answer: { type: 'choice', options: opts.map(({ o }) => (kanaOn(ctx) ? { label: o, lang: 'ja' as const } : { label: formRomaji(o), lang: 'latin' as const })), correct: opts.findIndex(({ i }) => i === it.answer) },
      solution: kanaOn(ctx) ? { main: full.text, ruby: full.ruby, lang: 'ja', sub: tr(it.t, ctx) } : { main: sentenceRomaji(full), lang: 'latin', sub: tr(it.t, ctx) },
      speak: full.spoken,
      fastMs: 4000,
    };
  },
};

const translate: Exercise<ExampleItem> = {
  id: 'translate',
  name: 'Translate',
  description: 'Read a Japanese sentence (in romaji) and pick the right translation.',
  icon: '訳',
  items: () => exampleItems,
  question: (it, ctx): Question => {
    const same = exampleItems.filter((e) => e.id !== it.id && tr(e.ex, ctx) !== tr(it.ex, ctx));
    const near = shuffle(same.filter((e) => Math.abs((e.lesson ?? 0) - (it.lesson ?? 0)) <= 1), ctx.rng);
    const wrong = [...near, ...shuffle(same, ctx.rng)].filter((e, i, a) => a.findIndex((x) => tr(x.ex, ctx) === tr(e.ex, ctx)) === i).slice(0, 3);
    const opts = shuffle([it, ...wrong], ctx.rng);
    return {
      prompt: kanaOn(ctx) ? { ruby: it.s.ruby, lang: 'ja', size: 'medium', instruction: 'What does it mean?' } : { text: sentenceRomaji(it.s), lang: 'latin', size: 'medium', instruction: 'What does it mean?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: tr(o.ex, ctx), lang: 'latin' })), correct: opts.indexOf(it) },
      solution: { main: tr(it.ex, ctx), lang: 'latin', sub: `${kanaOn(ctx) ? it.s.text : sentenceRomaji(it.s)} · ${patternLine(it.point, ctx)}` },
      speak: it.s.spoken,
      fastMs: 5000,
    };
  },
};

export const grammar: StudyModule = {
  id: 'grammar',
  name: 'Grammar',
  nameJa: '文法',
  icon: '文',
  description: 'Minna no Nihongo lessons 1–10: a lexicon to look things up, plus particles, sentence building, forms and translation.',
  status: 'ready',
  exercises: [particles, order, forms, translate],
  groups: () =>
    [...new Set(POINTS.map((p) => p.lesson))].map((l) => ({
      id: `L${l}`, label: `Lesson ${l}`, sub: `${POINTS.filter((p) => p.lesson === l).length} points`, section: 'Lessons',
    })),
  presets: [
    { id: '1-5', label: 'Lessons 1–5', groups: ['L1', 'L2', 'L3', 'L4', 'L5'] },
    { id: '6-10', label: 'Lessons 6–10', groups: ['L6', 'L7', 'L8', 'L9', 'L10'] },
    { id: 'all', label: 'All', groups: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'] },
  ],
  defaultGroups: ['L1', 'L2', 'L3', 'L4', 'L5'],
  tools: [{ id: 'notes', name: 'Grammar lexicon', description: 'Look up every grammar point: rule, formation, examples, related entries – searchable.', icon: '帳', component: Lexicon }],
};

/** Example sentences for other modules (listening). */
export const grammarSentences = exampleItems;
