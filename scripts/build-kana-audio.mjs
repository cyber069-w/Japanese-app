/**
 * Pre-recorded kana audio (macOS only): every hiragana/katakana sound is spoken once with the
 * system voice Kyoko and saved as public/audio/kana/<id>.m4a, so single kana sound the same on
 * every device – browser text-to-speech often mispronounces lone characters or has no Japanese voice.
 * Also writes src/data/kanaAudio.json (kana → file id) for lib/speech.ts.
 *
 *   node --import ./scripts/ts-resolve.mjs scripts/build-kana-audio.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKana } from '../src/modules/kana/table.ts';
import { toKatakana } from '../src/lib/romaji.ts';

const VOICE = 'Kyoko';
const RATE = '140'; // words per minute – a little slower than the default
const out = fileURLToPath(new URL('../public/audio/kana/', import.meta.url));
mkdirSync(out, { recursive: true });
const tmp = join(tmpdir(), 'kana-audio');
mkdirSync(tmp, { recursive: true });

const map = {};
const done = new Set();
const report = [];
for (const script of ['hiragana', 'katakana']) {
  for (const c of buildKana(script)) {
    map[c.kana] = c.id;
    if (done.has(c.id)) continue;
    done.add(c.id);
    // katakana is read letter-for-letter more reliably than hiragana (は is never taken as the particle "wa")
    const text = toKatakana(c.kana).replace('ゔ', 'ヴ');
    const aiff = join(tmp, `${c.id}.aiff`);
    execFileSync('say', ['-v', VOICE, '-r', RATE, '-o', aiff, text]);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', aiff, join(out, `${c.id}.m4a`)]);
    const info = execFileSync('afinfo', [aiff]).toString();
    const sec = Number(/estimated duration: ([\d.]+)/.exec(info)?.[1] ?? 0);
    report.push([c.id, text, sec]);
  }
}
rmSync(tmp, { recursive: true, force: true });
writeFileSync(new URL('../src/data/kanaAudio.json', import.meta.url), JSON.stringify(map) + '\n');
const odd = report.filter(([, , s]) => s < 0.2 || s > 1.1);
console.log(`${report.length} sounds written to public/audio/kana/`);
if (odd.length) console.log('Check these by ear (unusually short or long):', odd.map(([id, t, s]) => `${id} ${t} ${s.toFixed(2)}s`).join(', '));
