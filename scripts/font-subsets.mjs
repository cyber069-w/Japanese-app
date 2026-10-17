/**
 * The Japanese fonts come as ~120 small files per family, each covering a range of
 * characters. This finds the files needed for the text the app ships with (kana,
 * kanji list, grammar, numbers, speaking …), so the service worker can precache
 * exactly those and every built-in screen renders offline in the right font.
 * Other characters still load (and get cached) on first use.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FAMILIES = ['roboto-mono', 'noto-sans-jp', 'noto-serif-jp'];

function collectChars(dir, out) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) collectChars(p, out);
    else if (/\.(tsx?|json|css)$/.test(f)) for (const c of readFileSync(p, 'utf8')) out.add(c.codePointAt(0));
  }
  return out;
}

function faces(root, family) {
  const css = readFileSync(join(root, 'node_modules/@fontsource-variable', family, 'index.css'), 'utf8');
  return [...css.matchAll(/url\(\.\/files\/([^)]+?)\.woff2\)[^}]*?unicode-range:\s*([^;]+);/g)].map(([, file, ranges]) => ({
    file,
    ranges: ranges.split(',').map((r) => {
      const [a, b] = r.trim().replace(/^U\+/i, '').split('-');
      return [parseInt(a, 16), parseInt(b ?? a, 16)];
    }),
  }));
}

/** Workbox glob patterns for the font files the bundled text needs. */
export function fontGlobs(root) {
  const chars = [...collectChars(join(root, 'src'), new Set())];
  const globs = [];
  for (const family of FAMILIES) {
    for (const face of faces(root, family)) {
      if (chars.some((cp) => face.ranges.some(([a, b]) => cp >= a && cp <= b))) globs.push(`assets/${face.file}-*.woff2`);
    }
  }
  return globs;
}
