/** Vocabulary: your Minna no Nihongo lessons plus any lists you import. */
import type { Exercise, FilterGroup, Question, StudyContext, StudyModule } from '../../core/types';
import { shuffle } from '../../core/session';
import { phraseRomaji } from '../../lib/romaji';
import { navigate } from '../../lib/router';
import { lessonLabel, vocabAccepts, vocabItems, type VocabItem } from './items';
import { Syllables } from '../../components/Syllables';
import { VocabImport } from './VocabImport';
import { WordList } from './WordList';

const meaningOf = (it: VocabItem, ctx: StudyContext) => it[ctx.settings.meaningLang] || it.de || it.en;

/** Wrong options: prefer the same lesson, never the same meaning. */
function distractors(it: VocabItem, pool: VocabItem[], ctx: StudyContext, n = 3): VocabItem[] {
  const out: VocabItem[] = [];
  const m = meaningOf(it, ctx);
  const ok = (x: VocabItem) => x.id !== it.id && meaningOf(x, ctx) !== m && x.kana !== it.kana && !out.some((o) => meaningOf(o, ctx) === meaningOf(x, ctx));
  const sameLesson = pool.filter((x) => x.lesson === it.lesson);
  for (const src of [sameLesson, pool, vocabItems(ctx)]) {
    for (const x of shuffle(src, ctx.rng)) {
      if (out.length >= n) break;
      if (ok(x)) out.push(x);
    }
  }
  return out;
}

const solution = (it: VocabItem, ctx: StudyContext) => ({
  main: it.kanji ?? it.kana,
  ruby: it.ruby,
  lang: 'ja' as const,
  sub: `${meaningOf(it, ctx)} · ${phraseRomaji(it.kana)}`,
  notes: it.alt ? [`Also: ${it.alt}`] : undefined,
});

const jaToMeaning: Exercise<VocabItem> = {
  id: 'meaning',
  name: 'Japanese → meaning',
  description: 'See the word, pick what it means.',
  icon: '意',
  items: vocabItems,
  question: (it, ctx): Question => {
    const opts = shuffle([it, ...distractors(it, ctx.pool as VocabItem[], ctx)], ctx.rng);
    return {
      prompt: { ruby: it.ruby, lang: 'ja', size: [...it.label].length > 7 ? 'medium' : 'large', instruction: 'What does it mean?', sub: it.alt ? `(${it.alt})` : undefined },
      answer: { type: 'choice', options: opts.map((o) => ({ label: meaningOf(o, ctx), lang: 'latin' })), correct: opts.indexOf(it) },
      solution: solution(it, ctx),
      speak: it.kana,
      fastMs: 3500,
    };
  },
};

const meaningToKana: Exercise<VocabItem> = {
  id: 'type',
  name: 'Meaning → type it',
  description: 'See the meaning, type the Japanese in romaji – it turns into kana as you type.',
  icon: 'あ',
  // patterns with ～ aren't words you can type
  items: (ctx) => vocabItems(ctx).filter((it) => !/[～〜]/.test(it.entry.kana)),
  question: (it, ctx): Question => {
    const first = [...it.kana.replace(/[\s[\]]/g, '')];
    return {
      prompt: { text: meaningOf(it, ctx), lang: 'latin', size: 'medium', instruction: `Type it in Japanese · ${lessonLabel(it.lesson ?? 0)}` },
      answer: { type: 'typing', input: /^[゠-ヿ\s]+$/.test(it.kana) ? 'katakana' : 'kana', check: (v) => vocabAccepts(v, it) },
      solution: solution(it, ctx),
      hint: { text: `Starts with ${first[0]}${first.length > 2 ? first[1] : ''}… (${first.length} kana)` },
      speak: it.kana,
      fastMs: 4000 + first.length * 400,
    };
  },
};

const meaningToJa: Exercise<VocabItem> = {
  id: 'choose',
  name: 'Meaning → Japanese',
  description: 'See the meaning, pick the right word.',
  icon: '選',
  items: vocabItems,
  question: (it, ctx): Question => {
    const opts = shuffle([it, ...distractors(it, ctx.pool as VocabItem[], ctx)], ctx.rng);
    return {
      prompt: { text: meaningOf(it, ctx), lang: 'latin', size: 'medium', instruction: 'Which word is it?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: o.label, ruby: o.ruby, lang: 'ja' })), correct: opts.indexOf(it) },
      solution: solution(it, ctx),
      speak: it.kana,
      fastMs: 3500,
    };
  },
};

const flashcards: Exercise<VocabItem> = {
  id: 'cards',
  selfRated: true,
  name: 'Flashcards',
  description: 'Say the meaning to yourself, flip, and rate how well you knew it.',
  icon: '札',
  items: vocabItems,
  question: (it, ctx): Question => ({
    prompt: { ruby: it.ruby, lang: 'ja', size: [...it.label].length > 7 ? 'medium' : 'large', instruction: 'Do you know it?' },
    answer: {
      type: 'reveal',
      back: (
        <div>
          <div className="solution-main">{meaningOf(it, ctx)}</div>
          <div className="solution-sub" lang="ja">
            <Syllables text={it.kana} romaji />
            {it.alt ? ` (${it.alt})` : ''} · {phraseRomaji(it.kana)}
          </div>
        </div>
      ),
    },
    solution: solution(it, ctx),
    speak: it.kana,
    speakWhen: 'prompt',
  }),
};

export const vocab: StudyModule = {
  id: 'vocab',
  name: 'Vocabulary',
  nameJa: '語彙',
  icon: '語',
  description: 'Minna no Nihongo vocab by lesson, plus your own word lists – both directions.',
  status: 'ready',
  exercises: [jaToMeaning, meaningToKana, meaningToJa, flashcards],
  groups: (ctx): FilterGroup[] => {
    const items = vocabItems(ctx);
    const lessons = [...new Set(items.map((i) => i.lesson ?? 0))].sort((a, b) => a - b);
    const groups: FilterGroup[] = lessons.map((l) => ({
      id: `L${l}`,
      label: l === 0 ? 'Intro' : `第${l}課`,
      sub: `${items.filter((i) => i.lesson === l).length}`,
      section: 'Lessons',
    }));
    if (items.some((i) => i.groups.includes('extra'))) groups.push({ id: 'extra', label: 'Extra words', sub: 'useful words pages', section: 'Optional' });
    if (items.some((i) => i.groups.includes('place'))) groups.push({ id: 'place', label: 'Place names', section: 'Optional' });
    return groups;
  },
  presets: [],
  defaultGroups: Array.from({ length: 26 }, (_, i) => `L${i}`),
  emptyState: (ctx) =>
    ctx.content.vocab.length ? null : (
      <div className="empty">
        <span className="serif" lang="ja">語</span>
        <p style={{ marginBottom: 14 }}>No vocabulary yet. Unlock your course pack or import a word list (CSV).</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/settings')}>Unlock course pack</button>
          <button className="btn" onClick={() => navigate('/m/vocab/t/import')}>Import a list</button>
        </div>
      </div>
    ),
  tools: [
    { id: 'list', name: 'Word list', description: 'Browse and listen to every word by lesson.', icon: '表', component: WordList },
    { id: 'import', name: 'Import words', description: 'Add your own list from CSV or pasted text.', icon: '入', component: VocabImport },
  ],
};
