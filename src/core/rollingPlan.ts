/**
 * Rolling plan: study blocks for the rest of today and for tomorrow, made fresh from "now" every time anything changes.
 * Nothing is fixed in advance – a missed block simply isn't logged, so that subject falls further behind its weekly
 * target and moves up; when free time is short, the lowest-priority subjects drop out (listed in `dropped`).
 *
 * Priority = hours per remaining day of the week needed to reach the weekly target, raised by a deadline or exam
 * within the next 7 days. Busy = lectures, calendar events, logged and running sessions, blocks you fixed yourself.
 */
import { weekStart } from './targets';

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export interface PlanDemand { subject: string; /** hours still open for this week's target */ remaining: number; /** nearest deadline or exam (ms) */ due?: number; dueLabel?: string }
export interface RollingBlock { subject: string; start: number; end: number; day: 'today' | 'tomorrow'; why: string }
export interface RollingPlan { blocks: RollingBlock[]; /** subjects that still need time but don't fit before tomorrow night */ dropped: Array<{ subject: string; hours: number }> }

export interface PlanOptions { minBlockMin?: number; maxBlockMin?: number; breakMin?: number }

const round = (h: number) => Math.round(h * 10) / 10;

/** Days left in the week of `now`, today included (Monday → 7, Sunday → 1). */
export const daysLeftInWeek = (now: number) => Math.max(1, Math.round((weekStart(now, 1).getTime() - new Date(new Date(now).toDateString()).getTime()) / DAY));

/** Free intervals inside the windows, after taking out everything busy. */
export function freeTime(windows: Array<[number, number]>, busy: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const sorted = [...busy].sort((a, b) => a[0] - b[0]);
  for (const [ws, we] of windows) {
    let cur = ws;
    for (const [a, b] of sorted) {
      if (b <= cur || a >= we) continue;
      if (a > cur) out.push([cur, a]);
      cur = Math.max(cur, b);
    }
    if (cur < we) out.push([cur, we]);
  }
  return out;
}

/**
 * @param windows [today from now to day end, tomorrow's day window]
 */
export function rollingPlan(now: number, windows: [[number, number], [number, number]], busy: Array<[number, number]>, demands: PlanDemand[], opt: PlanOptions = {}): RollingPlan {
  const minBlock = (opt.minBlockMin ?? 45) * MIN;
  const maxBlock = (opt.maxBlockMin ?? 90) * MIN;
  const brk = (opt.breakMin ?? 15) * MIN;
  const daysLeft = daysLeftInWeek(now);
  const horizonDays = Math.min(2, daysLeft);
  const tomorrowStart = windows[1][0];

  const rows = demands
    .filter((d) => d.remaining > 0.2)
    .map((d) => {
      const perDay = d.remaining / daysLeft;
      const dueDays = d.due !== undefined ? (d.due - now) / DAY : undefined;
      const urgent = dueDays !== undefined && dueDays >= 0 && dueDays <= 7;
      const boost = urgent ? 1 + 2 * (1 - dueDays! / 7) : 1;
      // a deadline in the next two days asks for more than the even weekly share
      const need = Math.min(d.remaining, perDay * horizonDays * (urgent && dueDays! <= 2 ? 2 : 1));
      const why = urgent ? `${d.dueLabel ?? 'deadline'} in ${Math.max(0, Math.round(dueDays!))} d` : `${round(d.remaining)} h left this week`;
      return { subject: d.subject, need: need * HOUR, first: need * HOUR, score: perDay * boost, why };
    })
    .filter((r) => r.need >= 15 * MIN);

  const blocks: RollingBlock[] = [];
  for (const [a, b] of freeTime(windows, busy)) {
    let cur = Math.ceil(a / (5 * MIN)) * 5 * MIN;
    for (;;) {
      const open = rows.filter((r) => r.need >= 15 * MIN);
      if (!open.length) break;
      // priority falls as a subject gets its share, so the evening isn't one subject only
      const pick = open.reduce((x, y) => (y.score * (y.need / y.first) > x.score * (x.need / x.first) ? y : x));
      // a small rest of a subject's share may be a 30-min top-up; otherwise blocks are 45–90 min
      const want = Math.max(30 * MIN, Math.min(maxBlock, Math.ceil(pick.need / (15 * MIN)) * 15 * MIN));
      const len = Math.min(want, b - cur);
      if (len < Math.min(minBlock, want)) break;
      blocks.push({ subject: pick.subject, start: cur, end: cur + len, day: cur >= tomorrowStart ? 'tomorrow' : 'today', why: pick.why });
      pick.need -= len;
      cur += len + brk;
    }
  }
  const dropped = rows.filter((r) => r.need >= 15 * MIN).map((r) => ({ subject: r.subject, hours: round(r.need / HOUR) }));
  return { blocks, dropped };
}

/** Weekly targets minus this week's hours, with the nearest deadline or exam (next 7 days) of each subject. */
export function planDemands(targets: Record<string, number>, done: Record<string, number>, deadlines: Array<{ subject: string; due?: number }>, exams: Array<{ subject: string; due: number }>, now: number): PlanDemand[] {
  const soon = (t?: number) => t !== undefined && t >= now && t - now <= 7 * DAY;
  return Object.entries(targets)
    .filter(([, t]) => t > 0)
    .map(([subject, target]) => {
      const dl = deadlines.filter((d) => d.subject === subject && soon(d.due)).sort((a, b) => a.due! - b.due!)[0];
      const ex = exams.filter((e) => e.subject === subject && soon(e.due)).sort((a, b) => a.due - b.due)[0];
      const first = [dl && { due: dl.due!, dueLabel: 'deadline' }, ex && { due: ex.due, dueLabel: 'exam' }].filter(Boolean).sort((a, b) => a!.due - b!.due)[0];
      return { subject, remaining: Math.max(0, target - (done[subject] ?? 0)), ...(first ?? {}) };
    });
}
