/** Market and deal log (#/market): one line a day, tagged; one tap turns a line into an interview card. */
import { useState } from 'react';
import { useStored } from '../core/kv';
import { useApp, setInterviewQuestions } from '../core/store';
import { mergeQuestions, questionFromMarket } from '../modules/interview/questions';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';

type Tag = 'market' | 'deal' | 'asia';
interface Line { id: string; date: string; text: string; tag: Tag }
const TAGS: Array<[Tag, string]> = [['market', 'Market'], ['deal', 'Deal'], ['asia', 'Asia']];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function Market() {
  const [log, setLog] = useStored<Line[]>('market:log', []);
  const existing = useApp((s) => s.content.interviewQs) ?? [];
  const [text, setText] = useState('');
  const [tag, setTag] = useState<Tag>('market');
  const [msg, setMsg] = useState('');
  const add = () => { if (!text.trim()) return; setLog([{ id: `m${Date.now()}`, date: today(), text: text.trim(), tag }, ...log]); setText(''); };
  const toCard = async (l: Line) => { await setInterviewQuestions(mergeQuestions(existing, [questionFromMarket(l)])); setMsg('Card added to Interview → Technical → Markets and current deals.'); };
  return (
    <div className="page">
      <div className="page-head"><div className="grow"><h1>Market and deal log</h1><div className="muted" style={{ marginTop: 4 }}>One line a day. Turn the good ones into interview cards.</div></div></div>
      <form className="todo-add" style={{ maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="input" placeholder="What happened today?" value={text} onChange={(e) => setText(e.target.value)} aria-label="Log line" />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()} aria-label="Add line"><span aria-hidden="true" style={{ fontSize: '1.3rem', lineHeight: 1 }}>+</span></button>
        <div className="row todo-when">{TAGS.map(([k, l]) => <button key={k} type="button" className={`chip${tag === k ? ' on' : ''}`} onClick={() => setTag(k)}>{l}</button>)}</div>
      </form>
      {msg && <div className="notice good small" role="status" style={{ margin: '10px 0' }}>{msg}</div>}
      <section className="glass" style={{ marginTop: 16 }}>
        {log.length === 0 ? <EmptyState icon="list" title="Nothing logged yet" hint="One line per day is enough." /> : (
          <ul className="today-list">
            {log.map((l) => (
              <li key={l.id} className="today-row">
                <span className="today-time">{new Date(`${l.date}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <div className="grow"><span className="tag" style={{ marginRight: 8 }}>{TAGS.find((t) => t[0] === l.tag)?.[1]}</span>{l.text}</div>
                <button className="btn btn-sm" onClick={() => void toCard(l)}>→ Card</button>
                <button className="btn btn-sm btn-ghost" aria-label="Delete line" onClick={() => setLog(log.filter((x) => x.id !== l.id))}><Icon name="x" size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
