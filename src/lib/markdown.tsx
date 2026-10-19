import type { ReactNode } from 'react';

/** A tiny, safe Markdown renderer: #/##/### headings, - lists, **bold**, *italic*, [text](https://link). No HTML is ever inserted. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0, m: RegExpExecArray | null, n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] ? <b key={`${key}${n++}`}>{m[1]}</b> : m[2] ? <i key={`${key}${n++}`}>{m[2]}</i> : <a key={`${key}${n++}`} href={m[4]} target="_blank" rel="noreferrer">{m[3]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: number) => { if (list.length) { blocks.push(<ul key={`l${k}`}>{list.map((x, i) => <li key={i}>{inline(x, `li${k}${i}`)}</li>)}</ul>); list = []; } };
  text.split('\n').forEach((line, i) => {
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (li) { list.push(li[1]); return; }
    flush(i);
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { const T = (`h${h[1].length + 2}` as 'h3' | 'h4' | 'h5'); blocks.push(<T key={i}>{inline(h[2], `h${i}`)}</T>); }
    else if (line.trim()) blocks.push(<p key={i}>{inline(line, `p${i}`)}</p>);
  });
  flush(text.length);
  return <div className="markdown">{blocks}</div>;
}
