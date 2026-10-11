/**
 * Speaking / oral exam prep: build your self-introduction, then answer typical
 * A1 exam questions out loud, compare with a model answer and record yourself.
 */
import type { BaseItem, Exercise, Question, StudyContext, StudyModule } from '../../core/types';
import { parseSentence, sentenceRomaji } from '../grammar/sentence';
import { introLines, type Line } from './intro';
import { ModelBack, SpokenLine } from './ModelAnswer';
import { QUESTIONS, TOPICS, type OralQuestion, type Topic } from './questions';
import { QuestionList } from './QuestionList';
import { SelfIntroTool } from './SelfIntroTool';
import { SpeakingBanner } from './SpeakingBanner';

interface QItem extends BaseItem { q: OralQuestion }
interface LineItem extends BaseItem { line: Line }

const Q_ITEMS: QItem[] = QUESTIONS.map((q) => {
  const s = parseSentence(q.q);
  return { id: q.id, label: s.text, sub: q.en, groups: [q.topic], lesson: q.lesson, q };
});

const rec = (id: string) => `rec:speaking:${id}`;

const questions: Exercise<QItem> = {
  id: 'questions',
  name: 'Exam questions',
  description: 'Read and hear a question, answer out loud, then compare with the model answer.',
  icon: '問',
  items: () => Q_ITEMS,
  question: (it, ctx): Question => {
    const s = parseSentence(it.q.q);
    return {
      prompt: { ruby: s.ruby, lang: 'ja', size: 'medium', instruction: 'Answer out loud – then check' },
      answer: { type: 'reveal', back: <ModelBack q={it.q} ctx={ctx} />, record: rec(it.id) },
      solution: { main: s.text, ruby: s.ruby, lang: 'ja', sub: it.q[ctx.settings.meaningLang] },
      hint: { text: it.q[ctx.settings.meaningLang] },
      speak: s.spoken,
      speakWhen: 'prompt',
    };
  },
};

const listen: Exercise<QItem> = {
  id: 'listen',
  name: 'Listen & answer',
  description: 'Like the real oral exam: you only hear the question.',
  icon: '耳',
  items: () => Q_ITEMS,
  question: (it, ctx): Question => {
    const s = parseSentence(it.q.q);
    return {
      prompt: { audioOnly: true, lang: 'ja', size: 'large', instruction: 'Listen, then answer out loud' },
      answer: { type: 'reveal', back: <ModelBack q={it.q} ctx={ctx} showQuestion />, record: rec(it.id) },
      solution: { main: s.text, ruby: s.ruby, lang: 'ja', sub: it.q[ctx.settings.meaningLang] },
      hint: { ruby: s.ruby, text: it.q[ctx.settings.meaningLang] },
      speak: s.spoken,
      speakWhen: 'prompt',
    };
  },
};

let lineCache: { profile: unknown; items: LineItem[] } | null = null;
function lineItems(ctx: StudyContext): LineItem[] {
  const p = ctx.content.profile;
  if (lineCache?.profile === p) return lineCache.items;
  const items = p ? introLines(p).map((line) => ({ id: line.id, label: parseSentence(line.ja).text, sub: line.en, groups: [], line })) : [];
  lineCache = { profile: p, items: items.length > 2 ? items : [] };
  return lineCache.items;
}

const intro: Exercise<LineItem> = {
  id: 'intro',
  name: 'Your introduction',
  description: 'Learn your じこしょうかい by heart: see the translation, say the Japanese.',
  icon: '自',
  items: lineItems,
  emptyMessage: () => 'write your self-introduction first',
  question: (it, ctx): Question => {
    const s = parseSentence(it.line.ja);
    return {
      prompt: { text: it.line[ctx.settings.meaningLang], lang: 'latin', size: 'medium', instruction: 'Say it in Japanese' },
      answer: {
        type: 'reveal',
        back: (
          <div className="model">
            <SpokenLine ja={it.line.ja} ctx={ctx} size="lg" romaji />
          </div>
        ),
        record: rec(`intro-${it.id}`),
      },
      solution: { main: s.text, ruby: s.ruby, lang: 'ja', sub: sentenceRomaji(s) },
      hint: { text: `Starts with “${s.text.slice(0, 3)}…”` },
      speak: s.spoken,
    };
  },
};

export const speaking: StudyModule = {
  id: 'speaking',
  name: 'Speaking',
  nameJa: '会話',
  icon: '話',
  description: 'Your self-introduction and the typical oral exam questions – with model answers and voice recording.',
  status: 'ready',
  exercises: [questions, listen, intro],
  groups: () =>
    (Object.keys(TOPICS) as Topic[]).map((t) => ({
      id: t, label: TOPICS[t].label, sub: `${TOPICS[t].sub} · ${QUESTIONS.filter((q) => q.topic === t).length}`, section: 'Topics',
    })),
  banner: SpeakingBanner,
  tools: [
    { id: 'intro', name: 'Self-introduction', description: 'Build your じこしょうかい with furigana, translation and audio.', icon: '自', component: SelfIntroTool },
    { id: 'questions', name: 'Question list', description: 'Every question with model answers – read, listen and prepare.', icon: '覧', component: QuestionList },
  ],
};
