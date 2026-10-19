/** Live speech-to-text while you speak (browser Web Speech API, continuous). Chrome sends audio to Google, Safari to Apple. */
type Rec = {
  lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
};
const ctor = (): (new () => Rec) | undefined =>
  typeof window === 'undefined' ? undefined : ((window as unknown as Record<string, new () => Rec>).SpeechRecognition ?? (window as unknown as Record<string, new () => Rec>).webkitSpeechRecognition);

export const liveSupported = () => !!ctor();

/** Keeps listening (restarts after pauses) until stop(); onText gets the whole transcript so far. */
export function startLive(lang: string, onText: (text: string) => void): { stop: () => string } {
  const C = ctor();
  let finalText = '';
  let interim = '';
  let on = !!C;
  if (!C) return { stop: () => '' };
  const rec = new C();
  rec.lang = lang; rec.interimResults = true; rec.continuous = true;
  rec.onresult = (e) => {
    interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += `${r[0].transcript.trim()} `;
      else interim += r[0].transcript;
    }
    onText((finalText + interim).trim());
  };
  rec.onerror = () => {};
  rec.onend = () => { if (on) { try { rec.start(); } catch { /* already running */ } } };
  try { rec.start(); } catch { on = false; }
  return { stop: () => { on = false; try { rec.stop(); } catch { /* ignore */ } return (finalText + interim).trim(); } };
}
