/** Clubs (#/clubs, #/clubs/:id): a list, and per club one notes field + a dated checklist. */
import { useState } from 'react';
import { useStored } from '../core/kv';
import { CLUB_COLORS, newClub, newItem, type Club } from '../core/clubs';
import { Markdown } from '../lib/markdown';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { navigate } from '../lib/router';

export function Clubs({ id }: { id?: string }) {
  const [clubs, setClubs] = useStored<Club[]>('clubs', []);
  const [name, setName] = useState('');
  const club = clubs.find((c) => c.id === id);
  if (id && !club) return <div className="page"><EmptyState icon="list" title="Club not found" action={{ label: 'All clubs', href: '#/clubs' }} /></div>;
  if (club) return <ClubPage club={club} onChange={(c) => setClubs(clubs.map((x) => (x.id === c.id ? c : x)))} onDelete={() => { setClubs(clubs.filter((x) => x.id !== club.id)); navigate('/clubs'); }} />;
  return (
    <div className="page">
      <div className="page-head"><div className="grow"><h1>Clubs</h1><div className="muted" style={{ marginTop: 4 }}>One notes field and a checklist per club – dated items show up in your to-dos.</div></div></div>
      <form className="todo-add" style={{ maxWidth: 420, marginBottom: 16 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) { const c = newClub(name.trim()); setClubs([...clubs, c]); setName(''); navigate(`/clubs/${c.id}`); } }}>
        <input className="input" placeholder="New club…" value={name} onChange={(e) => setName(e.target.value)} aria-label="New club" />
        <button className="btn btn-primary" type="submit" disabled={!name.trim()} aria-label="Add club"><span aria-hidden="true" style={{ fontSize: '1.3rem', lineHeight: 1 }}>+</span></button>
      </form>
      {clubs.length === 0 ? <EmptyState icon="list" title="No clubs yet" hint="Add a club above." /> : (
        <div className="subject-grid">
          {clubs.map((c) => {
            const open = c.items.filter((i) => !i.done).length;
            return (
              <a key={c.id} className="subject-tile" href={`#/clubs/${c.id}`} style={{ '--tile': c.color } as React.CSSProperties}>
                <span className="subject-icon"><Icon name="user" size={22} /></span>
                <span><b className="subject-name">{c.name}</b><span className="subject-note">{c.notes ? c.notes.split('\n')[0].replace(/[#*]/g, '').slice(0, 50) : 'No notes yet'}</span></span>
                <span className="subject-meta"><span>{open ? `${open} open` : 'nothing open'}</span></span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClubPage({ club, onChange, onDelete }: { club: Club; onChange: (c: Club) => void; onDelete: () => void }) {
  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const [edit, setEdit] = useState(false);
  const add = () => { if (!text.trim()) return; onChange({ ...club, items: [...club.items, newItem(text, due)] }); setText(''); setDue(''); };
  const items = [...club.items].sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  return (
    <div className="page">
      <div className="page-head">
        <div className="grow"><a className="small" href="#/clubs">← Clubs</a><h1 style={{ marginTop: 4 }}><span className="club-dot" style={{ background: club.color }} />{club.name}</h1></div>
        <button className="btn btn-sm btn-danger" onClick={() => confirm(`Delete ${club.name}?`) && onDelete()}>Delete club</button>
      </div>
      <div className="bento">
        <section className="glass" style={{ gridColumn: 'span 7' }}>
          <div className="glass-head"><h2>Notes</h2><button className="btn btn-sm" onClick={() => setEdit(!edit)}>{edit ? 'Preview' : 'Edit'}</button></div>
          {edit ? <textarea className="input" style={{ minHeight: 260 }} value={club.notes} onChange={(e) => onChange({ ...club, notes: e.target.value })} aria-label="Club notes (Markdown)" placeholder="Markdown: # heading, - list, **bold**" />
            : club.notes ? <Markdown text={club.notes} /> : <p className="muted small">No notes yet – press Edit.</p>}
        </section>
        <section className="glass" style={{ gridColumn: 'span 5' }}>
          <div className="glass-head"><h2>Checklist</h2><span className="faint tiny">{club.items.filter((i) => !i.done).length} open</span></div>
          <form className="todo-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <input className="input" placeholder="Add an item…" value={text} onChange={(e) => setText(e.target.value)} aria-label="New checklist item" />
            <button className="btn btn-primary" type="submit" disabled={!text.trim()} aria-label="Add item"><span aria-hidden="true" style={{ fontSize: '1.3rem', lineHeight: 1 }}>+</span></button>
            {text.trim() && <label className="todo-when faint small">Date <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Date (optional)" /></label>}
          </form>
          <ul className="todo-list">
            {items.map((i) => (
              <li key={i.id} className={`todo${i.done ? ' done' : ''}`}>
                <button className="todo-check" aria-pressed={i.done} aria-label={i.done ? 'Mark open' : 'Mark done'} onClick={() => onChange({ ...club, items: club.items.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)) })}>{i.done && <Icon name="check" size={14} />}</button>
                <span className="grow"><b>{i.text}</b>{i.due && <small>{new Date(`${i.due}T12:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</small>}</span>
                <button className="btn btn-sm btn-ghost" aria-label="Delete item" onClick={() => onChange({ ...club, items: club.items.filter((x) => x.id !== i.id) })}><Icon name="x" size={14} /></button>
              </li>
            ))}
          </ul>
          {items.length === 0 && <p className="muted small">Nothing on the list.</p>}
          <div className="row" style={{ marginTop: 12 }}>{CLUB_COLORS.map((c) => <button key={c} className="club-swatch" style={{ background: c, outline: club.color === c ? '2px solid var(--ink)' : 'none' }} onClick={() => onChange({ ...club, color: c })} aria-label={`Colour ${c}`} />)}</div>
        </section>
      </div>
    </div>
  );
}
