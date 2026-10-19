/** Finance (#/finance): password-protected study-costs tracker. Everything is encrypted; locks after 5 min idle or when hidden. */
import { useEffect, useMemo, useState } from 'react';
import { createVault, deleteEntry, initFinance, lock, saveEntry, saveMeta, unlock, useFinance } from '../core/financeStore';
import { entriesCsv, money, newEntry, semesterOf, totals, type CostEntry } from '../core/finance';
import { Sheet } from '../components/Sheet';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';

export function Finance() {
  const f = useFinance();
  useEffect(() => { void initFinance(); }, []);
  if (f.status === 'loading') return <div className="page"><div className="muted">Loading…</div></div>;
  if (f.status === 'none') return <Setup />;
  if (f.status === 'locked') return <Locked error={f.error} />;
  return <Tracker />;
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="page">
      <div className="page-head"><div className="grow"><h1>Finance</h1><div className="muted" style={{ marginTop: 4 }}>Study costs, encrypted on this device and in sync.</div></div></div>
      <section className="glass" style={{ maxWidth: 480 }}><div className="glass-head"><h2>{title}</h2></div>{children}</section>
    </div>
  );
}

function Setup() {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false);
  const valid = pw.length >= 10 && pw === pw2 && ok;
  return (
    <Gate title="Set a finance password">
      <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        <div className="notice warn small"><b>If you forget this password, your finance data cannot be recovered.</b> Nobody – not the app, not Claude – can reset it. Use a password manager.</div>
        <input className="input" type="password" autoComplete="new-password" placeholder="Password (at least 10 characters)" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Finance password" />
        <input className="input" type="password" autoComplete="new-password" placeholder="Repeat password" value={pw2} onChange={(e) => setPw2(e.target.value)} aria-label="Repeat finance password" />
        {pw2 && pw !== pw2 && <div className="faint tiny">The passwords differ.</div>}
        <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> I understand it cannot be recovered</label>
        <div className="row"><button className="btn btn-primary" disabled={!valid || busy} onClick={async () => { setBusy(true); await createVault(pw); setBusy(false); }}>{busy ? 'Creating…' : 'Create vault'}</button></div>
        <div className="faint tiny">The password never leaves this device. Entries are encrypted (AES-256-GCM, key from PBKDF2 with 600 000 rounds) before they are stored or synced.</div>
      </div>
    </Gate>
  );
}

function Locked({ error }: { error?: string }) {
  const [pw, setPw] = useState(''), [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); await unlock(pw); setBusy(false); setPw(''); };
  return (
    <Gate title="Locked">
      <form className="stack" style={{ '--gap': '10px' } as React.CSSProperties} onSubmit={(e) => { e.preventDefault(); void go(); }}>
        <input className="input" type="password" autoComplete="current-password" placeholder="Finance password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Finance password" autoFocus />
        {error && <div className="notice warn small" role="alert">{error}</div>}
        <div className="row"><button className="btn btn-primary" type="submit" disabled={!pw || busy}><Icon name="lock" size={16} /> {busy ? 'Unlocking…' : 'Unlock'}</button></div>
      </form>
    </Gate>
  );
}

function Tracker() {
  const f = useFinance();
  const [edit, setEdit] = useState<CostEntry | null>(null);
  const [catEdit, setCatEdit] = useState(false);
  const t = useMemo(() => totals(f.entries), [f.entries]);
  const cur = (m: Record<string, number> | undefined) => (m ? Object.entries(m).map(([c, n]) => money(n, c)).join(' + ') : '–');
  const thisMonth = new Date().toISOString().slice(0, 7), thisSem = semesterOf(new Date().toISOString().slice(0, 10));
  const csv = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([entriesCsv(f.entries)], { type: 'text/csv' })); a.download = 'study-costs.csv'; a.click(); };
  return (
    <div className="page">
      <div className="page-head">
        <div className="grow"><h1>Finance</h1><div className="muted" style={{ marginTop: 4 }}>Study costs (CFA fees are not counted). Locks after 5 minutes without activity.</div></div>
        <div className="row"><button className="btn" onClick={() => setEdit(newEntry({ currency: f.meta.currency, category: f.meta.categories[0] ?? 'Other' }))}>+ Add cost</button><button className="btn" onClick={lock}><Icon name="lock" size={15} /> Lock now</button></div>
      </div>
      {f.unreadable > 0 && <div className="notice warn small" style={{ marginBottom: 12 }}>{f.unreadable} synced entr{f.unreadable === 1 ? 'y' : 'ies'} could not be decrypted – they were made with a different finance password on another device.</div>}
      <div className="bento">
        <section className="glass b-cards"><div className="glass-head"><h2>{thisMonth}</h2></div><div className="big-number" style={{ fontSize: '2rem' }}>{cur(t.month[thisMonth])}</div><div className="muted small">this month</div></section>
        <section className="glass b-cards"><div className="glass-head"><h2>{thisSem}</h2></div><div className="big-number" style={{ fontSize: '2rem' }}>{cur(t.semester[thisSem])}</div><div className="muted small">this semester</div></section>
        <section className="glass" style={{ gridColumn: 'span 4' }}>
          <div className="glass-head"><h2>By category</h2><button className="btn btn-sm btn-ghost" onClick={() => setCatEdit(true)}>Edit</button></div>
          <ul className="week-bars">{Object.entries(t.category).map(([c, m]) => <li key={c} style={{ gridTemplateColumns: '1fr auto' }}><span>{c}</span><small>{cur(m)}</small></li>)}</ul>
          {Object.keys(t.category).length === 0 && <p className="muted small">Nothing yet.</p>}
        </section>
      </div>
      <section className="glass" style={{ marginTop: 14 }}>
        <div className="glass-head"><h2>Entries</h2>{f.entries.length > 0 && <button className="btn btn-sm" onClick={csv}>Export CSV</button>}</div>
        {f.entries.length === 0 ? <EmptyState icon="list" title="No costs yet" hint="Add semester fees, books, software and so on." /> : (
          <ul className="today-list">
            {f.entries.map((e) => (
              <li key={e.id} className="today-row">
                <span className="today-time">{new Date(`${e.date}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <div className="grow"><div className="today-title">{money(e.amount, e.currency)} <span className="muted">· {e.category}</span></div>{(e.note || e.receipt) && <div className="today-meta">{[e.note, e.receipt ? `receipt: ${e.receipt}` : ''].filter(Boolean).join(' · ')}</div>}</div>
                <button className="btn btn-sm btn-ghost" onClick={() => setEdit(e)} aria-label="Edit cost"><Icon name="pen" size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {edit && <EntrySheet e={edit} categories={f.meta.categories} isNew={!f.entries.some((x) => x.id === edit.id)} onClose={() => setEdit(null)} />}
      {catEdit && <CategorySheet categories={f.meta.categories} onClose={() => setCatEdit(false)} />}
    </div>
  );
}

function EntrySheet({ e, categories, isNew, onClose }: { e: CostEntry; categories: string[]; isNew: boolean; onClose: () => void }) {
  const [x, setX] = useState(e);
  const [amount, setAmount] = useState(e.amount ? String(e.amount) : '');
  const f = (label: string, el: React.ReactNode) => <label className="stack small" style={{ '--gap': '4px' } as React.CSSProperties}><span className="faint">{label}</span>{el}</label>;
  const n = Number(amount.replace(',', '.'));
  return (
    <Sheet title={isNew ? 'Add cost' : 'Edit cost'} onClose={onClose}>
      <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <div className="app-grid">
          {f('Date', <input className="input" type="date" value={x.date} onChange={(ev) => setX({ ...x, date: ev.target.value })} />)}
          {f('Amount', <input className="input" inputMode="decimal" value={amount} onChange={(ev) => setAmount(ev.target.value)} placeholder="0.00" />)}
          {f('Currency', <input className="input" value={x.currency} onChange={(ev) => setX({ ...x, currency: ev.target.value.toUpperCase().slice(0, 3) })} />)}
          {f('Category', <select className="input" value={x.category} onChange={(ev) => setX({ ...x, category: ev.target.value })}>{[...new Set([...categories, x.category])].map((c) => <option key={c} value={c}>{c}</option>)}</select>)}
        </div>
        {f('Note', <input className="input" value={x.note} onChange={(ev) => setX({ ...x, note: ev.target.value })} />)}
        {f('Receipt (file name, optional)', <input className="input" value={x.receipt ?? ''} onChange={(ev) => setX({ ...x, receipt: ev.target.value || undefined })} />)}
        <div className="row">
          <button className="btn btn-primary" disabled={!(n > 0) || !x.date} onClick={async () => { await saveEntry({ ...x, amount: Math.round(n * 100) / 100 }); onClose(); }}>Save</button>
          {!isNew && <button className="btn btn-danger" onClick={async () => { if (confirm('Delete this cost?')) { await deleteEntry(e.id); onClose(); } }}>Delete</button>}
        </div>
      </div>
    </Sheet>
  );
}

function CategorySheet({ categories, onClose }: { categories: string[]; onClose: () => void }) {
  const f = useFinance();
  const [text, setText] = useState(categories.join('\n'));
  return (
    <Sheet title="Categories" onClose={onClose}>
      <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
        <div className="faint small">One per line. Existing entries keep their category even if you remove it here.</div>
        <textarea className="input" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Categories" />
        <div className="row"><button className="btn btn-primary" onClick={async () => { const c = text.split('\n').map((x) => x.trim()).filter(Boolean); await saveMeta({ ...f.meta, categories: c.length ? c : ['Other'] }); onClose(); }}>Save</button></div>
      </div>
    </Sheet>
  );
}
