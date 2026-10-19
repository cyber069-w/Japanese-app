/** Quick capture: one line saved to the inbox; the shutdown screen empties it (To-do / Card / Reading / Club item / Application note / Delete). */
export interface InboxItem { id: string; text: string; at: number }
export const newInboxItem = (text: string, now = Date.now()): InboxItem => ({ id: `q${now}${Math.random().toString(36).slice(2, 5)}`, text: text.trim(), at: now });

/** A captured line as a note appended to an application, dated. */
export const appendNote = (notes: string, text: string, now = Date.now()) => {
  const d = new Date(now);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${notes}${notes ? '\n' : ''}${day}: ${text}`;
};
