/**
 * Preparation meter – how ready you are for a course, from your saved answers.
 *
 *  card    0   not learned yet (or being relearned)
 *          ½   learned: graduated and answered right again on a later day
 *          1   mastered: next review is 3+ weeks away
 *  section average over every card its modules can have (unseen cards count 0).
 *          Self-rated exercises (flashcards, notes, drawing) are left out when a
 *          module also has checked ones; generated drills (numbers) never count.
 *  course  weighted average of its sections (weights from course.json). Sections
 *          without content count 0, so the meter never overstates.
 */
import type { CardState } from './srs';
import { cardId, type Exercise, type StudyContext, type StudyModule } from './types';
import { exerciseItems } from './session';
import type { CourseConfig } from '../courses/types';
import { courseModules, isUnverified, meterSections, moduleInfo } from '../courses';

export const MASTERED_DAYS = 21;

export function cardScore(c: CardState | undefined): number {
  if (!c || c.step !== -1) return 0;
  if (c.interval >= MASTERED_DAYS) return 1;
  return c.reps >= 2 ? 0.5 : 0;
}

/** The exercises that count for the meter. */
export function meterExercises(mod: StudyModule): { exercises: Exercise[]; selfRated: boolean } {
  const all = mod.exercises.filter((e) => !e.generative);
  const checked = all.filter((e) => !e.selfRated);
  return checked.length ? { exercises: checked, selfRated: false } : { exercises: all, selfRated: all.length > 0 };
}

export interface ModulesScore {
  /** 0…1 */
  score: number;
  /** Cards that count. */
  total: number;
  learned: number;
  mastered: number;
  selfRated: boolean;
}

export function scoreModules(mods: StudyModule[], ctx: StudyContext, cards: Record<string, CardState>): ModulesScore {
  let total = 0, sum = 0, learned = 0, mastered = 0, selfRated = false;
  for (const mod of mods) {
    const m = meterExercises(mod);
    selfRated ||= m.selfRated;
    for (const ex of m.exercises) {
      for (const item of exerciseItems(ex, ctx)) {
        const s = cardScore(cards[cardId(mod.id, ex.id, item.id)]);
        total++;
        sum += s;
        if (s >= 0.5) learned++;
        if (s === 1) mastered++;
      }
    }
  }
  return { score: total ? sum / total : 0, total, learned, mastered, selfRated };
}

export interface MeterPart extends ModulesScore {
  label: string;
  /** Share of the course meter, 0…1. */
  share: number;
  /** Content written without your material: whole section or part of it. */
  unverified: 'yes' | 'partly' | null;
}

export interface CourseMeter {
  /** 0…1 */
  value: number;
  parts: MeterPart[];
}

export function courseMeter(course: CourseConfig, ctx: StudyContext, cards: Record<string, CardState>): CourseMeter {
  const active = new Map(courseModules(course).map((m) => [m.id, m]));
  const sections = meterSections(course);
  const weightSum = sections.reduce((s, x) => s + x.weight, 0) || 1;
  const parts = sections.map((s): MeterPart => {
    const mods = s.modules.map((id) => active.get(id)).filter((m): m is StudyModule => !!m);
    const unverified = s.modules.some((id) => isUnverified(id))
      ? 'yes'
      : s.modules.some((id) => Array.isArray(moduleInfo(id).unverified))
        ? 'partly'
        : null;
    return { label: s.label, share: s.weight / weightSum, unverified, ...scoreModules(mods, ctx, cards) };
  });
  return { value: parts.reduce((v, p) => v + p.share * p.score, 0), parts };
}
