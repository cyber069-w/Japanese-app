/**
 * The course registry. Every folder with a course.json is picked up
 * automatically – adding a course needs no code (see README → "Add a course").
 */
import type { StudyModule } from '../core/types';
import { getModule, MODULES } from '../modules';
import type { CourseConfig, CourseEntry, CourseSection, MeterSection } from './types';

const files = import.meta.glob<CourseConfig>('./*/course.json', { eager: true, import: 'default' });

export const COURSES: CourseConfig[] = Object.values(files).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

export const DEFAULT_COURSE = COURSES[0]?.id ?? 'japanese';

export function getCourse(id: string | undefined): CourseConfig {
  return COURSES.find((c) => c.id === id) ?? COURSES[0];
}

export interface EntryInfo {
  id: string;
  soon: boolean;
  /** true = the whole module, or the exercise ids written without your material. */
  unverified: boolean | string[];
}

export const entryInfo = (e: CourseEntry): EntryInfo =>
  typeof e === 'string' ? { id: e, soon: false, unverified: false } : { id: e.id, soon: !!e.soon, unverified: e.unverified ?? false };

const sectionsOf = (c: CourseConfig): CourseSection[] => [...c.study, ...c.exam];

/** Every module entry of a course (study and exam), in order. */
export function courseEntries(c: CourseConfig): EntryInfo[] {
  return sectionsOf(c).flatMap((s) => (s.modules ?? []).map(entryInfo));
}

const ENTRY_BY_MODULE = new Map<string, { course: CourseConfig; info: EntryInfo }>();
for (const c of COURSES) for (const info of courseEntries(c)) ENTRY_BY_MODULE.set(info.id, { course: c, info });

/** The course a module belongs to (modules not listed in any course fall back to the first course). */
export const courseOfModule = (moduleId: string): CourseConfig => ENTRY_BY_MODULE.get(moduleId)?.course ?? COURSES[0];

/** How a module is shown in its course ("coming later", unverified content). */
export const moduleInfo = (moduleId: string): EntryInfo => ENTRY_BY_MODULE.get(moduleId)?.info ?? { id: moduleId, soon: false, unverified: false };

/** Whether an exercise's content is not taken from your own material yet. */
export function isUnverified(moduleId: string, exerciseId?: string): boolean {
  const u = moduleInfo(moduleId).unverified;
  return u === true || (!!exerciseId && Array.isArray(u) && u.includes(exerciseId));
}

/** Modules you can study now – "coming later" modules keep their progress but are never due. */
export const ACTIVE_MODULES: StudyModule[] = MODULES.filter((m) => m.status === 'ready' && !moduleInfo(m.id).soon);
export const ACTIVE_IDS: string[] = ACTIVE_MODULES.map((m) => m.id);

/** The modules of one course that can be studied now. */
export function courseModules(c: CourseConfig): StudyModule[] {
  return courseEntries(c)
    .filter((e) => !e.soon)
    .map((e) => getModule(e.id))
    .filter((m): m is StudyModule => !!m && m.status === 'ready');
}

/** Meter sections: from the config, or one per curriculum topic (weight = middle of its exam range). */
export function meterSections(c: CourseConfig): MeterSection[] {
  if (c.topics?.length) return c.topics.map((t) => ({ label: t.name, weight: (t.weight[0] + t.weight[1]) / 2, modules: [] }));
  return c.meter ?? [];
}
