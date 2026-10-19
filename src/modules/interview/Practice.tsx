/** Interview → Spoken practice: pick a question (filter by deck) and run the flow. */
import { useMemo, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { DECKS, deckLabel, type Deck } from './questions';
import { SpokenFlow } from './SpokenFlow';
import { EmptyState } from '../../components/EmptyState';

export function Practice({ ctx }: { ctx: StudyContext }) {
  const all = ctx.content.interviewQs ?? [];
  const [deck, setDeck] = useState<Deck | 'all'>('all');
  const [id, setId] = useState('');
  const list = useMemo(() => all.filter((q) => deck === 'all' || q.deck === deck), [all, deck]);
  const q = all.find((x) => x.id === id);
  if (!all.length) return <EmptyState icon="chat" title="No questions yet" hint="Import a pack first." action={{ label: 'Import a pack', href: '#/m/interview/t/import' }} />;
  if (q) return <SpokenFlow key={q.id} q={q} onDone={() => setId('')} />;
  return (
    <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
      <div className="row">
        <button className={`chip${deck === 'all' ? ' on' : ''}`} onClick={() => setDeck('all')}>All</button>
        {DECKS.map((d) => <button key={d.id} className={`chip${deck === d.id ? ' on' : ''}`} onClick={() => setDeck(d.id)}>{d.label}</button>)}
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => list.length && setId(list[Math.floor(Math.random() * list.length)].id)}>Random question</button>
      </div>
      <ul className="today-list card card-pad">
        {list.map((x) => (
          <li key={x.id} className="today-row"><div className="grow"><div className="today-title">{x.question}</div><div className="today-meta">{deckLabel(x.deck)} · {x.topic}{x.firm ? ` · ${x.firm}` : ''}</div></div><button className="btn btn-sm" onClick={() => setId(x.id)}>Practise</button></li>
        ))}
      </ul>
    </div>
  );
}
