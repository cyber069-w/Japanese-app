/**
 * Azure Speech pronunciation assessment (ja-JP) through the REST short-audio endpoint – no SDK, so the app
 * stays small. The browser records, we convert to 16 kHz mono WAV and send it with the key (device only).
 * Limits: audio up to ~30 s goes to Microsoft; pitch accent is only partly reflected in the scores.
 */
import type { AzureConfig } from '../core/azure';

export type ErrorType = 'None' | 'Omission' | 'Insertion' | 'Mispronunciation' | 'UnexpectedBreak' | 'MissingBreak' | 'Monotone';
export interface WordScore { word: string; accuracy: number; error: ErrorType }
export interface Assessment { accuracy: number; fluency: number; completeness: number; overall: number; words: WordScore[] }

export const assessmentHeader = (referenceText: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({
    ReferenceText: referenceText, GradingSystem: 'HundredMark', Granularity: 'Word', Dimension: 'Comprehensive', EnableMiscue: 'False',
  }))));

interface RawScores { AccuracyScore?: number; FluencyScore?: number; CompletenessScore?: number; PronScore?: number; ErrorType?: string }
interface RawWord extends RawScores { Word?: string; PronunciationAssessment?: RawScores }
interface RawResponse { RecognitionStatus?: string; NBest?: Array<RawScores & { Words?: RawWord[]; PronunciationAssessment?: RawScores }> }

/** Reads both response shapes (scores nested under PronunciationAssessment, or flat). Null when nothing was recognised. */
export function parseAssessment(json: unknown): Assessment | null {
  const best = (json as RawResponse)?.NBest?.[0];
  if (!best) return null;
  const pa = best.PronunciationAssessment ?? best;
  return {
    accuracy: pa.AccuracyScore ?? 0, fluency: pa.FluencyScore ?? 0, completeness: pa.CompletenessScore ?? 0, overall: pa.PronScore ?? 0,
    words: (best.Words ?? []).map((w) => {
      const s = w.PronunciationAssessment ?? w;
      return { word: w.Word ?? '', accuracy: s.AccuracyScore ?? 0, error: (s.ErrorType as ErrorType) ?? 'None' };
    }),
  };
}

export const scoreTone = (n: number): 'good' | 'warn' | 'bad' => (n >= 80 ? 'good' : n >= 60 ? 'warn' : 'bad');

/** Plain-English message for a failed call – never contains the key. */
export function azureError(status: number): string {
  if (status === 401 || status === 403) return 'Azure did not accept the key or region – check them in Settings → Connections.';
  if (status === 429) return 'Azure says too many requests – wait a moment and try again.';
  if (status === 0) return 'No connection to Azure – check your internet and the region name (e.g. germanywestcentral, westeurope).';
  return `Azure error ${status}.`;
}

/** Any recorded audio → 16 kHz mono 16-bit WAV. */
export async function toWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  void ctx.close();
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  pcm.forEach((x, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 0x7fff, true));
  return new Blob([buf], { type: 'audio/wav' });
}

export async function assess(cfg: AzureConfig, wav: Blob, referenceText: string): Promise<Assessment> {
  let res: Response;
  try {
    res = await fetch(`https://${cfg.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=ja-JP&format=detailed`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': cfg.key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': assessmentHeader(referenceText),
        Accept: 'application/json',
      },
      body: wav,
    });
  } catch {
    throw new Error(azureError(0));
  }
  if (!res.ok) throw new Error(azureError(res.status));
  const json = (await res.json()) as RawResponse;
  const a = parseAssessment(json);
  if (!a) throw new Error(json.RecognitionStatus === 'NoMatch' ? 'Azure heard nothing it could match – speak closer to the microphone and try again.' : 'Azure returned no result.');
  return a;
}

/** Records from the microphone until stop() (or maxMs, default 20 s). */
export async function recordClip(maxMs = 20_000): Promise<{ stop: () => void; done: Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: rec.mimeType }));
    };
  });
  rec.start();
  const limit = setTimeout(() => rec.state === 'recording' && rec.stop(), maxMs);
  return { stop: () => { clearTimeout(limit); if (rec.state === 'recording') rec.stop(); }, done };
}
