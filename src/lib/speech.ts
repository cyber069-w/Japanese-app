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

/** Bumped by every speak/stop, so events of a cancelled utterance are ignored. */
let generation = 0;

function utterance(text: string, rate: number) {
  const u = new SpeechSynthesisUtterance(text.replace(/[～〜]/g, ''));
  u.lang = 'ja-JP';
  if (voice) u.voice = voice;
  u.rate = rate;
  return u;
}

export function speak(text: string, rate = 0.9) {
  speakQueue([text], rate);
}

/**
 * Speak several sentences one after another. `onIndex` reports the sentence being
 * spoken (null at the end) – used to highlight lines while they are read.
 */
export function speakQueue(texts: string[], rate = 0.9, onIndex?: (i: number | null) => void) {
  const list = texts.filter(Boolean);
  if (!supported() || !list.length) return;
  speechSynthesis.cancel();
  const gen = ++generation;
  list.forEach((t, i) => {
    const u = utterance(t, rate);
    u.onstart = () => {
      if (gen !== generation) return;
      setSpeaking(true);
      onIndex?.(i);
    };
    if (i === list.length - 1) {
      u.onend = u.onerror = () => {
        if (gen !== generation) return;
        setSpeaking(false);
        onIndex?.(null);
      };
    }
    speechSynthesis.speak(u);
  });
  setSpeaking(true);
  // Some engines never fire onend (or fail silently without a Japanese voice):
  // poll so the UI doesn't stay in "playing" forever.
  const check = () => {
    if (gen !== generation) return;
    if (speechSynthesis.speaking || speechSynthesis.pending) setTimeout(check, 1000);
    else {
      setSpeaking(false);
      onIndex?.(null);
    }
  };
  setTimeout(check, 1500);
}

export function stopSpeaking() {
  if (!supported()) return;
  generation++;
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
