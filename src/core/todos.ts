/** Your own to-dos (device storage). Canvas deadlines show next to them on Home but stay Canvas items. */
export interface Todo { id: string; text: string; done: boolean; /** YYYY-MM-DD */ due?: string; created: number }

export const newTodo = (text: string, due?: string, now = Date.now()): Todo => ({ id: `t${now}${Math.random().toString(36).slice(2, 5)}`, text: text.trim(), done: false, due: due || undefined, created: now });

/** Open ones first (dated by day, then undated by age), done ones last. */
export function sortTodos(list: Todo[]): Todo[] {
  return [...list].sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.created - b.created);
}
