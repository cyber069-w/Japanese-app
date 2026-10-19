/** Clubs: a name, a colour, one notes field and a small checklist (items may have a date). Nothing else. */
export interface ClubItem { id: string; text: string; done: boolean; /** YYYY-MM-DD */ due?: string }
export interface Club { id: string; name: string; color: string; notes: string; items: ClubItem[] }

export const CLUB_COLORS = ['#ff9f0a', '#30b650', '#0a84ff', '#af52de', '#ff453a', '#64d2ff', '#ffd60a', '#ac8e68'];
export const newClub = (name = '', now = Date.now()): Club => ({ id: `c${now}${Math.random().toString(36).slice(2, 5)}`, name, color: CLUB_COLORS[Math.floor(Math.random() * CLUB_COLORS.length)], notes: '', items: [] });
export const newItem = (text: string, due?: string, now = Date.now()): ClubItem => ({ id: `i${now}${Math.random().toString(36).slice(2, 5)}`, text: text.trim(), done: false, due: due || undefined });

/** Open dated items of all clubs – shown in To-dos and What to do next. */
export function clubDates(clubs: Club[]): Array<{ id: string; title: string; club: string; due: number }> {
  return clubs.flatMap((c) => c.items.filter((i) => !i.done && i.due).map((i) => ({ id: `club:${c.id}:${i.id}`, title: `${c.name}: ${i.text}`, club: c.name, due: new Date(`${i.due}T23:59:00`).getTime() })));
}
