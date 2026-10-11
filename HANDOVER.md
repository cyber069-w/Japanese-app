# Handover – Nihongo study app (read this first)

Written 11 Oct 2026, updated at the end of the second session, for a **new chat that has none of the previous context**.
Everything you need is in this file, `README.md` and the code.

---

## 1. Who it's for

A university student (German-speaking) preparing for an **A1 Japanese exam** (oral + written). The course book is
*Minna no Nihongo Shokyu 1* (romanized English edition). **Word meanings must default to German**, because the exam
is in German. English is offered as a switch. The app UI is in English. The user communicates in English.

## 2. What the user asked for (the spec)

A polished, **ad-free, private** Japanese study app: a static **PWA** that works offline and can be installed on phone and
laptop. No backend, no accounts, no tracking.

- **Module system**: each module registers its name, icon, items and quiz modes. Home, Study, Review and Stats pick up
  new modules automatically. Content lives in data files (JSON/CSV).
- **One shared spaced-repetition engine** for every module. Wrong items come back sooner, known items fade out.
  **One unified Review** mixes everything due across modules.
- Progress saved locally (IndexedDB), with **export/import as JSON**.
- **Hiragana**: pick rows (あ…ん, dakuten/handakuten, combinations) with presets (basic 46 / dakuten / combos / everything);
  modes kana→romaji, romaji→kana (4–6 options), word mode, writing mode with stroke-order animation and self-check;
  accept romaji variants (shi/si, chi/ti, tsu/tu, fu/hu, ji/zi); TTS (ja-JP), toggleable; instant feedback,
  Enter = next; fully keyboard-driven, great on touch.
- **Visual hint system (the user's top wish)**: e.g. it says "MOO" and shows the picture of the cow drawn into む.
  The pictures come from the user's Tofugu *Learn Hiragana* PDF; all 46 are extracted.
- **Katakana**: same code, plus loanwords (ー, small ッ) and a look-alikes drill (シ/ツ, ソ/ン, ク/ケ/タ, ワ/ウ/フ).
- **Vocab**: Minna no Nihongo vocab by lesson; CSV/paste import (kana, kanji optional, meaning DE/EN, lesson);
  both directions, multiple choice and typing; lesson filter; audio; built-in romaji→kana for typing.
- **Kanji**: N5 kanji with meaning, on/kun, stroke count, stroke-order animation, example words; modes kanji→meaning,
  kanji→reading, word→reading, drawing; tagged by the Minna no Nihongo lesson where they appear.
- **Grammar**: Minna no Nihongo lessons 1–10 grammar points (pattern, explanation EN/DE, 3 examples with furigana and
  translation); exercises: particle fill-in, sentence ordering with word tiles, choose the correct form, translate.
- **Numbers, time & dates**: numbers to 10,000 (the user specifically wants 1–10,000 with its sound-change rules),
  times, weekdays, dates incl. irregulars, prices, phone numbers, counters (つ, 人, 枚, 本 …); see → type the reading,
  hear → type the number.
- **Listening**: dictation (hear a word or sentence via TTS, type in kana or pick the meaning); adjustable speech
  speed; uses content from the other modules.
- **Speaking / oral exam prep**: a **self-introduction builder (じこしょうかい)**: the user fills in name, country,
  university, major and hobbies, and it builds a correct Japanese self-introduction with furigana and audio. Plus
  **Q&A practice**: common A1 oral-exam questions (おなまえは？ おしごとは？ しゅみは？ …), shown or spoken one at a
  time; the user answers out loud, then reveals a model answer. Optional **voice recording** to listen back
  (stored locally only).
- **Stats**: daily streak, due today, time studied, accuracy per module, progress per lesson, kana/kanji heatmaps
  red→green, weakest-items drill, daily goal with progress ring, exam countdown with suggestions.
- **Design**: premium, calm, Japanese-inspired (washi paper, sumi ink, one indigo accent, vermilion seal as brand),
  Noto Sans JP / Noto Serif JP, light + dark mode (system + toggle), subtle animations, fully responsive, nav
  Home / Study / Review / Stats / Settings, keyboard shortcuts (Enter, 1–6, Space = audio, ? = hint, Esc), furigana
  toggle.
- **Settings**: romaji leniency, sound, voice speed, meaning language, session length, daily goal, exam date, theme,
  reset per module.
- **Quality**: tests for SRS, romaji checker and romaji→kana converter. Before finishing: run the app, click
  through every screen and module, fix bugs, check a mobile viewport.
- **Deployment**: free on **GitHub Pages via GitHub Actions** (every push deploys). **README**: run locally, how
  deployment works, how to add a vocab list (CSV format + example), step-by-step guide for adding a module.

## 3. Status

Second session (11 Oct 2026, cloud): Listening, Speaking, production build/offline, full QA, README and the Pages
workflow are done. The app is feature-complete per the spec; what is left is deployment and the user's own content.

### Done ✅

- **Stack**: Vite 8, React 19, TypeScript 6, `idb`, `vite-plugin-pwa`, Vitest. Fonts via `@fontsource-variable`.
- **Core** (`src/core`): module contract `types.ts`, SM-2 SRS `srs.ts`, store, IndexedDB `db.ts`, session builder,
  stats, backup (merge import, includes the self-introduction), private-pack unlock, hooks.
- **Libraries** (`src/lib`): romaji ⇄ kana + checker, `phraseRomaji` (konbanwa, watashi wa), `katakanaName.ts`
  (German-style romaji → katakana for names/places, with exceptions), furigana, CSV, speech (queue with line callback,
  slow replay, iOS priming, `useSpeaking`), router, dates.
- **Modules** (`src/modules/index.ts`): hiragana, katakana, vocab, kanji, grammar, numbers, **listening**, **speaking**.
  - Listening: dictation, word meaning, *Hear the difference* (`soundAlikes.ts`: long vowels, っ, dakuten, small ゃゅょ,
    ん), sentence meaning, sentence dictation (は/わ, へ/え, を/お both accepted); filters by source and lesson; voice
    speed banner.
  - Speaking: self-introduction tool (form → じこしょうかい with furigana, DE/EN, play all with line highlight, slow,
    practise mode, copy, recording; saved as `profile` in kv), 32 oral exam questions in 4 topics (`questions.ts`, model
    answers from the profile with an example person as fallback, real clock for time/date), exercises *Exam questions*,
    *Listen & answer*, *Your introduction*; *Question list* tool. `Recorder` component (MediaRecorder → blobs, R key).
- **Production**: precache = app + the Noto JP font subsets the built-in text needs (`scripts/font-subsets.mjs`,
  ~3.7 MB, 125 entries); verified offline reload, fonts offline, installable manifest, course-pack unlock in the
  production preview, no private content in `dist/`.
- **QA**: every screen, module, exercise and tool clicked through at 1280 / 768 / 375 / 320 px, light and dark – no
  overflow, no console errors. Fixes included a `.hero` class clash (kana prompts off-centre on desktop), sheets
  rendered off-screen (now a portal), mobile grade buttons, hint duplication, ruby/line breaking.
- **Tests**: 160+ unit tests (SRS, romaji, CSV, furigana, numbers, grammar parser, sound-alikes, katakana names,
  speaking intro/questions). `README.md` and `.github/workflows/deploy.yml` written.

- **Sync between devices** (third session): `core/sync.ts` (engine: connect, run, background triggers, status),
  `core/syncMerge.ts` (pure merge rules: newest card wins, per-device day logs, stamps for settings/lists/profile,
  module reset tombstones), `core/github.ts` (contents API client), `lib/crypto.ts` (PBKDF2 + AES-GCM + gzip). The store
  keeps `ownDays` (IndexedDB "days") + `remoteDays` (kv) and shows their sum. UI: `screens/SyncSettings.tsx`, sidebar
  status. Tested with unit tests (two simulated devices, conflicts, wrong password) and a two-browser e2e against a fake
  GitHub API. Needs a private repo + fine-grained token (Contents: read & write) from the user – see README.

### To do 🔧

1. **Deploy**: merge the work branch into `main`. The repo is **private** – GitHub Pages needs GitHub Pro for private
   repos; otherwise make it public (safe: `private/` and the passphrase were never committed). Then Settings → Pages →
   Source: GitHub Actions. Site: https://cyber069-w.github.io/Japanese-app/
2. On the phone: open the site, add to home screen, Settings → Course pack → passphrase.

### Later – the user will supply these ⏳

- **Minna no Nihongo vocab lessons 6–10**: the user adds these themselves later. Only lessons 0 (intro) to 5 are
  transcribed now. Format: CSV via the Import tool, or new CSVs in `private/vocab/` + `npm run pack`.
- **Grammar rules**: the user will provide their own later. The current lessons 1–10 data was written by the
  previous session. Reconcile it with theirs when it arrives.
- **Kanji list** (optional): the user can paste their course list into Kanji → My kanji list. Kanji outside the N5
  list only have English meanings. Add German ones in `N5_DE` in `scripts/build-kanji.mjs` and rebuild
  (needs KANJIDIC2 + JMdict from edrdg.org and KanjiVG for strokes).

## 4. Private, copyrighted content 🔒 – rules

The user explicitly asked that the **Tofugu pictures and the Minna no Nihongo vocab are never public**.

- Raw files live in **`private/`, which is git-ignored and not in the repo**: `private/vocab/*.csv`, 46 pictures in
  `private/hints/hiragana/<id>.jpg` (ids = romaji: a, ka, shi, tsu, wo, n …), `private/PASSPHRASE.txt`.
- **`public/pack.enc`** holds the same content, encrypted with AES-256-GCM (PBKDF2 key). It is in the repo and is safe to
  deploy. The deployed app asks for the passphrase once per device (Settings → Course pack).
- **To get the pictures and vocab in a new environment**, ask the user for the passphrase (it's in
  `private/PASSPHRASE.txt` on their Mac) and run `PACK_PASSPHRASE='…' npm run unpack`. That recreates `private/`.
  **Never commit or print the passphrase.**
- The dev server bundles `private/` automatically (virtual module `virtual:private-pack`, see `vite.config.ts`).
  Production builds never do, unless `VITE_BUNDLE_PRIVATE=1`. After changing anything in `private/`, run
  `npm run pack` again.
- **Mnemonic texts are my own wording.** Never copy Tofugu's "how to remember" text.

## 5. Commands

```bash
npm ci                               # Node ≥ 22.12
npm run dev                          # http://localhost:5173 (bundles private/ if present)
npm test                             # unit tests (vitest)
npm run typecheck
npm run build && npm run preview     # production build, no private content
npm run pack                         # private/ → public/pack.enc
PACK_PASSPHRASE='…' npm run unpack   # public/pack.enc → private/
```

## 6. Code map

```
src/core/       types.ts (module contract: StudyModule, Exercise, Question, Answer, Hint), srs.ts, store.ts, db.ts,
                session.ts, sessionConfig.ts, stats.ts, backup.ts, privatePack.ts, hooks.ts
src/lib/        romaji.ts, katakanaName.ts, furigana.ts, csv.ts, speech.ts, router.ts, date.ts
src/components/ answers.tsx, HintPanel.tsx, Strokes.tsx (stroke animation + DrawPad), Recorder, Ruby, Sheet, Icon, ProgressRing
src/screens/    Home, Study, ModuleScreen (+ToolScreen), Session, Review, Stats, Settings
src/modules/    kana/ hiragana/ katakana/ vocab/ grammar/ numbers/ kanji/ listening/ speaking/  → index.ts registry
src/styles/     tokens.css (light/dark design tokens), base.css, components.css
src/data/       strokes.json (KanjiVG, generated)
scripts/        build-pack.mjs, unpack-pack.mjs, pack-lib.mjs, font-subsets.mjs, build-kanji.mjs, build-strokes.mjs, make-icons.swift (macOS)
.github/        workflows/deploy.yml (test + build on every push, deploy main to Pages)
```

**Adding a module**: create `src/modules/<name>/index.ts(x)` that exports a `StudyModule`, with `exercises`
(each has `items(ctx)` and `question(item, ctx)` returning a `Question`) and optionally `groups`, `presets`,
`tools` and `chart`. Then add it to `MODULES` in `src/modules/index.ts`. Card ids are `module:exercise:item`.

Licences: KanjiVG (CC BY-SA 3.0); KANJIDIC2 and JMdict (EDRDG, CC BY-SA 4.0). Both are credited in Settings → About.
