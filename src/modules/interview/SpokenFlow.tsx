/** Spoken practice: question → 20 s prep → record (60/90/120 s) with live transcript → playback, stats, self-rating (feeds the SRS). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { recordAnswer } from '../../core/store';
import { cardId } from '../../core/types';
import { storage } from '../../core/db';
import { useStored } from '../../core/kv';
import { logHistory } from '../../core/history';
import { recordClip } from '../../lib/azurePronunciation';
import { liveSupported, startLive } from '../../lib/speechLive';
import { openWithPrompt } from '../../lib/tutor';
import { Icon } from '../../components/Icon';
import { feedbackPrompt, sparPrompt, type InterviewQuestion } from './questions';
import { gradeOfRating, speechStats, type Attempt } from './stats';
import { Teleprompter } from './Teleprompter';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;
type Phase = 'setup' | 'prep' | 'record' | 'review';

export function SpokenFlow({ q, warmup, onDone }: { q: InterviewQuestion; warmup?: boolean; onDone?: () => void }) {
  const [attempts, setAttempts] = useStored<Attempt[]>('interview:attempts', []);
  const [savedTarget, setSavedTarget] = useStored<number>(`interview:target:${q.id}`, 90);
  const target = warmup ? 60 : savedTarget;
  const [phase, setPhase] = useState<Phase>(warmup ? 'prep' : 'setup');
  const [lang, setLang] = useState<'en' | 'de'>('en');
  const [prep, setPrep] = useState(20);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState('');
  const [transcript, setTranscript] = useState('');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState('');
  const [rating, setRating] = useState(0);
  const [saved, setSaved] = useState<Attempt | null>(null);
  const [error, setError] = useState('');
  const [tp, setTp] = useState<{ on: boolean; source: 'points' | 'script'; script: string; wpm: number }>({ on: false, source: 'points', script: '', wpm: 130 });
  const stopRef = useRef<() => void>(() => {});
  const startedAt = useRef(0);
  const shownAt = useRef(Date.now());

  // 20 s preparation countdown
  useEffect(() => {
    if (phase !== 'prep') return;
    setPrep(20);
    const t = setInterval(() => setPrep((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => { if (phase === 'prep' && prep <= 0) void startRecording(); }, [prep, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { stopRef.current(); }, []);
  useEffect(() => { if (blob) { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u); } }, [blob]);

  async function startRecording() {
    setError('');
    try {
      const clip = await recordClip((target + 5) * 1000);
      const sr = liveSupported() ? startLive(lang === 'de' ? 'de-DE' : 'en-US', setLive) : null;
      startedAt.current = Date.now();
      setElapsed(0);
      setPhase('record');
      const tick = setInterval(() => {
        const s = (Date.now() - startedAt.current) / 1000;
        setElapsed(s);
        if (s >= target) stop();
      }, 250);
      let finished = false;
      const stop = () => {
        if (finished) return;
        finished = true;
        clearInterval(tick);
        clip.stop();
        const text = sr?.stop() ?? '';
        const seconds = Math.round((Date.now() - startedAt.current) / 1000);
        void clip.done.then((b) => { setBlob(b); setTranscript(text); setElapsed(seconds); setPhase('review'); });
      };
      stopRef.current = stop;
    } catch (e) {
      setError((e as Error).name === 'NotAllowedError' ? 'The microphone is blocked – allow it in the browser’s address bar.' : (e as Error).message);
      setPhase(warmup ? 'prep' : 'setup');
    }
  }

  const stats = useMemo(() => speechStats(transcript, elapsed, lang), [transcript, elapsed, lang]);
  const mine = attempts.filter((a) => a.qid === q.id).sort((a, b) => b.at - a.at);

  const save = async () => {
    if (!rating) return;
    const a: Attempt = { id: `a${Date.now()}`, qid: q.id, at: Date.now(), seconds: elapsed, target, transcript, words: stats.words, wpm: stats.wpm, fillers: stats.fillers, fillersPerMin: stats.fillersPerMin, rating, lang, ...(warmup ? { warmup: true } : {}) };
    if (blob) await storage.setBlob(`interview:rec:${a.id}`, blob);
    setAttempts([...attempts, a]);
    recordAnswer(cardId('interview', 'cards', q.id), 'interview', gradeOfRating(rating), Date.now() - shownAt.current, true);
    logHistory('speaking', `Interview answer: ${q.question.slice(0, 50)} – ${stats.wpm} wpm, ${stats.fillers} fillers, ${rating}/5`);
    setSaved(a);
  };
  const again = () => { setSaved(null); setRating(0); setLive(''); setTranscript(''); setBlob(null); setPhase('setup'); shownAt.current = Date.now(); };
  const script = tp.source === 'points' ? q.model_answer_points.join('. ') : tp.script;
  const statLine = `${elapsed} s, ${stats.wpm} words per minute, ${stats.fillers} filler words`;

  return (
    <div className="stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      <div className="card card-pad stack" style={{ '--gap': '8px' } as React.CSSProperties}>
        <div className="eyebrow">{warmup ? 'Daily warm-up · one take' : `${q.topic}${q.firm ? ` · ${q.firm}` : ''}`}</div>
        <div className="serif" style={{ fontSize: '1.3rem', lineHeight: 1.35 }}>{q.question}</div>
      </div>
      {error && <div className="notice warn small">{error}</div>}

      {phase === 'setup' && (
        <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="row"><b className="small">Target length</b>{[60, 90, 120].map((s) => <button key={s} className={`chip${target === s ? ' on' : ''}`} onClick={() => setSavedTarget(s)}>{s} s</button>)}</div>
          <div className="row"><b className="small">Language</b>{(['en', 'de'] as const).map((l) => <button key={l} className={`chip${lang === l ? ' on' : ''}`} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'Deutsch'}</button>)}</div>
          <div className="row"><label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={tp.on} onChange={(e) => setTp({ ...tp, on: e.target.checked })} /> Teleprompter</label></div>
          {tp.on && (
            <div className="stack small" style={{ '--gap': '8px' } as React.CSSProperties}>
              <div className="row">{(['points', 'script'] as const).map((s) => <button key={s} className={`chip${tp.source === s ? ' on' : ''}`} onClick={() => setTp({ ...tp, source: s })}>{s === 'points' ? 'Model answer points' : 'My script'}</button>)}
                <label className="row" style={{ gap: 6 }}>Speed <input className="input" type="number" min={80} max={200} step={10} style={{ width: 78 }} value={tp.wpm} onChange={(e) => setTp({ ...tp, wpm: Number(e.target.value) || 130 })} aria-label="Teleprompter words per minute" /> wpm</label></div>
              {tp.source === 'script' && <textarea className="input" value={tp.script} onChange={(e) => setTp({ ...tp, script: e.target.value })} placeholder="Your own script" aria-label="Teleprompter script" />}
            </div>
          )}
          <div className="faint tiny">{liveSupported() ? 'The live transcript uses your browser’s speech recognition (Chrome sends audio to Google, Safari to Apple). The recording stays on this device.' : 'This browser has no speech recognition – you can type the transcript after recording.'}</div>
          <div className="row"><button className="btn btn-primary" onClick={() => setPhase('prep')}><Icon name="play" size={16} /> Start – 20 s to prepare</button></div>
        </div>
      )}

      {phase === 'prep' && (
        <div className="card card-pad stack center" style={{ '--gap': '10px' } as React.CSSProperties}>
          <div className="big-number">{Math.max(0, prep)}</div>
          <div className="muted small">Think about your structure – recording starts by itself ({target} s).</div>
          <div className="row" style={{ justifyContent: 'center' }}><button className="btn btn-primary" onClick={() => void startRecording()}><Icon name="mic" size={16} /> Start now</button></div>
        </div>
      )}

      {phase === 'record' && (
        <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <div className="row" style={{ justifyContent: 'space-between' }}><b className="recording-dot">● Recording {clock(elapsed)} / {clock(target)}</b><button className="btn btn-primary" onClick={() => stopRef.current()}><Icon name="stop" size={16} /> Stop</button></div>
          <div className="bar"><span style={{ width: `${Math.min(100, (elapsed / target) * 100)}%` }} /></div>
          {tp.on && script && <Teleprompter text={script} wpm={tp.wpm} running />}
          {live && <div className="faint small" aria-live="polite">{live.slice(-240)}</div>}
        </div>
      )}

      {phase === 'review' && (
        <div className="card card-pad stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          {url && <audio controls src={url} style={{ width: '100%' }} />}
          <div className="exam-chips" style={{ marginTop: 0 }}>
            <span><b>{clock(elapsed)}</b> length</span><span><b>{stats.wpm}</b> words/min</span><span><b>{stats.fillers}</b> fillers ({stats.fillersPerMin}/min)</span><span><b>{stats.words}</b> words</span>
          </div>
          {Object.keys(stats.byWord).length > 0 && <div className="faint small">{Object.entries(stats.byWord).map(([w, n]) => `${w} ×${n}`).join(' · ')}</div>}
          <label className="stack small" style={{ '--gap': '4px' } as React.CSSProperties}><span className="faint">Transcript (edit if it misheard)</span>
            <textarea className="input" value={transcript} onChange={(e) => setTranscript(e.target.value)} aria-label="Transcript" /></label>
          <details><summary className="small faint">Model answer points</summary><ul className="small">{q.model_answer_points.map((p) => <li key={p}>{p}</li>)}</ul></details>
          {!saved ? (
            <div className="stack" style={{ '--gap': '8px' } as React.CSSProperties}>
              <b className="small">How well did you cover the points?</b>
              <div className="row">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={`chip${rating === n ? ' on' : ''}`} aria-pressed={rating === n} onClick={() => setRating(n)}>{n}</button>)}<span className="faint tiny">1 = badly · 5 = fully</span></div>
              <div className="row"><button className="btn btn-primary" disabled={!rating} onClick={() => void save()}>Save attempt</button></div>
            </div>
          ) : (
            <div className="notice good small" role="status">Saved – rated {saved.rating}/5, scheduled for review.</div>
          )}
          <div className="row">
            <button className="btn" onClick={() => void openWithPrompt('interview', feedbackPrompt(q, transcript, statLine), 'Interview feedback prompt')}><Icon name="sparkle" size={15} /> Get feedback</button>
            <button className="btn" onClick={() => void openWithPrompt('interview', sparPrompt(q, transcript), 'Interview spar prompt')}><Icon name="chat" size={15} /> Spar</button>
            {!warmup && <button className="btn btn-ghost" onClick={again}>Try again</button>}
            {onDone && <button className="btn btn-ghost" onClick={onDone}>Done</button>}
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <div className="card card-pad stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <b className="small">Earlier attempts</b>
          <ul className="today-list">{mine.slice(0, 8).map((a) => <Past key={a.id} a={a} />)}</ul>
        </div>
      )}
    </div>
  );
}

function Past({ a }: { a: Attempt }) {
  const [url, setUrl] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    let made = '';
    void storage.getBlob(`interview:rec:${a.id}`).then((b) => { if (b) { made = URL.createObjectURL(b); setUrl(made); } });
    return () => { if (made) URL.revokeObjectURL(made); };
  }, [open, a.id]);
  return (
    <li className="today-row" style={{ flexWrap: 'wrap' }}>
      <span className="today-time">{new Date(a.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      <span className="grow small">{a.seconds}s · {a.wpm} wpm · {a.fillers} fillers · {a.rating}/5{a.warmup ? ' · warm-up' : ''}</span>
      <button className="btn btn-sm btn-ghost" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Listen'}</button>
      {open && <div style={{ flexBasis: '100%' }}>{url ? <audio controls src={url} style={{ width: '100%' }} /> : <span className="faint tiny">No recording kept.</span>}{a.transcript && <p className="small muted">{a.transcript}</p>}</div>}
    </li>
  );
}
