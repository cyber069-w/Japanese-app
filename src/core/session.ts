/**
 * Builds the list of cards for a study session.
 *
 *  - Study:  one exercise of one module, filtered by the selected groups.
 *            Due cards first, then new ones, then weak ones to fill up.
 *  - Review: everything due today across all modules and exercises.
 *  - Weak:   the items with the worst track record (optionally one module).
 */
import { DAY, weakness, type CardState } from './srs';
import { cardId, parseCardId, type BaseItem, type Exercise, type StudyContext, type StudyModule } from './types';
import { endOfToday } from '../lib/date';

export interface SessionCard {
  key: string; // unique within the session
  moduleId: string;
  exerciseId: string;
  item: BaseItem;
}

// Items are rebuilt only when the content or relevant settings change.
const itemCache = new WeakMap<Exercise, { stamp: unknown[]; items: BaseItem[] }>();
export function exerciseItems(ex: Exercise, ctx: StudyContext): BaseItem[] {
  const stamp = [ctx.content, ctx.settings.meaningLang];
  const hit = itemCache.get(ex);
  if (hit && hit.stamp.every((s, i) => s === stamp[i])) return hit.items;
  const items = ex.items(ctx);
  itemCache.set(ex, { stamp, items });
  return items;
}

export function filterByGroups<I extends BaseItem>(items: I[], selected: string[] | undefined): I[] {
  if (!selected) return items;
  const set = new Set(selected);
  return items.filter((it) => it.groups.every((g) => set.has(g)));
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let seq = 0;
const sc = (moduleId: string, exerciseId: string, item: BaseItem): SessionCard => ({
  key: `${moduleId}:${exerciseId}:${item.id}#${seq++}`, moduleId, exerciseId, item,
});

/** Weighted pick without replacement. */
function weightedSample<T>(items: T[], weight: (t: T) => number, n: number, rng: () => number): T[] {
  const pool = items.map((t) => ({ t, w: Math.max(0.01, weight(t)) }));
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let x = rng() * total;
    let i = 0;
    while (i < pool.length - 1 && (x -= pool[i].w) > 0) i++;
    out.push(pool[i].t);
    pool.splice(i, 1);
  }
  return out;
}

export function buildStudyQueue(
  mod: StudyModule, ex: Exercise, ctx: StudyContext, selected: string[] | undefined,
  cards: Record<string, CardState>, now = Date.now(), length = ctx.settings.sessionLength,
): SessionCard[] {
  const items = filterByGroups(exerciseItems(ex, ctx), mod.groups ? selected : undefined);
  if (!items.length) return [];
  const card = (it: BaseItem) => cards[cardId(mod.id, ex.id, it.id)];

  if (ex.generative) {
    // Random questions per category: practise weak / due categories more often
    const w = (it: BaseItem) => {
      const c = card(it);
      if (!c) return 1.2;
      return 0.4 + weakness(c, now) + (c.due <= now ? 0.8 : 0);
    };
    const out: SessionCard[] = [];
    for (let i = 0; i < length; i++) out.push(sc(mod.id, ex.id, weightedSample(items, w, 1, ctx.rng)[0]));
    return out;
  }

  const due = items.filter((it) => card(it) && card(it).due <= now).sort((a, b) => card(a).due - card(b).due);
  const fresh = items.filter((it) => !card(it));
  const rest = items.filter((it) => card(it) && card(it).due > now);
  const picked = [...due, ...fresh].slice(0, length);
  if (picked.length < length) {
    // fill with not-yet-due items, favouring weak and long-unseen ones
    const w = (it: BaseItem) => {
      const c = card(it);
      const staleness = Math.min(1, (now - c.last) / (3 * DAY));
      return 0.2 + weakness(c, now) + 0.5 * staleness;
    };
    picked.push(...weightedSample(rest, w, length - picked.length, ctx.rng));
  }
  return shuffle(picked, ctx.rng).map((it) => sc(mod.id, ex.id, it));
}

/** Resolve stored card ids back to module/exercise/item, skipping ones whose content is gone. */
function resolve(ids: string[], modules: StudyModule[], ctx: StudyContext): SessionCard[] {
  const out: SessionCard[] = [];
  const lookup = new Map<string, Map<string, BaseItem>>();
  for (const id of ids) {
    const { moduleId, exerciseId, itemId } = parseCardId(id);
    const mod = modules.find((m) => m.id === moduleId);
    const ex = mod?.exercises.find((e) => e.id === exerciseId);
    if (!mod || !ex || ex.generative) continue;
    const k = `${moduleId}:${exerciseId}`;
    if (!lookup.has(k)) lookup.set(k, new Map(exerciseItems(ex, ctx).map((it) => [it.id, it])));
    const item = lookup.get(k)!.get(itemId);
    if (item) out.push(sc(moduleId, exerciseId, item));
  }
  return out;
}

export function dueCardIds(cards: Record<string, CardState>, now = Date.now(), moduleId?: string): string[] {
  const limit = endOfToday(now);
  return Object.values(cards)
    .filter((c) => c.due <= limit && (!moduleId || c.id.startsWith(moduleId + ':')))
    .sort((a, b) => a.due - b.due)
    .map((c) => c.id);
}

export function buildReviewQueue(
  modules: StudyModule[], ctx: StudyContext, cards: Record<string, CardState>, now = Date.now(), limit = 50, moduleId?: string,
): SessionCard[] {
  const resolved = resolve(dueCardIds(cards, now, moduleId), modules, ctx).slice(0, limit);
  // Interleave modules a little so a review doesn't feel like one long block
  return shuffle(resolved, ctx.rng);
}

/** Number of due cards that can actually be reviewed (content available). */
export function countDue(modules: StudyModule[], ctx: StudyContext, cards: Record<string, CardState>, now = Date.now(), moduleId?: string) {
  return resolve(dueCardIds(cards, now, moduleId), modules, ctx).length;
}

/** Ids of the most-missed cards, optionally only from one module or a list of modules (e.g. a course). */
export function weakCardIds(cards: Record<string, CardState>, now = Date.now(), moduleId?: string | string[], limit = 20): string[] {
  const only = moduleId === undefined ? null : (Array.isArray(moduleId) ? moduleId : [moduleId]).map((m) => m + ':');
  return Object.values(cards)
    .filter((c) => c.seen >= 2 && c.correct < c.seen && (!only || only.some((p) => c.id.startsWith(p))))
    .sort((a, b) => weakness(b, now) - weakness(a, now))
    .slice(0, limit)
    .map((c) => c.id);
}

export function buildWeakQueue(
  modules: StudyModule[], ctx: StudyContext, cards: Record<string, CardState>, now = Date.now(), moduleId?: string | string[], limit = 20,
): SessionCard[] {
  return shuffle(resolve(weakCardIds(cards, now, moduleId, limit), modules, ctx), ctx.rng);
}
