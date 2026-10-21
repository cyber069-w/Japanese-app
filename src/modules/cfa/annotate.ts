/** Finds an annotation's quote in a PDF page's text items (pdf.js getTextContent), ignoring spaces and case. */

export interface TextPiece { str: string }
/** Part of one text item that belongs to the match: characters [from, to) of item `item`. */
export interface Hit { item: number; from: number; to: number }

export function findQuote(items: TextPiece[], quote: string): Hit[] {
  // one string of all non-space characters, remembering where each came from
  let flat = '';
  const origin: Array<[number, number]> = [];
  items.forEach((it, i) => {
    for (let c = 0; c < it.str.length; c++) {
      if (/\s/.test(it.str[c])) continue;
      flat += it.str[c].toLowerCase();
      origin.push([i, c]);
    }
  });
  const q = quote.replace(/\s+/g, '').toLowerCase();
  const at = q ? flat.indexOf(q) : -1;
  if (at < 0) return [];
  const hits: Hit[] = [];
  for (let k = at; k < at + q.length; k++) {
    const [item, c] = origin[k];
    const last = hits[hits.length - 1];
    if (last && last.item === item) last.to = c + 1;
    else hits.push({ item, from: c, to: c + 1 });
  }
  return hits;
}
