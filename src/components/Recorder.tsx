/**
 * Record yourself and listen back. Recordings stay on this device (IndexedDB),
 * one per key – recording again replaces the old one.
 */
import { useEffect, useRef, useState } from 'react';
import { storage } from '../core/db';
import { stopSpeaking } from '../lib/speech';
import { Icon } from './Icon';

const MAX_MS = 90_000;
const TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];

export const recordingSupported = () =>
  typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

type State = 'idle' | 'asking' | 'recording' | 'ready';

export function Recorder({
  storageKey, label = 'Record your answer', hotkey = false,
}: { storageKey: string; label?: string; hotkey?: boolean }) {
  const [state, setState] = useState<State>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [ms, setMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const meter = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const started = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval>>(undefined);

  // load an earlier recording
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    Promise.all([storage.getBlob(storageKey), storage.get<number>(`rec-ms:${storageKey}`)]).then(([blob, dur]) => {
      if (!alive || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
      setMs(dur ?? 0);
      setState('ready');
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [storageKey]);

  const release = () => {
    cancelAnimationFrame(raf.current);
    clearInterval(tick.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
  };

  useEffect(
    () => () => {
      if (rec.current?.state === 'recording') {
        rec.current.ondataavailable = null;
        rec.current.onstop = null;
        rec.current.stop();
      }
      release();
      audio.current?.pause();
    },
    [],
  );

  const start = async () => {
    setError(null);
    stopSpeaking();
    audio.current?.pause();
    setPlaying(false);
    setState('asking');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const type = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(s, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        const dur = Date.now() - started.current;
        release();
        const blob = new Blob(chunks, { type: r.mimeType || type || 'audio/webm' });
        await storage.setBlob(storageKey, blob);
        await storage.set(`rec-ms:${storageKey}`, dur);
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setMs(dur);
        setState('ready');
      };
      rec.current = r;
      r.start();
      started.current = Date.now();
      setMs(0);
      setState('recording');
      tick.current = setInterval(() => {
        const t = Date.now() - started.current;
        setMs(t);
        if (t >= MAX_MS) stop();
      }, 250);
      // live input level
      try {
        const ac = new AudioContext();
        audioCtx.current = ac;
        const an = ac.createAnalyser();
        an.fftSize = 512;
        ac.createMediaStreamSource(s).connect(an);
        const data = new Uint8Array(an.fftSize);
        const loop = () => {
          an.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          meter.current?.style.setProperty('--level', Math.min(1, peak / 64).toFixed(2));
          raf.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        /* the meter is optional */
      }
    } catch (e) {
      release();
      const name = (e as DOMException).name;
      setError(
        name === 'NotAllowedError'
          ? 'Microphone access is blocked – allow it for this site in your browser settings.'
          : name === 'NotFoundError'
            ? 'No microphone found.'
            : 'Recording didn’t start on this device.',
      );
      setState(url ? 'ready' : 'idle');
    }
  };

  const stop = () => {
    if (rec.current?.state === 'recording') rec.current.stop();
  };

  const play = () => {
    if (!url) return;
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    stopSpeaking();
    const a = new Audio(url);
    audio.current?.pause();
    audio.current = a;
    a.onended = a.onpause = () => setPlaying(false);
    void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const remove = async () => {
    audio.current?.pause();
    await storage.delBlob(storageKey);
    await storage.del(`rec-ms:${storageKey}`);
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    setState('idle');
  };

  // R starts / stops recording
  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== 'r' && e.key !== 'R')) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      e.preventDefault();
      if (state === 'recording') stop();
      else if (state !== 'asking') void start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!recordingSupported()) return null;

  return (
    <div className="recorder">
      {state === 'recording' ? (
        <button type="button" className="btn rec-btn recording" onClick={stop} aria-label="Stop recording">
          <span className="rec-meter" ref={meter} aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
          Stop <span className="rec-time">{fmt(ms)}</span>
        </button>
      ) : state === 'ready' && url ? (
        <>
          <button type="button" className={`btn rec-play${playing ? ' on' : ''}`} onClick={play}>
            <Icon name={playing ? 'stop' : 'play'} size={16} /> {playing ? 'Stop' : 'Your recording'}
            {ms > 0 && <span className="rec-time">{fmt(ms)}</span>}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={start} title={hotkey ? 'Record again (R)' : 'Record again'}>
            <Icon name="mic" size={16} /> Again
          </button>
          <button type="button" className="icon-btn" onClick={remove} aria-label="Delete recording" title="Delete recording">
            <Icon name="trash" size={17} />
          </button>
        </>
      ) : (
        <button type="button" className="btn rec-btn" onClick={start} disabled={state === 'asking'} title={hotkey ? `${label} (R)` : label}>
          <span className="rec-dot" aria-hidden="true" /> {state === 'asking' ? 'Allow the microphone…' : label}
        </button>
      )}
      {error && <div className="notice warn small rec-error">{error}</div>}
    </div>
  );
}
