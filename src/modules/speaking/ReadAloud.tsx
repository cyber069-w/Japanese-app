/**
 * Read aloud: pick a sentence, listen to it, say it – the app shows which words it recognised.
 * Sentences are the grammar examples (romaji + German, kana with the kana layer).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StudyContext } from '../../core/types';
import { updateSettings } from '../../core/store';
import { loadAzure, type AzureConfig } from '../../core/azure';
import { assess, recordClip, scoreTone, toWav, type Assessment } from '../../lib/azurePronunciation';
import { toRomaji, hasKana } from '../../lib/romaji';
import { addAttempt, loadAttempts, progress, type Attempt } from './attempts';
import { logHistory } from '../../core/history';
import { Icon } from '../../components/Icon';
import { Ruby } from '../../components/Ruby';
import { slowRate, speak } from '../../lib/speech';
import { listenJapanese, recognitionSupported } from '../../lib/speechRecognition';
import { POINTS } from '../grammar/points';
import { parseSentence, sentenceRomaji } from '../grammar/sentence';
import { bestMatch, type WordCheck } from './compare';

const SENTENCES = POINTS.flatMap((p) =>
  p.examples.map((ex) => {
    const s = parseSentence(ex.ja);
    return { lesson: p.lesson, s, romaji: sentenceRomaji(s), de: ex.de, en: ex.en };
  }),
);
const LESSONS = [...new Set(SENTENCES.map((x) => x.lesson))];

interface Result { words: WordCheck[]; score: number; confidence: number }

export function ReadAloud({ ctx }: { ctx: StudyContext }) {
  const [lesson, setLesson] = useState<number | 'all'>(LESSONS[0]);
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const stopRef = useRef<() => void>(() => {});
  const [azure, setAzure] = useState<AzureConfig | null>(null);
  const [pa, setPa] = useState<Assessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  useEffect(() => {
    void loadAzure().then((a) => setAzure(a.config));
    void loadAttempts().then(setAttempts);
  }, []);
  const kana = ctx.settings.kanaLayer;

  const list = useMemo(() => SENTENCES.filter((x) => lesson === 'all' || x.lesson === lesson), [lesson]);
  const cur = list[index % list.length];
  const go = (d: number) => {
    stopRef.current();
    setIndex((i) => (i + d + list.length) % list.length);
    setResult(null);
    setPa(null);
    setError('');
  };

  const sentenceId = `${cur.lesson}:${cur.romaji}`;
  const listenAzure = async () => {
    if (listening) return stopRef.current();
    setError('');
    setPa(null);
    try {
      const clip = await recordClip();
      stopRef.current = clip.stop;
      setListening(true);
      const blob = await clip.done;
      setListening(false);
      setBusy(true);
      const a = await assess(azure!, await toWav(blob), cur.s.spoken.replace(/\s+/g, ''));
      setPa(a);
      setAttempts(await addAttempt({ sentence: sentenceId, at: Date.now(), accuracy: a.accuracy, fluency: a.fluency, completeness: a.completeness, overall: a.overall }));
      logHistory('speaking', `Pronunciation check: ${cur.romaji.slice(0, 50)} – ${Math.round(a.overall)}/100`);
    } catch (e) {
      setError((e as Error).name === 'NotAllowedError' ? 'The microphone is blocked – allow it in the browser’s address bar.' : (e as Error).message);
    } finally {
      setListening(false);
      setBusy(false);
    }
  };

  const listen = async () => {
    if (azure) return listenAzure();
    if (listening) return stopRef.current();
    setError('');
    setResult(null);
    setInterim('');
    setListening(true);
    const l = listenJapanese(setInterim);
    stopRef.current = l.stop;
    try {
      const heard = await l.result;
      const best = bestMatch(cur.s, heard.alternatives);
      setResult({ words: best.words, score: best.score, confidence: heard.confidence });
      logHistory('speaking', `Read aloud: ${cur.romaji.slice(0, 60)} – ${Math.round(best.score * 100)}%`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setListening(false);
      setInterim('');
    }
  };

  if (!azure && !recognitionSupported())
    return (
      <div className="empty">
        Speech recognition isn’t available in this browser. Open the app in Chrome, Edge or Safari to read sentences aloud.
      </div>
    );

  const missing = result?.words.filter((w) => !w.ok) ?? [];
  return (
    <div className="stack" style={{ '--gap': '16px' } as React.CSSProperties}>
      <div className="row">
        <select className="input" value={String(lesson)} onChange={(e) => { setLesson(e.target.value === 'all' ? 'all' : Number(e.target.value)); setIndex(0); setResult(null); }} aria-label="Lesson">
          {LESSONS.map((l) => <option key={l} value={l}>Lesson {l}</option>)}
          <option value="all">All lessons</option>
        </select>
        <span className="faint small">{(index % list.length) + 1} / {list.length}</span>
        <span className="spacer" />
        <button className={`chip${kana ? ' on' : ''}`} aria-pressed={kana} onClick={() => updateSettings({ kanaLayer: !kana })}>{kana ? 'Hide kana' : 'Show kana'}</button>
      </div>

      <section className="card card-pad stack read-aloud" style={{ '--gap': '14px' } as React.CSSProperties}>
        <div className="eyebrow">Read this sentence aloud</div>
        <div className="read-target">
          {result ? result.words.map((w, i) => <span key={i} className={w.ok ? 'said' : 'missed'}>{w.romaji} </span>) : cur.romaji}
        </div>
        {kana && <Ruby text={cur.s.ruby} className="grammar-example" />}
        <div className="muted">{ctx.settings.meaningLang === 'de' ? cur.de : cur.en}</div>
        <div className="row">
          <button className="btn" onClick={() => speak(cur.s.spoken, ctx.settings.voiceRate)}><Icon name="speaker" size={16} /> Listen</button>
          <button className="btn" onClick={() => speak(cur.s.spoken, slowRate(ctx.settings.voiceRate))}><Icon name="clock" size={15} /> Slow</button>
          <button className={`btn btn-primary${listening ? ' recording' : ''}`} onClick={listen} disabled={busy}>
            <Icon name={listening ? 'stop' : 'mic'} size={16} /> {listening ? 'Stop' : busy ? 'Checking…' : result || pa ? 'Try again' : 'Speak'}
          </button>
        </div>
        {listening && <div className="faint small" aria-live="polite">Listening… {interim && '(hearing you)'}</div>}
        {error && <div className="notice warn small">{error}</div>}
        {pa && (
          <div className="stack" style={{ '--gap': '12px' } as React.CSSProperties} aria-live="polite">
            <div className="score-tiles">
              {([['Overall', pa.overall], ['Accuracy', pa.accuracy], ['Fluency', pa.fluency], ['Completeness', pa.completeness]] as const).map(([k, n]) => (
                <div key={k} className={`score-tile ${scoreTone(n)}`}><b>{Math.round(n)}</b><span>{k}</span></div>
              ))}
            </div>
            <div className="word-chips">
              {pa.words.map((w, i) => (
                <span key={i} className={`word-chip ${w.error === 'None' || w.error === 'Mispronunciation' ? scoreTone(w.accuracy) : 'bad'}`} title={w.error === 'None' ? undefined : w.error}>
                  <b>{hasKana(w.word) ? toRomaji(w.word) : w.word}</b>
                  <span>{Math.round(w.accuracy)}</span>
                </span>
              ))}
            </div>
            <div className="faint tiny">Green 80+ · amber 60–79 · red below 60. Work on the red and amber words: listen, then say just that word.</div>
          </div>
        )}
        {azure && (() => {
          const p = progress(attempts, sentenceId);
          return p ? <div className="faint small">This sentence: best {Math.round(p.best)} · last {Math.round(p.last)} · {p.n} attempt{p.n === 1 ? '' : 's'}</div> : null;
        })()}
        {result && (
          <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties} aria-live="polite">
            <div><b>{Math.round(result.score * 100)}%</b> <span className="muted small">of the words recognised{result.confidence > 0 ? ` · clarity ${Math.round(result.confidence * 100)}%` : ''}</span></div>
            {missing.length > 0 ? (
              <div className="small">Not recognised: {missing.map((w) => <b key={w.romaji} className="missed">{w.romaji}</b>).reduce<React.ReactNode[]>((a, b, i) => (i ? [...a, ', ', b] : [b]), [])}. Listen again slowly, then repeat.</div>
            ) : (
              <div className="small">Everything recognised – well done.</div>
            )}
          </div>
        )}
      </section>

      <div className="row">
        <button className="btn" onClick={() => go(-1)}><Icon name="left" size={16} /> Previous</button>
        <button className="btn" onClick={() => go(1)}>Next <Icon name="right" size={16} /></button>
      </div>
      {azure ? (
        <p className="faint tiny">
          Scored by Azure Speech pronunciation assessment (0–100). Your recording is sent to Microsoft. Pitch accent is only partly reflected in the scores; a green score is not a guarantee of natural intonation. Remove the key in Settings → Connections to use the browser check instead.
        </p>
      ) : (
      <p className="faint tiny">
        Uses your browser’s speech recognition (Chrome sends the audio to Google, Safari to Apple). It checks which words were understood – a sign of clear pronunciation, not a full pronunciation analysis. Add an Azure Speech key (Settings → Connections) for scores per word.
      </p>
      )}
    </div>
  );
}
