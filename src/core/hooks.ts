import { useMemo } from 'react';
import { useApp } from './store';
import type { StudyContext, StudyModule } from './types';
import { countDue, exerciseItems, filterByGroups } from './session';
import { itemStats } from './stats';
import { courseMeter, type CourseMeter } from './meter';
import { ACTIVE_MODULES, COURSES, courseOfModule, getCourse } from '../courses';
import type { CourseConfig } from '../courses/types';

/** The study context (settings + content) for building items and questions. */
export function useCtx(): StudyContext {
  const settings = useApp((s) => s.settings);
  const content = useApp((s) => s.content);
  return useMemo(() => ({ settings, content, rng: Math.random }), [settings, content]);
}

/** Due count per module id, per course and in total, recomputed when cards change. */
export function useDueCounts() {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  return useMemo(() => {
    const now = Date.now();
    const per: Record<string, number> = {};
    const perCourse: Record<string, number> = Object.fromEntries(COURSES.map((c) => [c.id, 0]));
    let total = 0;
    for (const m of ACTIVE_MODULES) {
      const n = countDue(ACTIVE_MODULES, ctx, cards, now, m.id);
      per[m.id] = n;
      perCourse[courseOfModule(m.id).id] += n;
      total += n;
    }
    return { per, perCourse, total };
  }, [ctx, cards]);
}

/** The course shown on this device. */
export function useCourse(): CourseConfig {
  const id = useApp((s) => s.settings.course);
  return getCourse(id);
}

/** Preparation meter of every course, by course id. */
export function useCourseMeters(): Record<string, CourseMeter> {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  return useMemo(() => Object.fromEntries(COURSES.map((c) => [c.id, courseMeter(c, ctx, cards)])), [ctx, cards]);
}

/** The groups currently selected for a module (remembered in settings). */
export function useSelection(mod: StudyModule) {
  const selections = useApp((s) => s.settings.selections);
  const ctx = useCtx();
  const all = mod.groups ? mod.groups(ctx).map((g) => g.id) : [];
  const saved = selections[mod.id]?.filter((g) => all.includes(g));
  return saved && saved.length ? saved : mod.defaultGroups?.filter((g) => all.includes(g)) ?? all;
}

/** Learned / total items of a module (based on its first exercise's items). */
export function useModuleProgress(mod: StudyModule) {
  const ctx = useCtx();
  const cards = useApp((s) => s.cards);
  return useMemo(() => {
    const ex = mod.exercises[0];
    if (!ex || ex.generative) {
      const st = itemStats(cards, mod.id);
      const seen = [...st.values()].filter((s) => s.seen > 0).length;
      const total = ex ? exerciseItems(ex, ctx).length : 0;
      return { learned: seen, total };
    }
    const items = filterByGroups(exerciseItems(ex, ctx), undefined);
    const st = itemStats(cards, mod.id);
    const learned = items.filter((i) => st.get(i.id)?.learned).length;
    return { learned, total: items.length };
  }, [mod, ctx, cards]);
}
