/**
 * Japanese text-to-speech with the browser's built-in voices (Web Speech API).
 * Picks the best available ja-JP voice; does nothing if there is none.
 */
let voice: SpeechSynthesisVoice | null = null;
let ready = false;
const listeners = new Set<() => void>();

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function score(v: SpeechSynthesisVoice) {
  let s = 0;
  if (/premium|enhanced|natural|neural/i.test(v.name)) s += 4;
  if (/kyoko|o-ren|otoya|hattori|nanami|keita|google/i.test(v.name)) s += 2;
  if (v.localService) s += 1;
  return s;
}

function pick() {
  if (!supported()) return;
  const ja = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja'));
  voice = ja.sort((a, b) => score(b) - score(a))[0] ?? null;
  ready = true;
  listeners.forEach((l) => l());
}

if (supported()) {
  pick();
  speechSynthesis.addEventListener?.('voiceschanged', pick);
}

export const speechSupported = supported;
export const hasJapaneseVoice = () => ready && voice !== null;
export const voiceName = () => voice?.name ?? null;
export function onVoicesChanged(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function speak(text: string, rate = 0.9) {
  if (!supported() || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[～〜]/g, ''));
  u.lang = 'ja-JP';
  if (voice) u.voice = voice;
  u.rate = rate;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (supported()) speechSynthesis.cancel();
}
