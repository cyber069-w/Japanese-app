/** Interview → Import pack: build the Claude prompt, paste the JSON, list and remove questions. */
import { useMemo, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { setInterviewQuestions } from '../../core/store';
import { useStored } from '../../core/kv';
import type { Application } from '../../core/applications';
import { openWithPrompt } from '../../lib/tutor';
import { Icon } from '../../components/Icon';
import { DECKS, deckLabel, FIT_TOPICS, mergeQuestions, packPrompt, parseInterviewPack, TECH_TOPICS, type Deck } from './questions';

export function InterviewImport({ ctx }: { ctx: StudyContext }) {
  const existing = ctx.content.interviewQs ?? [];
  const [apps] = useStored<Application[]>('applications', []);
  const [deck, setDeck] = useState<Deck>('technical');
  const [topics, setTopics] = useState<string[]>([TECH_TOPICS[0]]);
  const [appId, setAppId] = useState('');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const app = apps.find((a) => a.id === appId);
  const options = deck === 'technical' ? TECH_TOPICS : deck === 'behavioural' ? FIT_TOPICS : ['Why this firm?', 'Recent deals and news', 'Culture and people', 'Products and strategy'];
  const parsed = useMemo(() => (text.trim() ? parseInterviewPack(text, { deck, firm: app?.company, applicationId: app?.id }) : null), [text, deck, app]);

  const pickDeck = (d: Deck) => { setDeck(d); setTopics([d === 'technical' ? TECH_TOPICS[0] : d === 'behavioural' ? FIT_TOPICS[0] : 'Why this firm?']); };
  const prompt = () => packPrompt({ deck, topics, firm: app?.company, role: app?.role });
  const copy = async () => { setMsg((await openWithPrompt('interview', prompt(), `Interview pack prompt (${deckLabel(deck)})`)) ? 'Prompt copied – paste it into Claude (⌘V), then paste the answer below.' : 'Claude opened – copying was blocked, copy the prompt from the box below.'); };
  const save = async () => {
    if (!parsed?.questions.length) return;
    await setInterviewQuestions(mergeQuestions(existing, parsed.questions));
    setMsg(`Imported ${parsed.questions.length} question${parsed.questions.length === 1 ? '' : 's'}.`);
    setText('');
  };

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <h2>1 · Ask Claude for a pack</h2>
        <div className="row">{DECKS.map((d) => <button key={d.id} className={`chip${deck === d.id ? ' on' : ''}`} onClick={() => pickDeck(d.id)}>{d.label}</button>)}</div>
        {deck === 'firm' && (
          <label className="stack small" style={{ '--gap': '4px' } as React.CSSProperties}><span className="faint">Link to an application (optional)</span>
            <select className="input" value={appId} onChange={(e) => setAppId(e.target.value)}><option value="">– no link –</option>{apps.map((a) => <option key={a.id} value={a.id}>{a.company} {a.role}</option>)}</select>
          </label>
        )}
        <div className="row">{options.map((t) => <button key={t} className={`chip${topics.includes(t) ? ' on' : ''}`} aria-pressed={topics.includes(t)} onClick={() => setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t])}>{t}</button>)}</div>
        <div className="row"><button className="btn btn-primary" onClick={() => void copy()} disabled={!topics.length}><Icon name="sparkle" size={16} /> Copy prompt and open Claude</button></div>
        <details><summary className="faint small">Show the prompt</summary><textarea className="input" readOnly value={prompt()} style={{ minHeight: 140 }} aria-label="Prompt" /></details>
      </section>
      <section className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <h2>2 · Paste the pack</h2>
        <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder='{"questions":[…]}' aria-label="Pack JSON" />
        {parsed && <div className="small">{parsed.questions.length} question{parsed.questions.length === 1 ? '' : 's'} ready.{parsed.errors.map((e) => <div key={e} className="faint tiny">⚠ {e}</div>)}</div>}
        <div className="row"><button className="btn btn-primary" disabled={!parsed?.questions.length} onClick={() => void save()}>Import</button>{msg && <span className="faint small" role="status">{msg}</span>}</div>
      </section>
      <section className="card card-pad stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <h2>Your questions ({existing.length})</h2>
        {existing.length === 0 ? <div className="muted small">None yet.</div> : DECKS.map((d) => {
          const list = existing.filter((q) => q.deck === d.id);
          return list.length ? (
            <details key={d.id}><summary className="small"><b>{d.label}</b> · {list.length}</summary>
              <ul className="today-list">{list.map((q) => <li key={q.id} className="today-row"><div className="grow small">{q.question}<div className="today-meta">{q.topic}{q.firm ? ` · ${q.firm}` : ''}</div></div><button className="btn btn-sm btn-ghost" aria-label="Delete question" onClick={() => void setInterviewQuestions(existing.filter((x) => x.id !== q.id))}><Icon name="x" size={14} /></button></li>)}</ul>
            </details>
          ) : null;
        })}
      </section>
    </div>
  );
}
