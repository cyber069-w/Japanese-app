/** Numbers, time & dates: random drills with the sound-change rules as hints. */
import type { Exercise, Question, StudyContext, StudyModule } from '../../core/types';
import { matchesReading, toRomaji } from '../../lib/romaji';
import { CATEGORIES, SECTIONS, answerFormatOf, normalizeAnswer, type Direction, type Instance, type NumberCategory } from './categories';
import { RULES } from './readings';
import { NumberRules } from './NumberRules';

function Clock({ h, m }: { h: number; m: number }) {
  const ha = ((h % 12) + m / 60) * 30;
  const ma = m * 6;
  return (
    <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true" style={{ margin: '2px 0 4px' }}>
      <circle cx="50" cy="50" r="46" fill="var(--surface-2)" stroke="var(--line-2)" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="50" y1="8" x2="50" y2={i % 3 ? 12 : 15} stroke="var(--ink-3)" strokeWidth={i % 3 ? 1.5 : 2.5} transform={`rotate(${i * 30} 50 50)`} />
      ))}
      <line x1="50" y1="50" x2="50" y2="27" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" transform={`rotate(${ha} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="15" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${ma} 50 50)`} />
      <circle cx="50" cy="50" r="3.5" fill="var(--seal)" />
    </svg>
  );
}

const romajiOf = (inst: Instance) => toRomaji(inst.kana);

function hintOf(inst: Instance) {
  const rules = inst.rules.map((r) => RULES[r]);
  if (!rules.length && !inst.parts) return undefined;
  return { text: inst.parts ? `Split it up: ${inst.parts}` : undefined, rules };
}

function solutionNotes(inst: Instance) {
  const notes: string[] = [];
  if (inst.alts.length) notes.push(`Also correct: ${inst.alts.slice(0, 3).join(', ')}`);
  for (const r of inst.rules) notes.push(RULES[r]);
  return [...new Set(notes)];
}

function makeExercise(dir: Direction): Exercise<NumberCategory> {
  const meta = {
    read: { name: 'Say the number', description: 'See a number, time or date – type how it’s read.', icon: '三' },
    write: { name: 'Write the number', description: 'Read the kana – type the number in digits.', icon: '3' },
    listen: { name: 'Listen & write', description: 'Hear the number – type it in digits.', icon: '耳' },
  }[dir];
  return {
    id: dir,
    ...meta,
    generative: true,
    items: () => CATEGORIES.filter((c) => c.directions.includes(dir)),
    question: (cat, ctx: StudyContext): Question => {
      const inst = cat.gen(ctx.rng);
      const fmt = answerFormatOf(cat);
      if (dir === 'read') {
        return {
          prompt: {
            text: inst.display,
            lang: inst.displayLang,
            size: inst.display.length <= 4 ? 'hero' : 'large',
            instruction: `${cat.label} – type the reading`,
            sub: inst.sub,
            visual: inst.clock ? <Clock {...inst.clock} /> : undefined,
          },
          answer: {
            type: 'typing',
            input: 'kana',
            check: (v) => matchesReading(v, inst.kana, ctx.settings.leniency, inst.alts),
          },
          solution: { main: inst.kana, lang: 'ja', sub: romajiOf(inst), notes: solutionNotes(inst) },
          hint: hintOf(inst),
          speak: inst.kana,
          fastMs: 2500 + inst.kana.length * 250,
        };
      }
      const check = (v: string) => normalizeAnswer(v, fmt) === normalizeAnswer(inst.answer, fmt);
      return {
        prompt:
          dir === 'write'
            ? { text: inst.kana, lang: 'ja', size: inst.kana.length > 8 ? 'medium' : 'large', instruction: `${cat.label} – type it in digits`, sub: cat.id.startsWith('c-') ? inst.sub : undefined }
            : { audioOnly: true, lang: 'ja', size: 'large', instruction: `${cat.label} – listen and type it in digits`, sub: cat.id.startsWith('c-') ? inst.sub : undefined },
        answer: {
          type: 'typing',
          input: fmt === 'number' ? 'number' : 'text',
          check,
          placeholder: inst.answerFormat ? `type ${inst.answerFormat}` : 'type the number…',
        },
        solution: { main: inst.display, lang: inst.displayLang, sub: `${inst.kana} · ${romajiOf(inst)}`, notes: inst.rules.map((r) => RULES[r]) },
        hint: dir === 'listen' ? { text: 'Press Space to hear it again. Slower voice: Settings › Sound.' } : hintOf(inst),
        speak: inst.kana,
        speakWhen: dir === 'listen' ? 'prompt' : 'answer',
        fastMs: 4000,
      };
    },
  };
}

export const numbers: StudyModule = {
  id: 'numbers',
  name: 'Numbers & time',
  nameJa: '数字・時間',
  icon: '数',
  description: 'Numbers 1–10,000, times, dates, prices and counters – with all the sound-change rules.',
  status: 'ready',
  exercises: [makeExercise('read'), makeExercise('write'), makeExercise('listen')],
  groups: () =>
    Object.entries(SECTIONS).flatMap(([section, ids]) =>
      ids.map((id) => {
        const c = CATEGORIES.find((x) => x.id === id)!;
        return { id, label: c.label, sub: c.sub, section };
      }),
    ),
  presets: [
    { id: 'n', label: '1–10,000', groups: ['n1-10', 'n11-99', 'n100', 'n1000', 'n10000', 'special'] },
    { id: 't', label: 'Time & dates', groups: [...SECTIONS['Time'], ...SECTIONS['Dates']] },
    { id: 'c', label: 'Counters', groups: SECTIONS['Counters'] },
    { id: 'all', label: 'Everything', groups: Object.values(SECTIONS).flat() },
  ],
  defaultGroups: ['n1-10', 'n11-99', 'n100', 'n1000', 'n10000', 'special'],
  tools: [
    {
      id: 'rules',
      name: 'Rules & tables',
      description: 'All readings at a glance – tap any cell to hear it.',
      icon: '表',
      component: NumberRules,
    },
  ],
};
