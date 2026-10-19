/** Exam mode: plan (weeks left, what is not mastered yet, suggested hours) and mock exam queue. */
import type { CourseMeter } from './meter';
import { meterExercises } from './meter';
import { exerciseItems, shuffle, type SessionCard } from './session';
import { cardId, type StudyContext, type StudyModule } from './types';
import type { CardState } from './srs';
import { daysUntil } from '../lib/date';
import { roundHalf } from './targets';

export const PLAN_WEEKS = 6;

export interface ExamPlan {
  daysLeft: number;
  weeksLeft: number;
  /** Sections below 70 %, weakest first. */
  open: Array<{ label: string; score: number }>;
  value: number;
  weeklyHours: number;
}

/** Null until 6 weeks before the exam (and after it). Rule of thumb: 2 h + up to 8 h by how unprepared you are, ×1.5 in the last 2 weeks. */
export function examPlan(examDate: string | undefined, meter: CourseMeter, now = Date.now()): ExamPlan | null {
  if (!examDate) return null;
  const daysLeft = daysUntil(examDate, now);
  if (daysLeft < 0 || daysLeft > PLAN_WEEKS * 7) return null;
  const open = meter.parts.filter((p) => p.score < 0.7).sort((a, b) => a.score - b.score).map((p) => ({ label: p.label, score: p.score }));
  const base = 2 + 8 * (1 - meter.value);
  return { daysLeft, weeksLeft: Math.max(1, Math.ceil(daysLeft / 7)), open, value: meter.value, weeklyHours: roundHalf(daysLeft <= 14 ? base * 1.5 : base) };
}

/** A mixed, checked set of cards across the course's modules: one from each module in turn (unseen and weak first). */
export function mockCards(mods: StudyModule[], ctx: StudyContext, cards: Record<string, CardState>, count = 30): SessionCard[] {
  const lists = mods.map((mod) => {
    const items = meterExercises(mod).exercises.filter((e) => !e.selfRated).flatMap((ex) =>
      exerciseItems(ex, ctx).map((it) => ({ mod, ex, it, c: cards[cardId(mod.id, ex.id, it.id)] })));
    const worst = (c?: CardState) => (!c ? 0.5 : c.step === -1 && c.interval >= 21 ? 1 : c.correct / Math.max(1, c.seen));
    return shuffle(items, ctx.rng).sort((a, b) => worst(a.c) - worst(b.c)).slice(0, count);
  }).filter((l) => l.length);
  const out: SessionCard[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < count && lists.some((l) => i < l.length); i++)
    for (const l of lists) {
      const x = l[i];
      const k = `${x?.mod.id}:${x?.it.id}`;
      if (x && out.length < count && !seen.has(k)) {
        seen.add(k);
        out.push({ key: `mock:${k}:${x.ex.id}`, moduleId: x.mod.id, exerciseId: x.ex.id, item: x.it });
      }
    }
  return shuffle(out, ctx.rng);
}

/** Mistakes grouped by module, most first – the "weak topics" after a mock exam. */
export function weakTopics(mistakes: Array<{ moduleId: string }>, nameOf: (id: string) => string): Array<{ name: string; n: number }> {
  const n = new Map<string, number>();
  for (const m of mistakes) n.set(m.moduleId, (n.get(m.moduleId) ?? 0) + 1);
  return [...n.entries()].map(([id, c]) => ({ name: nameOf(id), n: c })).sort((a, b) => b.n - a.n);
}
