/**
 * Builds the private course pack from the git-ignored `private/` folder:
 *
 *   private/vocab/*.csv            Minna no Nihongo vocab (kana,kanji,de,en,lesson,tags)
 *   private/mnemonics/<script>.json memory keywords/texts per kana id (hiragana: based on the Tofugu pictures)
 *   private/hints/<script>/<id>.jpg mnemonic pictures, e.g. private/hints/hiragana/mu.jpg
 *
 * Used by vite.config.ts (dev server) and scripts/build-pack.mjs (encrypted file).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { parseVocabCsv } from '../src/lib/csv.ts';

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

export function buildPrivatePack(root) {
  const dir = join(root, 'private');
  if (!existsSync(dir)) return null;

  const vocab = [];
  const ids = new Set();
  const vocabDir = join(dir, 'vocab');
  if (existsSync(vocabDir)) {
    for (const f of readdirSync(vocabDir).filter((f) => f.endsWith('.csv')).sort()) {
      const { entries, errors } = parseVocabCsv(readFileSync(join(vocabDir, f), 'utf8'), 'mnn', 'de');
      for (const e of errors) console.warn(`[private pack] ${f}: ${e}`);
      for (const e of entries) {
        let id = `mnn${e.lesson}-${e.kana}`.replace(/[:\s]/g, '_');
        while (ids.has(id)) id += '+';
        ids.add(id);
        vocab.push({ ...e, id });
      }
    }
  }

  const hints = {};
  const hintDir = join(dir, 'hints');
  if (existsSync(hintDir)) {
    for (const script of readdirSync(hintDir)) {
      const sdir = join(hintDir, script);
      if (!statSync(sdir).isDirectory()) continue;
      hints[script] = {};
      for (const f of readdirSync(sdir)) {
        const mime = MIME[extname(f).toLowerCase()];
        if (!mime) continue;
        hints[script][basename(f, extname(f))] = `data:${mime};base64,${readFileSync(join(sdir, f)).toString('base64')}`;
      }
    }
  }
  // memory texts derived from copyrighted material (Tofugu hiragana pictures): private/mnemonics/<script>.json
  const mnemonics = {};
  const mnemDir = join(dir, 'mnemonics');
  if (existsSync(mnemDir)) {
    for (const f of readdirSync(mnemDir).filter((f) => f.endsWith('.json'))) mnemonics[basename(f, '.json')] = JSON.parse(readFileSync(join(mnemDir, f), 'utf8'));
  }

  return { version: 1, vocab, hints, mnemonics };
}
