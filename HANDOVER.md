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
workflow are done. Third: sync between devices; deployed to https://cyber069-w.github.io/Japanese-app/ (repo now
public). Fourth: the app became a multi-course study platform (see "Study platform" below) – the rest of the user's
platform plan is in the to-do list.

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

- **Study platform** (fourth session): the app is now multi-course. `src/courses/<id>/course.json` (auto-loaded by
  `src/courses/index.ts`): Japanese (all 8 modules; Study → Alphabets / Vocabulary / Grammar / Numbers & time, Exam
  Preparation → Listening & speaking + mock exams placeholder; **Kanji is "coming later"** – progress kept, never due),
  CFA Level 1 (10 topics of the 2027 curriculum, 102 empty learning modules, exam-prep placeholders), BWL and Recht
  (empty shells). Every course page has the five areas Study · Practice & Review · Exam Preparation · Imports · Tutor
  (Imports and Tutor are placeholders). Course switcher + **preparation meter** (`core/meter.ts`, formula in README) at
  the top of Home, Study and Stats (`components/CourseBar.tsx`); Home shows due per course + combined and all courses;
  Review can filter by course once more than one course has content; Stats shows the current course. The current
  course is a device-only setting (`settings.course`, not synced). Content written by an earlier Claude session is
  labelled **unverified** (module banner + tags; marked in course.json). `modules/ids.test.ts` freezes every module and
  exercise id. **No saved progress changed** – courses only arrange existing module ids.

### Next task (small, user is low on credits – keep it focused, Sonnet medium) ▶

**Romaji import + colour-coded syllables.** The user's Quizlet sets only have *romaji ⇥ German*.
1. Import (`src/lib/csv.ts` `HEADER_ALIASES` + `parseVocabCsv`, `src/modules/vocab/VocabImport.tsx`): accept a `romaji`
   column (aliases: romaji, rōmaji, term) when there is no kana column and convert it with `toKana()` from
   `src/lib/romaji.ts` → hiragana; words written in CAPITALS become katakana (`KOOHII` → コーヒー). Before converting,
   turn macrons into typed vowels (ā→aa, ī→ii, ū→uu, ē→ei, ō→ou). Also accept headerless 2-column Quizlet text
   (term⇥definition): if a column looks like romaji (only a–z, spaces, ' -), treat it as romaji. Show romaji and the
   generated kana side by side in the preview so the user can check them. Keep ids `${source}-${kana}` as today.
2. Colour-coded display: a small component that splits a kana word into syllables (mora: きゃ = one, っ and ー attach
   sensibly) and shows the romaji syllables above/next to the kana, alternating two colours (e.g. red / blue, readable
   in light and dark) so each kana lines up with its romaji. Use it in the vocab word list (`WordList.tsx`) and on the
   vocab flashcard back; keep it out of questions where it would reveal the answer.
3. Unit tests for the conversion (macrons, capitals → katakana, ん before vowels: `kin'en`) and the syllable split;
   `npm test` + `npm run build`; commit and push to the work branch.

### To do 🔧 – outstanding features and fixes (in the user's priority order)

1. **Visual overhaul (user's top wish).** The user finds the current look plain/cheap and the **symbols low quality**.
   - Replace the hand-drawn line icons (`components/Icon.tsx`) and the single-character "glyph" tiles (module cards,
     course seals Σ / B / §, CFA topic letters Q/E/C…) with a consistent, high-quality icon set (one style, one stroke
     weight, designed course and area icons). Self-hosted SVGs or a bundled set, no runtime CDN.
   - A real design system: refined palette with one accent colour per course, type scale, spacing tokens, card depth,
     subtle transitions; dark mode and phone/laptop. Start with 2 mockup directions (Home, a practice question, a
     course page) and let the user pick before rolling out. Priority screens: practice screen, Home, course page.
   - Keep the font budget (~3.7 MB Japanese subsets offline); at most one small Latin font.
2. **Tutor**: tutor instruction files (from the user's study-platform prompt appendices, copied exactly), an "Ask
   tutor" button per course that opens that course's Claude Project (`claudeProjectUrl` in course.json, or a field in
   the app) and copies a context note, plus a session-summaries list per course.
3. **Audio everywhere**: play button with a slow option on every word and example sentence (grammar card examples,
   kana word list, chapter pages), "no Japanese voice installed" message with steps per device.
4. **Quizlet**: export a chapter or selected words (term⇥definition, download + copy); import pasted Quizlet text
   (no header row, preview, adds to a chapter, never replaces a list).
5. **Goal & week**: daily goal in answers *or* minutes (free value), 7-day overview on Home, exam date per course.
6. **Imports & drafts** (needs the private repo `study-content`; the app repo is public): inbox per course for OneNote
   PDFs/photos, Claude drafts lessons, Approve / Edit / Discard in the app, source pages viewable and zoomable.
7. **CFA lessons**: notes, key terms and A/B/C questions as review cards, formulas, worked examples, formula sheet.
8. **Hiragana notes**: the user's OneNote PDFs (Tofugu pages + handwritten notes) as the first import – private only.
9. **Content**: Minna no Nihongo pages for the exam chapters (verify/replace the "unverified" grammar and speaking
   content), vocab lessons 6+, katakana material; move the Tofugu-derived memory texts out of the public code.
10. **Small fixes**: one word can count up to 4× in "due" (one per exercise) – consider counting items; Review course
   filter only appears once a second course has content; `/m/kanji/t/*` tool pages are still reachable by URL.

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
src/screens/    Home, Study (= current course), Course (CoursePage, TopicPage), ModuleScreen (+ToolScreen), Session, Review, Stats, Settings
src/courses/    japanese/ cfa/ bwl/ recht/ course.json → index.ts registry (ACTIVE_MODULES, courseModules, moduleInfo, meterSections)
src/modules/    kana/ hiragana/ katakana/ vocab/ grammar/ numbers/ kanji/ listening/ speaking/  → index.ts registry
src/styles/     tokens.css (light/dark design tokens), base.css, components.css
src/data/       strokes.json (KanjiVG, generated)
scripts/        build-pack.mjs, unpack-pack.mjs, pack-lib.mjs, font-subsets.mjs, build-kanji.mjs, build-strokes.mjs, make-icons.swift (macOS)
.github/        workflows/deploy.yml (test + build on every push, deploy main to Pages)
```

**Adding a module**: create `src/modules/<name>/index.ts(x)` that exports a `StudyModule`, with `exercises`
(each has `items(ctx)` and `question(item, ctx)` returning a `Question`) and optionally `groups`, `presets`,
`tools` and `chart`. Then add it to `MODULES` in `src/modules/index.ts` and list it in a course's `course.json`.
Card ids are `module:exercise:item` – never rename a module or exercise id (`modules/ids.test.ts` guards this).

Licences: KanjiVG (CC BY-SA 3.0); KANJIDIC2 and JMdict (EDRDG, CC BY-SA 4.0). Both are credited in Settings → About.
