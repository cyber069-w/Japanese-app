/**
 * Japanese speech recognition with the browser's Web Speech API (Chrome, Edge, Safari – not Firefox).
 * Chrome sends the audio to Google's recogniser, Safari to Apple's; nothing is stored by the app.
 */
export interface Heard { transcript: string; confidence: number; alternatives: string[] }

type Ctor = new () => {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const ctor = (): Ctor | undefined =>
  typeof window === 'undefined' ? undefined : ((window as unknown as Record<string, Ctor>).SpeechRecognition ?? (window as unknown as Record<string, Ctor>).webkitSpeechRecognition);

export const recognitionSupported = () => !!ctor();

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access was blocked – allow it in the browser’s site settings.',
  'service-not-allowed': 'Speech recognition is turned off in this browser.',
  'no-speech': 'Nothing was heard – try again a little louder.',
  'audio-capture': 'No microphone found.',
  network: 'Speech recognition needs an internet connection.',
};

/** Listens once (until you pause). `stop()` ends early and still returns what was heard. */
export function listenJapanese(onInterim?: (text: string) => void): { stop: () => void; result: Promise<Heard> } {
  const C = ctor();
  if (!C) return { stop: () => {}, result: Promise.reject(new Error('Speech recognition is not available in this browser – use Chrome, Edge or Safari.')) };
  const rec = new C();
  rec.lang = 'ja-JP';
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  let final: Heard | null = null;
  const result = new Promise<Heard>((resolve, reject) => {
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      const alts = Array.from({ length: r.length }, (_, i) => r[i]);
      if (r.isFinal) final = { transcript: alts[0].transcript, confidence: alts[0].confidence ?? 0, alternatives: alts.map((a) => a.transcript) };
      else onInterim?.(alts[0].transcript);
    };
    rec.onerror = (e) => reject(new Error(ERRORS[e.error] ?? `Speech recognition failed (${e.error}).`));
    rec.onend = () => (final ? resolve(final) : reject(new Error(ERRORS['no-speech'])));
  });
  rec.start();
  return { stop: () => rec.stop(), result };
}
