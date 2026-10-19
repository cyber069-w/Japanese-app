/**
 * The module system.
 *
 * A StudyModule is a self-contained learning area (Hiragana, Vocab, …).
 * It declares:
 *   - items:     the things you learn (a kana, a word, a grammar point, a number category)
 *   - exercises: ways to quiz those items (kana → romaji, multiple choice, drawing …)
 *   - groups:    how items can be filtered (kana rows, Minna no Nihongo lessons …)
 *   - tools:     optional extra screens (kana chart, CSV import, self-intro builder …)
 *
 * The Home, Study, Review and Stats screens only talk to modules through these
 * types, so adding a module = adding a folder and one line in modules/index.ts.
 */
import type { CfaLesson } from '../modules/cfa/lessons';
import type { ComponentType, ReactNode } from 'react';
import type { Leniency } from '../lib/romaji';

export type MeaningLang = 'de' | 'en';
export interface Meaning { de: string; en: string }

/** Everything a module may need to build its items and questions. */
export interface StudyContext {
  settings: Settings;
  content: Content;
  /** Random number generator in [0, 1) – injectable for tests. */
  rng: () => number;
}

/** Learning content that is not bundled with the app (private pack, your own imports). */
export interface Content {
  vocab: VocabEntry[];
  /** Mnemonic pictures by script and kana id, e.g. hints.hiragana.mu → image URL. */
  hints: Record<string, Record<string, string>>;
  /** Memory keyword + text by script and kana id, from the course pack (hiragana) – see also the module's own. */
  mnemonics?: Record<string, Record<string, { kw: string; text: string }>>;
  /** Kanji the user wants to study (overrides the default list when non-empty). */
  kanjiList: string[];
  /** Your self-introduction (Speaking module); null until you fill it in. */
  profile: Profile | null;
  /** CFA lesson packs you imported (CFA module). */
  cfaLessons: CfaLesson[];
}

/**
 * The self-introduction form. Japanese fields are what you'll say (katakana / kanji);
 * the romaji fields are what you typed, used to suggest the katakana.
 */
export interface Profile {
  name: string;
  nameJa: string;
  /** Country id from the list, or 'other'. */
  country: string;
  countryOther: string;
  countryOtherJa: string;
  university: string;
  universityJa: string;
  /** '' | '1' … '4' | 'master' */
  year: string;
  /** Major id from the list, or 'other'. */
  major: string;
  majorOtherJa: string;
  majorOtherDe: string;
  /** Empty = leave out. */
  age: number | null;
  /** "MM-DD" or '' */
  birthday: string;
  hobbies: string[];
  /** Japanese fields edited by hand (no longer follow the romaji). */
  edited: string[];
}

export interface VocabEntry {
  id: string;
  kana: string;
  kanji?: string;
  de: string;
  en: string;
  lesson: number;
  /** Where the entry came from, e.g. "mnn" (course pack) or the name of an imported list. */
  source: string;
  tags?: string[];
  /** Position in its source list; the word list keeps this order (older imports may not have it). */
  pos?: number;
}

export interface BaseItem {
  /** Unique within the module; must not contain ':' */
  id: string;
  /** Short label for stats, heatmaps and lists (e.g. "か", "学生", "300"). */
  label: string;
  /** Secondary label (romaji, meaning …). */
  sub?: string;
  /** Filter groups; the item is included when ALL of its groups are selected. */
  groups: string[];
  /** Minna no Nihongo lesson, if the item belongs to one. */
  lesson?: number;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  /** Look: frosted glass over leather, flat leather, or the Apple look. */
  surface: 'glass' | 'flat' | 'apple';
  leniency: Leniency;
  /** Play pronunciation (after answering, and on demand). */
  sound: boolean;
  voiceRate: number;
  meaningLang: MeaningLang;
  furigana: boolean;
  /** Show kana / kanji outside script practice. Off = romaji + German everywhere. */
  kanaLayer: boolean;
  /** Link to each subject's Claude Project for "Ask tutor" (empty = new chat). */
  tutorUrls: Record<string, string>;
  sessionLength: number;
  dailyGoal: number;
  /** What the daily goal counts: answers in the app, or minutes (focus log or app time, whichever is more). */
  goalUnit: 'answers' | 'minutes';
  examDate: string; // YYYY-MM-DD or '' – the first exam date (Japanese), kept for older backups
  /** Exam date per subject id, YYYY-MM-DD. */
  examDates: Record<string, string>;
  autoAdvance: boolean;
  /** Evening shutdown: time per weekday ("0" = Sunday … "6" = Saturday), HH:MM. */
  shutdownTimes: Record<string, string>;
  /** iA Writer folder for shutdown notes, and one note per day (else one running note). */
  iaFolder: string;
  iaOnePerDay: boolean;
  /** Selected filter groups per module (persisted so your row choice is remembered). */
  selections: Record<string, string[]>;
  /** The course shown on this device (not synced). */
  course: string;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

/** A piece of Japanese text with optional furigana: [["学生","がくせい"],["です"]] */
export type RubyText = Array<[string, string?]>;

export interface Prompt {
  /** Main text (kana, kanji, number, German word …). */
  text?: string;
  ruby?: RubyText;
  lang: 'ja' | 'latin';
  /** hero = a single giant character, large = a word, medium = a sentence */
  size: 'hero' | 'large' | 'medium';
  /** Instruction above the prompt, e.g. "Type the reading". */
  instruction: string;
  /** Extra line under the prompt (meaning, context …). */
  sub?: string;
  /** Hide the text and only play audio (listening). */
  audioOnly?: boolean;
  /** Custom visual (e.g. a clock face). */
  visual?: ReactNode;
}

export interface ChoiceOption {
  label: string;
  ruby?: RubyText;
  lang: 'ja' | 'latin';
  /** Small second line (e.g. reading under a kanji). */
  sub?: string;
}

export type Answer =
  | {
      type: 'typing';
      /** romaji/kana answers get live romaji→kana conversion where useful */
      input: 'romaji' | 'kana' | 'katakana' | 'number' | 'text';
      check: (value: string) => boolean;
      placeholder?: string;
    }
  | { type: 'choice'; options: ChoiceOption[]; correct: number }
  | { type: 'draw'; char: string }
  | { type: 'order'; tiles: string[]; tileRuby?: RubyText[]; /** accepted orders, each a list of tile indices */ solutions: number[][] }
  | { type: 'reveal'; back: ReactNode; record?: string };

export interface Hint {
  /** Big keyword, e.g. "MOO" */
  keyword?: string;
  text?: string;
  /** Mnemonic picture */
  image?: string;
  /** Short warnings, e.g. "Exception: shi, not si" */
  flags?: string[];
  /** Rule line, e.g. "か + ゛ = が" */
  rules?: string[];
  /** Japanese text with furigana, e.g. the transcript of a listening question. */
  ruby?: RubyText;
  /** One picture per character, for word hints (ね + こ). */
  strip?: Array<{ kana: string; keyword?: string; image?: string }>;
}

export interface Question {
  prompt: Prompt;
  answer: Answer;
  /** Correct answer as shown after answering. */
  solution: { main: string; ruby?: RubyText; lang: 'ja' | 'latin'; sub?: string; notes?: string[] };
  /** Shown on request before answering. */
  hint?: Hint;
  /** Shown with the solution (defaults to `hint`) – may include pictures that would give the answer away. null = none. */
  revealHint?: Hint | null;
  /** Japanese text for text-to-speech. */
  speak?: string;
  /** 'prompt' = the audio is part of the question (played right away, e.g. listening);
   *  'answer' (default) = played after answering, so it doesn't give the answer away. */
  speakWhen?: 'prompt' | 'answer';
  /** Answer time (ms) under which a correct answer counts as "easy". */
  fastMs?: number;
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export interface Exercise<I extends BaseItem = BaseItem> {
  id: string;
  name: string;
  description: string;
  /** Glyph shown on the exercise card. */
  icon: string;
  items: (ctx: StudyContext) => I[];
  question: (item: I, ctx: StudyContext & { pool: I[] }) => Question;
  /** If false, answers are not stored in the SRS (e.g. pure browsing). Default true. */
  srs?: boolean;
  /** Items generated randomly per question (numbers) — repeated asks are fine. */
  generative?: boolean;
  /** Shown on the exercise card when it has no items for a reason other than the filter (e.g. "Fill in your self-introduction first"). */
  emptyMessage?: (ctx: StudyContext) => string | null;
  /** You judge your own answer (flashcards, notes, drawing) – left out of the preparation meter when checked exercises exist. */
  selfRated?: boolean;
}

export interface FilterGroup { id: string; label: string; sub?: string; section?: string }
export interface Preset { id: string; label: string; groups: string[] }

export interface ModuleTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: ComponentType<{ ctx: StudyContext }>;
}

export interface ChartCell { id: string; label: string; sub?: string }
export interface ChartSection { title: string; columns: number; cells: Array<ChartCell | null> }

export interface StudyModule {
  id: string;
  name: string;
  /** Japanese name, shown as a subtitle. */
  nameJa: string;
  /** Large glyph used as the module icon. */
  icon: string;
  description: string;
  status: 'ready' | 'soon';
  exercises: Exercise<any>[];
  groups?: (ctx: StudyContext) => FilterGroup[];
  presets?: Preset[];
  defaultGroups?: string[];
  tools?: ModuleTool[];
  /** Heatmap layout for the stats screen (item ids map to the module's items). */
  chart?: (ctx: StudyContext) => ChartSection[];
  /** Shown instead of exercises when the module has no content yet. */
  emptyState?: (ctx: StudyContext) => ReactNode | null;
  /** Optional panel at the top of the module page (e.g. voice settings for Listening). */
  banner?: ComponentType<{ ctx: StudyContext }>;
}

export const cardId = (moduleId: string, exerciseId: string, itemId: string) => `${moduleId}:${exerciseId}:${itemId}`;
export function parseCardId(id: string) {
  const [moduleId, exerciseId, ...rest] = id.split(':');
  return { moduleId, exerciseId, itemId: rest.join(':') };
}
