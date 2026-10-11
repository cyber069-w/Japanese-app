/** Grammar: Minna no Nihongo lessons 1–10 – notes, particles, sentence building, forms, translation. */
import type { BaseItem, Exercise, Meaning, Question, RubyText, StudyContext, StudyModule } from '../../core/types';
import { shuffle } from '../../core/session';
import { Ruby } from '../../components/Ruby';
import { CONFUSED, PARTICLES, chunkRuby, chunkText, parseSentence, validOrders, type Sentence } from './sentence';
import { GrammarNotes } from './GrammarNotes';
import formsData from './data/forms.json';
import { POINTS, type GrammarPoint, type RawExample } from './points';

interface PointItem extends BaseItem { point: GrammarPoint }
interface ExampleItem extends BaseItem { point: GrammarPoint; ex: RawExample; s: Sentence }
interface BlankItem extends ExampleItem { blank: { chunk: number; seg: number; particle: string } }
interface FormItem extends BaseItem { ja: string; options: string[]; answer: number; t: Meaning }

const lessonGroup = (l: number) => [`L${l}`];

const pointItems: PointItem[] = POINTS.map((p) => ({ id: p.id, label: p.pattern, sub: p.title.en, groups: lessonGroup(p.lesson), lesson: p.lesson, point: p }));

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

const notes: Exercise<PointItem> = {
  id: 'notes',
  name: 'Grammar cards',
  description: 'See the pattern, recall what it means and how to use it – then check.',
  icon: '文',
  items: () => pointItems,
  question: (it, ctx): Question => ({
    prompt: { text: it.point.pattern, lang: 'ja', size: 'medium', instruction: `Lesson ${it.point.lesson} · what does this pattern mean?` },
    answer: {
      type: 'reveal',
      back: (
        <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div className="solution-main" style={{ fontSize: '1.3rem' }}>{tr(it.point.title, ctx)}</div>
          <p className="muted">{tr(it.point.explain, ctx)}</p>
          {it.point.examples.map((ex) => (
            <div key={ex.ja}>
              <Ruby text={parseSentence(ex.ja).ruby} className="serif grammar-example" />
              <div className="faint small">{tr(ex, ctx)}</div>
            </div>
          ))}
        </div>
      ),
    },
    solution: { main: it.point.pattern, lang: 'ja', sub: tr(it.point.title, ctx) },
    speak: parseSentence(it.point.examples[0].ja).spoken,
  }),
};

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
      prompt: { ruby: withBlank(it), lang: 'ja', size: 'medium', instruction: 'Which particle fits?', sub: tr(it.ex, ctx) },
      answer: { type: 'choice', options: opts.map((o) => ({ label: o, lang: 'ja' })), correct: opts.indexOf(correct) },
      solution: { main: it.s.text, ruby: it.s.ruby, lang: 'ja', sub: `${it.point.pattern} – ${tr(it.point.title, ctx)}` },
      hint: { text: tr(it.point.explain, ctx) },
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
    const tiles = chunks.map((c) => strip(chunkText(c)));
    const tileRuby = chunks.map((c) => chunkRuby(c).map(([b, r]) => [strip(b), r] as [string, string?]).filter(([b]) => b !== ''));
    const solutions = validOrders(chunks);
    // shuffle the tiles until they are not already in a correct order
    let perm = chunks.map((_, i) => i);
    for (let t = 0; t < 10; t++) {
      perm = shuffle(perm, ctx.rng);
      if (!solutions.some((s) => s.join() === perm.join())) break;
    }
    return {
      prompt: { text: tr(it.ex, ctx), lang: 'latin', size: 'medium', instruction: 'Build the sentence in Japanese' },
      answer: { type: 'order', tiles: perm.map((i) => tiles[i]), tileRuby: perm.map((i) => tileRuby[i]), solutions: solutions.map((s) => s.map((i) => perm.indexOf(i))) },
      solution: { main: it.s.text, ruby: it.s.ruby, lang: 'ja', sub: `${it.point.pattern} – ${tr(it.point.title, ctx)}` },
      hint: { text: tr(it.point.explain, ctx) },
      speak: it.s.spoken,
    };
  },
};

const forms: Exercise<FormItem> = {
  id: 'forms',
  name: 'Choose the form',
  description: 'です or じゃありません? ます, ません, ました or ませんでした?',
  icon: '形',
  items: () => formItems,
  question: (it, ctx): Question => {
    const s = parseSentence(it.ja);
    const ruby: RubyText = s.ruby.map(([b, r]) => [b.replace('＿＿', '（　　）'), r] as [string, string?]);
    const opts = shuffle(it.options.map((o, i) => ({ o, i })), ctx.rng);
    const full = parseSentence(it.ja.replace('＿＿', it.options[it.answer]));
    return {
      prompt: { ruby, lang: 'ja', size: 'medium', instruction: 'Choose the right form', sub: tr(it.t, ctx) },
      answer: { type: 'choice', options: opts.map(({ o }) => ({ label: o, lang: 'ja' })), correct: opts.findIndex(({ i }) => i === it.answer) },
      solution: { main: full.text, ruby: full.ruby, lang: 'ja', sub: tr(it.t, ctx) },
      speak: full.spoken,
      fastMs: 4000,
    };
  },
};

const translate: Exercise<ExampleItem> = {
  id: 'translate',
  name: 'Translate',
  description: 'Read a Japanese sentence and pick the right translation.',
  icon: '訳',
  items: () => exampleItems,
  question: (it, ctx): Question => {
    const same = exampleItems.filter((e) => e.id !== it.id && tr(e.ex, ctx) !== tr(it.ex, ctx));
    const near = shuffle(same.filter((e) => Math.abs((e.lesson ?? 0) - (it.lesson ?? 0)) <= 1), ctx.rng);
    const wrong = [...near, ...shuffle(same, ctx.rng)].filter((e, i, a) => a.findIndex((x) => tr(x.ex, ctx) === tr(e.ex, ctx)) === i).slice(0, 3);
    const opts = shuffle([it, ...wrong], ctx.rng);
    return {
      prompt: { ruby: it.s.ruby, lang: 'ja', size: 'medium', instruction: 'What does it mean?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: tr(o.ex, ctx), lang: 'latin' })), correct: opts.indexOf(it) },
      solution: { main: tr(it.ex, ctx), lang: 'latin', sub: `${it.point.pattern} – ${tr(it.point.title, ctx)}` },
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
  description: 'Minna no Nihongo lessons 1–10: notes, particles, sentence building, forms and translation.',
  status: 'ready',
  exercises: [notes, particles, order, forms, translate],
  groups: () =>
    [...new Set(POINTS.map((p) => p.lesson))].map((l) => ({
      id: `L${l}`, label: `第${l}課`, sub: `${POINTS.filter((p) => p.lesson === l).length} points`, section: 'Lessons',
    })),
  presets: [
    { id: '1-5', label: 'Lessons 1–5', groups: ['L1', 'L2', 'L3', 'L4', 'L5'] },
    { id: '6-10', label: 'Lessons 6–10', groups: ['L6', 'L7', 'L8', 'L9', 'L10'] },
    { id: 'all', label: 'All', groups: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'] },
  ],
  defaultGroups: ['L1', 'L2', 'L3', 'L4', 'L5'],
  tools: [{ id: 'notes', name: 'Grammar notes', description: 'Read every grammar point with examples and audio.', icon: '帳', component: GrammarNotes }],
};

/** Example sentences for other modules (listening). */
export const grammarSentences = exampleItems;
