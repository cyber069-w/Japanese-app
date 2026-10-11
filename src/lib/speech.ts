/**
 * Japanese text-to-speech with the browser's built-in voices (Web Speech API).
 * Picks the best available ja-JP voice; does nothing if there is none.
 */
import { useSyncExternalStore } from 'react';

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

// ---------------------------------------------------------------------------
// "Is something playing right now?" – for the pulsing play buttons
// ---------------------------------------------------------------------------

let speaking = false;
const speakingListeners = new Set<() => void>();
function setSpeaking(v: boolean) {
  if (speaking === v) return;
  speaking = v;
  speakingListeners.forEach((l) => l());
}

/** True while the app is speaking. */
export function useSpeaking(): boolean {
  return useSyncExternalStore(
    (l) => {
      speakingListeners.add(l);
      return () => speakingListeners.delete(l);
    },
    () => speaking,
    () => false,
  );
}

let current: SpeechSynthesisUtterance | null = null;

export function speak(text: string, rate = 0.9) {
  if (!supported() || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[～〜]/g, ''));
  u.lang = 'ja-JP';
  if (voice) u.voice = voice;
  u.rate = rate;
  current = u;
  // `current` guards against a cancelled utterance ending after the next one started
  u.onstart = () => current === u && setSpeaking(true);
  u.onend = u.onerror = () => current === u && setSpeaking(false);
  setSpeaking(true);
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (!supported()) return;
  current = null;
  speechSynthesis.cancel();
  setSpeaking(false);
}

/**
 * iOS only allows speech that starts inside a tap. Call this from the click that
 * opens a session, so audio that plays automatically a moment later isn't blocked.
 */
export function primeSpeech() {
  if (!supported() || speaking) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}

/** The slower speed used by the "slow" replay buttons. */
export const slowRate = (rate: number) => Math.max(0.5, Math.round(rate * 0.65 * 100) / 100);
