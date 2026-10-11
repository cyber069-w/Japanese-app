# Handover – Nihongo study app

Status as of 11 Oct 2026, written for continuing in a new (cloud) Claude Code session.

## The goal

A polished, ad-free, offline Japanese study **PWA** for a university student preparing for an **A1 exam**
(course book: *Minna no Nihongo Shokyu 1*, romanized English edition). **Meanings must default to German**
(the exam is in German). UI language: English. Stack: Vite 8 + React 19 + TypeScript 6, IndexedDB (`idb`),
`vite-plugin-pwa`, Vitest. No backend, no accounts, no tracking.

Core idea from the user: a **visual hint system** for kana: the keyword (e.g. "MOO") plus the mnemonic picture
from Tofugu's *Learn Hiragana* book (the cow inside む). All 46 pictures have been extracted from the user's PDF.

## Done ✅

- **Core** (`src/core`): module registry and types, SM-2 spaced repetition (`srs.ts`, tested), IndexedDB store,
  session builder (due → new → weak, wrong answers come back 3 cards later), stats, backup export/import (merge).
- **Libraries** (`src/lib`): romaji ⇄ kana converter and answer checker with strict/normal/lenient modes (tested),
  furigana alignment, CSV parser, Web Speech TTS (ja-JP), hash router.
- **Screens**: Home (due cards, daily goal ring, streak, exam countdown with tips), Study, module page (row/lesson
  picker with presets, exercises, tools), Session (typing / multiple choice / tile ordering / drawing / flashcards,
  hints, keyboard: Enter, 1–6, Space, ?, Esc), Review (all modules mixed + weakest drill), Stats (tiles, 30-day chart,
  accuracy per module, kana and kanji heatmaps red→green, progress per lesson), Settings (leniency, session length,
  daily goal, auto-advance, exam date, sound and voice speed, theme, meaning language DE/EN, furigana, course-pack
  unlock, backup, reset per module, about and licences).
- **Modules** (`src/modules`, registered in `src/modules/index.ts`):
  - Hiragana and Katakana (one factory: `kana/createKanaModule.tsx`): kana→romaji, romaji→kana (MC),
    words/loanwords, writing with stroke order (KanjiVG), katakana look-alikes drill, kana chart tool.
    Hints = own keyword/text + Tofugu picture. Flags for the user's "Ausnahme" (exception) marks: し ち つ ふ.
    Tested in the browser.
  - Vocab: JP→meaning, meaning→type kana (live romaji→kana), meaning→JP, flashcards; word list; CSV import tool.
  - Grammar: lessons 1–10, 55 points (EN/DE explanations, 3 examples each, furigana notation in
    `grammar/sentence.ts`), 37 form drills; exercises: cards, particles, sentence building (tested), forms, translate.
  - Numbers & time: 1–10,000 (+ up to 100,000), times, dates, prices, phone, counters, all sound-change rules as
    hints, rules/tables tool (tested).
  - Kanji: 103 N5 kanji with German meanings, data from KANJIDIC2/JMdict (`scripts/build-kanji.mjs`), example words
    verified; meaning, reading, word→reading, writing; browser tool; "My kanji list" tool (user can paste their list).
    **Not yet tested in the browser.**
- **61 unit tests pass** (`npm test`), `tsc --noEmit` is clean.
- PWA icons (`public/icons`), manifest and service worker config in `vite.config.ts`.

## Private, copyrighted content 🔒 (important)

The user explicitly asked that the Tofugu pictures and the Minna no Nihongo vocab are **never public**.

- Raw files live in `private/` (git-ignored): `private/vocab/*.csv` (lessons 0–5, 285 entries, kana/kanji/de/en),
  `private/hints/hiragana/*.jpg` (46 pictures), `private/PASSPHRASE.txt`.
- `public/pack.enc` = the same content, AES-256-GCM encrypted (`npm run pack`). It is safe to commit and deploy.
  The deployed app unlocks it once per device (Settings → Course pack → passphrase).
- **Restore `private/` in a new environment:** `PACK_PASSPHRASE='…' npm run unpack`. The user has the passphrase
  in `private/PASSPHRASE.txt` on their Mac and pastes it when needed. Never commit or print it.
- The dev server bundles `private/` automatically (virtual module `virtual:private-pack`). Production builds never do,
  unless `VITE_BUNDLE_PRIVATE=1`.
- Mnemonic **texts** are written by me (`hiragana/mnemonics.json`). Don't copy Tofugu's text.

## Next steps (in this order)

1. **Production build and offline check**: `npm run build && npm run preview`. Check that the service worker
   caches the app, fonts are cached at runtime, and it works offline. Check installability.
2. **Full QA click-through**: every screen and module, desktop and phone width (375 px), light and dark mode. Test the
   Kanji module and the writing pad (draw → check → grade). Fix bugs. Check the course-pack unlock flow without the
   dev bundle (`npm run preview` + passphrase).
3. **README.md**: how to run, how deployment works, the vocab CSV format with an example
   (`kana,kanji,de,en,lesson,tags`), and a step-by-step "add a new module" guide (see `src/modules/index.ts` and
   `core/types.ts`).
4. **GitHub Actions → GitHub Pages** workflow (`.github/workflows/deploy.yml`: `npm ci`, `npm test`,
   `npm run build`, upload `dist`). `base: './'` and the hash router already work on Pages.
5. Deploy once the repo exists. The repo itself should be private if possible.

## Reminders – deferred by the user ⏰

- **Listening module**: a draft exists at `src/modules/listening/index.tsx` (dictation, hear→meaning, sentences).
  It compiles but is **not registered** in `src/modules/index.ts`. The user said: not needed right now.
- **Speaking module**: not started (self-introduction builder じこしょうかい with furigana and audio, oral-exam Q&A
  with model answers, local voice recording via MediaRecorder into the `blobs` store). Deferred by the user.
- **Vocab lessons 6–10**: the user will add these themselves later (CSV import, or new CSVs in `private/vocab/` +
  `npm run pack`).
- **Grammar rules**: the user will supply their own grammar rules later. The current lessons 1–10 data in
  `src/modules/grammar/data/*.json` was written by me. Reconcile it with theirs when it arrives.
- **Kanji list**: optional. The user may paste their course list into Kanji → My kanji list. To get German meanings
  for kanji outside the N5 list, extend `N5_DE` in `scripts/build-kanji.mjs` and re-run it (needs KANJIDIC2 and JMdict
  from edrdg.org) plus `npm run build:strokes <kanjivg.xml.gz>`.

## Handy commands

```bash
npm ci                 # install (Node ≥ 22.12; on the user's Mac Node lives in ~/.local/node/bin)
npm run dev            # http://localhost:5173 – bundles private/ if present
npm test               # 61 unit tests
npm run typecheck
npm run build          # tsc + vite build (no private content)
npm run pack           # private/ → public/pack.enc (encrypted)
PACK_PASSPHRASE='…' npm run unpack   # public/pack.enc → private/
```

## Map of the code

```
src/core/       types.ts (module contract), srs.ts, store.ts, db.ts, session.ts, stats.ts, backup.ts, privatePack.ts, hooks.ts
src/lib/        romaji.ts, furigana.ts, csv.ts, speech.ts, router.ts, date.ts
src/components/ answers.tsx (answer widgets), HintPanel, Strokes (stroke animation + draw pad), Ruby, Sheet, Icon, ProgressRing
src/screens/    Home, Study, ModuleScreen (+ ToolScreen), Session, Review, Stats, Settings
src/modules/    kana/ hiragana/ katakana/ vocab/ grammar/ numbers/ kanji/ listening/ (draft, unregistered)
src/data/       strokes.json (KanjiVG, generated)
scripts/        build-pack, unpack-pack, pack-lib, build-kanji, build-strokes, make-icons.swift
```

Licences: KanjiVG (CC BY-SA 3.0), KANJIDIC2/JMdict (EDRDG, CC BY-SA 4.0). Both are credited in Settings → About.
