/** Applications: pipeline by stage + watchlist of programmes (typed in by you – nothing is fetched from Trackr). */
import { useEffect, useMemo, useState } from 'react';
import { storage } from '../core/db';
import { useStored } from '../core/kv';
import {
  blankApplication, DEFAULT_RULES, isActive, moveStage, nextStage, parseRules, seedApplications, STAGES, stageLabel, suggestFromEmail, TYPES, watchFilter,
  type Application, type AppType, type EmailRule, type Stage, type Watch,
} from '../core/applications';
import { type IcsEvent } from '../lib/ics';
import { AddToCalendar } from '../components/AddToCalendar';
import { EmptyState } from '../components/EmptyState';
import { Sheet } from '../components/Sheet';
import { Icon } from '../components/Icon';

const fmt = (s: string) => (s ? new Date(s.includes('T') ? s : `${s}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + (s.includes('T') ? ` ${s.slice(11, 16)}` : '') : '–');
const typeLabel = (t: AppType) => TYPES.find((x) => x.id === t)?.label ?? t;

function calendarEvents(a: Application): IcsEvent[] {
  const ev: IcsEvent[] = [];
  const day = (s: string) => new Date(`${s}T09:00:00`).getTime();
  if (a.opens) ev.push({ title: `Opens: ${a.company} ${a.role}`.trim(), start: day(a.opens), allDay: true, url: a.link || undefined, alarmMin: 0, uid: `${a.id}-opens@studydesk` });
  if (a.deadline) ev.push({ title: `Deadline: ${a.company} ${a.role}`.trim(), start: day(a.deadline), allDay: true, url: a.link || undefined, alarmMin: 60 * 24, uid: `${a.id}-deadline@studydesk` });
  if (a.nextDate) {
    const t = a.nextDate.includes('T') ? new Date(a.nextDate).getTime() : day(a.nextDate);
    ev.push({ title: `${a.company}: ${a.nextStep || 'next step'}`, start: t, end: a.nextDate.includes('T') ? t + 3_600_000 : undefined, allDay: !a.nextDate.includes('T'), url: a.link || undefined, alarmMin: 60, uid: `${a.id}-next@studydesk` });
  }
  return ev;
}

export function Applications() {
  const [apps, setApps] = useStored<Application[]>('applications', []);
  const [rules, setRules] = useStored<EmailRule[]>('applications:rules', DEFAULT_RULES);
  const [tab, setTab] = useState<'pipeline' | 'watch'>('pipeline');
  const [type, setType] = useState<AppType | 'all'>('all');
  const [activeOnly, setActiveOnly] = useState(false);
  const [watch, setWatch] = useState<Watch>('all');
  const [edit, setEdit] = useState<Application | null>(null);
  const now = Date.now();

  // first visit: the three applications you named
  useEffect(() => {
    void (async () => {
      if (await storage.get<boolean>('applications:seeded')) return;
      const existing = await storage.get<Application[]>('applications');
      if (!existing?.length) setApps(seedApplications());
      await storage.set('applications:seeded', true);
    })();
  }, [setApps]);

  const save = (a: Application) => { setApps(apps.some((x) => x.id === a.id) ? apps.map((x) => (x.id === a.id ? a : x)) : [...apps, a]); setEdit(null); };
  const update = (a: Application) => setApps(apps.map((x) => (x.id === a.id ? a : x)));
  const pipeline = useMemo(() => apps.filter((a) => a.stage !== 'researching' && (type === 'all' || a.type === type) && (!activeOnly || isActive(a))), [apps, type, activeOnly]);
  const watchlist = useMemo(() => watchFilter(apps.filter((a) => a.stage === 'researching' && (type === 'all' || a.type === type)), watch, now), [apps, type, watch, now]);

  const row = (a: Application) => {
    const next = nextStage(a.stage);
    return (
      <li key={a.id} className="today-row app-row">
        <div className="grow">
          <div className="today-title">{a.company || '–'} <span className="muted">{a.role}</span></div>
          <div className="today-meta">
            {[typeLabel(a.type), a.deadline ? `deadline ${fmt(a.deadline)}` : null, a.opens ? `opens ${fmt(a.opens)}` : null, a.rolling ? 'rolling' : null, a.hirevue ? 'HireVue' : null, a.nextDate ? `${a.nextStep || 'next'} ${fmt(a.nextDate)}` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
        <span className="row" style={{ gap: 6 }}>
          {next && a.stage !== 'researching' || (a.stage === 'researching' && next) ? <button className="btn btn-sm" onClick={() => update(moveStage(a, next!))}>{a.stage === 'researching' ? 'Mark applied' : `→ ${stageLabel(next!)}`}</button> : null}
          <select className="input app-stage" value={a.stage} onChange={(e) => update(moveStage(a, e.target.value as Stage))} aria-label={`Stage of ${a.company}`}>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {calendarEvents(a).length > 0 && <AddToCalendar events={calendarEvents(a)} filename={`${a.company || 'application'}.ics`} label="Calendar" />}
          <button className="btn btn-sm btn-ghost" onClick={() => setEdit(a)} aria-label={`Edit ${a.company}`}><Icon name="pen" size={14} /></button>
        </span>
      </li>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="grow"><h1>Applications</h1><div className="muted" style={{ marginTop: 4 }}>Pipeline by stage and a watchlist of programmes. Deadlines and next steps also show in To-dos and What to do next.</div></div>
        <button className="btn btn-primary" onClick={() => setEdit(blankApplication())}>+ Add</button>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className={`chip${tab === 'pipeline' ? ' on' : ''}`} onClick={() => setTab('pipeline')}>Pipeline ({apps.filter((a) => a.stage !== 'researching').length})</button>
        <button className={`chip${tab === 'watch' ? ' on' : ''}`} onClick={() => setTab('watch')}>Watchlist ({apps.filter((a) => a.stage === 'researching').length})</button>
        <span className="spacer" />
        <select className="input" value={type} onChange={(e) => setType(e.target.value as AppType | 'all')} aria-label="Type"><option value="all">All types</option>{TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        {tab === 'pipeline' && <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} /> Active only</label>}
      </div>

      {tab === 'pipeline' ? (
        pipeline.length === 0 ? <EmptyState icon="list" title="Nothing in the pipeline" hint="Move a programme from the watchlist to Applied, or add one." /> :
          STAGES.filter((s) => s.id !== 'researching').map((s) => {
            const rows = pipeline.filter((a) => a.stage === s.id);
            return rows.length ? <section key={s.id} className="glass" style={{ marginBottom: 12 }}><div className="glass-head"><h2>{s.label}</h2><span className="faint tiny">{rows.length}</span></div><ul className="today-list">{rows.map(row)}</ul></section> : null;
          })
      ) : (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            {([['all', 'All'], ['open', 'Open now'], ['soon', 'Opens soon'], ['closing', 'Closes within 14 days']] as Array<[Watch, string]>).map(([k, l]) => <button key={k} className={`chip${watch === k ? ' on' : ''}`} onClick={() => setWatch(k)}>{l}</button>)}
            <span className="spacer" />
            <a className="btn btn-sm" href="https://www.the-trackr.com" target="_blank" rel="noreferrer">Open Trackr ↗</a>
          </div>
          <section className="glass">
            {watchlist.length === 0 ? <EmptyState icon="target" title="Nothing on the watchlist" hint="Type in programmes you want to keep an eye on (read them on Trackr yourself – the app never fetches anything)." /> : <ul className="today-list">{watchlist.map(row)}</ul>}
          </section>
        </>
      )}
      <details className="glass" style={{ marginTop: 16 }}>
        <summary className="small">Email rules (editable)</summary>
        <RulesEditor rules={rules} onSave={setRules} />
      </details>
      {edit && <EditSheet app={edit} rules={rules} onSave={save} onDelete={() => { setApps(apps.filter((x) => x.id !== edit.id)); setEdit(null); }} onClose={() => setEdit(null)} isNew={!apps.some((x) => x.id === edit.id)} />}
    </div>
  );
}

function RulesEditor({ rules, onSave }: { rules: EmailRule[]; onSave: (r: EmailRule[]) => void }) {
  const [text, setText] = useState(JSON.stringify({ rules }, null, 2));
  const [err, setErr] = useState('');
  return (
    <div className="stack" style={{ '--gap': '8px', marginTop: 10 } as React.CSSProperties}>
      <div className="faint tiny">First matching rule wins, top to bottom. Keywords are matched anywhere in the pasted email (English and German).</div>
      <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 180 }} aria-label="Email rules JSON" />
      {err && <div className="notice warn small">{err}</div>}
      <div className="row">
        <button className="btn btn-sm" onClick={() => { try { onSave(parseRules(text)); setErr(''); } catch (e) { setErr((e as Error).message); } }}>Save rules</button>
        <button className="btn btn-sm btn-ghost" onClick={() => { onSave(DEFAULT_RULES); setText(JSON.stringify({ rules: DEFAULT_RULES }, null, 2)); setErr(''); }}>Reset to defaults</button>
      </div>
    </div>
  );
}

function EditSheet({ app, rules, onSave, onDelete, onClose, isNew }: { app: Application; rules: EmailRule[]; onSave: (a: Application) => void; onDelete: () => void; onClose: () => void; isNew: boolean }) {
  const [a, setA] = useState(app);
  const [email, setEmail] = useState('');
  const set = <K extends keyof Application>(k: K, v: Application[K]) => setA((x) => ({ ...x, [k]: v }));
  const sug = email.trim() ? suggestFromEmail(email, rules) : null;
  const field = (label: string, el: React.ReactNode) => <label className="stack small" style={{ '--gap': '4px' } as React.CSSProperties}><span className="faint">{label}</span>{el}</label>;
  return (
    <Sheet title={isNew ? 'Add application' : a.company || 'Application'} onClose={onClose}>
      <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <div className="app-grid">
          {field('Company', <input className="input" value={a.company} onChange={(e) => set('company', e.target.value)} />)}
          {field('Programme or role', <input className="input" value={a.role} onChange={(e) => set('role', e.target.value)} />)}
          {field('Type', <select className="input" value={a.type} onChange={(e) => set('type', e.target.value as AppType)}>{TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>)}
          {field('Stage', <select className="input" value={a.stage} onChange={(e) => setA(moveStage(a, e.target.value as Stage))}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>)}
          {field('Opens', <input className="input" type="date" value={a.opens} onChange={(e) => set('opens', e.target.value)} />)}
          {field('Deadline', <input className="input" type="date" value={a.deadline} onChange={(e) => set('deadline', e.target.value)} />)}
          {field('Applied', <input className="input" type="date" value={a.applied} onChange={(e) => set('applied', e.target.value)} />)}
          {field('Link', <input className="input" value={a.link} onChange={(e) => set('link', e.target.value)} placeholder="https://" />)}
          {field('Next step', <input className="input" value={a.nextStep} onChange={(e) => set('nextStep', e.target.value)} />)}
          {field('Next step date', <input className="input" type="datetime-local" value={a.nextDate.includes('T') ? a.nextDate : a.nextDate ? `${a.nextDate}T09:00` : ''} onChange={(e) => set('nextDate', e.target.value)} />)}
        </div>
        <div className="row small">
          <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={a.rolling} onChange={(e) => set('rolling', e.target.checked)} /> Rolling</label>
          <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={a.hirevue} onChange={(e) => set('hirevue', e.target.checked)} /> HireVue</label>
        </div>
        {field('Notes / checked details', <textarea className="input" style={{ minHeight: 70 }} value={a.notes} onChange={(e) => set('notes', e.target.value)} />)}
        {field('Documents (names, one per line)', <textarea className="input" style={{ minHeight: 54 }} value={a.documents.join('\n')} onChange={(e) => set('documents', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} />)}
        <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <span className="faint small">Contacts</span>
          {a.contacts.map((c, i) => (
            <div key={i} className="row">
              {(['name', 'role', 'email'] as const).map((k) => <input key={k} className="input" style={{ flex: '1 1 110px' }} placeholder={k} value={c[k]} onChange={(e) => set('contacts', a.contacts.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} aria-label={`Contact ${k}`} />)}
              <button className="btn btn-sm btn-ghost" onClick={() => set('contacts', a.contacts.filter((_, j) => j !== i))} aria-label="Remove contact"><Icon name="x" size={14} /></button>
            </div>
          ))}
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('contacts', [...a.contacts, { name: '', role: '', email: '' }])}>+ Contact</button>
        </div>
        <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <span className="faint small">Paste an email (copied from Mail) – rules suggest the stage, you confirm</span>
          <textarea className="input" style={{ minHeight: 80 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Paste the email text here" aria-label="Paste email" />
          {sug && (sug.stage ? (
            <div className="notice small row">
              <span>Looks like <b>{stageLabel(sug.stage)}</b> (matched “{sug.keyword}”). History note: {sug.date} – {sug.firstLine || '–'}</span>
              <span className="spacer" />
              <button className="btn btn-sm btn-primary" onClick={() => { setA(moveStage(a, sug.stage!, Date.now(), `${sug.date} – ${sug.firstLine}`)); setEmail(''); }}>Set to {stageLabel(sug.stage)}</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { setA(moveStage(a, a.stage, Date.now(), `${sug.date} – ${sug.firstLine}`)); setEmail(''); }}>Note only</button>
            </div>
          ) : <div className="faint small">No rule matched. <button className="btn btn-sm btn-ghost" onClick={() => { setA(moveStage(a, a.stage, Date.now(), `${sug.date} – ${sug.firstLine}`)); setEmail(''); }}>Save as a note</button></div>)}
        </div>
        {a.history.length > 0 && (
          <details><summary className="faint small">History ({a.history.length})</summary>
            <ul className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>{[...a.history].reverse().map((h, i) => <li key={i}>{new Date(h.at).toLocaleDateString('en-GB')} · {stageLabel(h.stage)}{h.note ? ` – ${h.note}` : ''}</li>)}</ul>
          </details>
        )}
        <div className="row">
          <button className="btn btn-primary" disabled={!a.company.trim()} onClick={() => onSave({ ...a, company: a.company.trim() })}>Save</button>
          {!isNew && <button className="btn btn-danger" onClick={() => confirm(`Delete ${a.company}?`) && onDelete()}>Delete</button>}
        </div>
      </div>
    </Sheet>
  );
}
