/** Maps the single-character glyphs used in module / exercise data (and course ids) to the line-icon set. */
import type { CourseConfig } from '../courses/types';
import type { StudyModule } from '../core/types';
import { Icon } from './Icon';

const GLYPH_ICONS: Record<string, string> = {
  あ: 'hiragana', ア: 'katakana', a: 'letter-a', ねこ: 'vocabulary', パン: 'vocabulary', シツ: 'diff',
  意: 'bulb', 選: 'list', 札: 'cards', 表: 'table', 入: 'import', 耳: 'ear', 音: 'speaker', 文: 'text',
  書: 'writing', 聴: 'headphones', 三: 'numbers', 3: 'numbers', 数: 'numbers', は: 'puzzle', 並: 'sort',
  形: 'shapes', 訳: 'language', 帳: 'notebook', 筆: 'pen', 読: 'book', 字: 'kanji', 覧: 'eye', 問: 'help',
  自: 'user', 出: 'upload', 話: 'chat', 試: 'exam', '?': 'help', ƒ: 'math', '✎': 'pen', 語: 'vocabulary',
};

const MODULE_ICONS: Record<string, string> = {
  hiragana: 'hiragana', katakana: 'katakana', vocab: 'vocabulary', kanji: 'kanji', grammar: 'puzzle',
  numbers: 'numbers', listening: 'headphones', speaking: 'chat',
};

const COURSE_ICONS: Record<string, string> = { japanese: 'language', cfa: 'chart-line', bwl: 'bank', recht: 'scale' };

/** Icon for an exercise or tool glyph; falls back to the glyph itself if it has no icon. */
export function GlyphIcon({ glyph, size = '1em' }: { glyph: string; size?: number | string }) {
  const name = GLYPH_ICONS[glyph];
  return name ? <Icon name={name} size={size} /> : <>{glyph}</>;
}

export function ModuleGlyph({ mod, size = '1em' }: { mod: Pick<StudyModule, 'id' | 'icon'>; size?: number | string }) {
  const name = MODULE_ICONS[mod.id];
  return name ? <Icon name={name} size={size} /> : <GlyphIcon glyph={mod.icon} size={size} />;
}

export function CourseGlyph({ course, size = '1em' }: { course: Pick<CourseConfig, 'id' | 'glyph'>; size?: number | string }) {
  const name = COURSE_ICONS[course.id];
  return name ? <Icon name={name} size={size} /> : <>{course.glyph}</>;
}
