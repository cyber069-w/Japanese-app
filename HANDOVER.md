# Handover – Nihongo study app (read this first)

Written 11 Oct 2026 at the end of the first build session, for a **new chat that has none of the previous context**.
Everything you need is in this file and the code. Continue where the previous session stopped and finish the app.

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

### Done ✅

- **Stack**: Vite 8, React 19, TypeScript 6, `idb`, `vite-plugin-pwa`, Vitest. Fonts via `@fontsource-variable`.
- **Core** (`src/core`): module contract `types.ts`, SM-2 SRS `srs.ts` (tested), store, IndexedDB `db.ts`, session
  builder `session.ts` (due → new → weak; wrong answers re-queued 3 cards later, max twice), stats, backup
  (merge import), private-pack unlock, hooks.
- **Libraries** (`src/lib`): `romaji.ts` (IME converter + Hepburn + checker with strict/normal/lenient, tested),
  `furigana.ts` (kanji/reading alignment), `csv.ts` (comma/semicolon/tab), `speech.ts` (best ja-JP voice), hash router.
- **Screens**: Home, Study, Module page (group picker + presets, exercises, tools), Session (typing / choice /
  ordering / drawing / flashcards, hints, requeue, finish screen with "practise mistakes"), Review, Stats, Settings
  (incl. course-pack unlock, backup, reset, about/licences).
- **Modules registered** in `src/modules/index.ts`: hiragana, katakana, vocab, kanji, grammar, numbers.
  - Kana (`kana/createKanaModule.tsx` factory): read, recall (MC with look-alike distractors), words, writing,
    look-alikes (katakana), kana chart tool. Hints = my own keyword/text (`hiragana/mnemonics.json`,
    `katakana/mnemonics.json`) + Tofugu picture (hiragana). "Ausnahme" flags on し ち つ ふ (the user's own
    marks in the PDF). **Browser-tested.**
  - Vocab: meaning MC, type in kana, choose Japanese, flashcards; Word list and Import tools. **Browser-tested.**
  - Grammar: 55 points for lessons 1–10 (`grammar/data/*.json`, notation documented in `grammar/sentence.ts`),
    37 form drills; cards / particles / build sentence (**tested**) / forms / translate; Grammar notes tool.
  - Numbers: 23 categories, read/write/listen, Rules & tables tool (**tested**). Readings tested.
  - Kanji: 103 N5 kanji (German meanings) out of 335 in `kanji/kanji.json` (built by `scripts/build-kanji.mjs` from
    KANJIDIC2 + JMdict, example words verified), 4 exercises, browser and "My kanji list" tools. **Not browser-tested yet.**
- **61 unit tests pass**, typecheck clean. PWA manifest, icons and workbox config are in `vite.config.ts`.

### To do (in this order) 🔧

1. **Listening module**: a draft exists at `src/modules/listening/index.tsx` (dictation, hear→meaning, sentences).
   Review it, **register it** in `src/modules/index.ts` and test it. Session prompts with `speakWhen: 'prompt'`
   auto-play and Space replays; voice speed comes from Settings.
2. **Speaking module** (`src/modules/speaking/`), per the spec above:
   - Tool "Self-introduction": form (name in romaji → katakana suggestion, editable; country from a list with
     katakana/kanji, e.g. ドイツ, スイス, オーストリア; university (free text, live romaji→katakana); major from a list:
     けいざいがく, けいえいがく, ほうがく …; year of study ～年生; age optional; hobbies multi-select). Output lines
     with furigana + German translation: はじめまして。／わたしは〜です。／〜から来ました。／〜大学の学生です。／
     専攻は〜です。／趣味は〜と〜です。／どうぞよろしくお願いします。 Add audio of the whole text and save the
     form in IndexedDB (`kv`).
   - Exercise "Oral exam questions": `reveal` answers with model answers built from the saved intro (お名前は？,
     お国はどちらですか, 学生ですか, 専攻は何ですか, 何歳ですか, 趣味は何ですか, 毎朝何時に起きますか,
     きのう何をしましたか, 何で大学へ来ますか, 日本語はどうですか, どんな食べ物が好きですか, 誕生日はいつですか …),
     with TTS of the question (`speakWhen: 'prompt'`).
   - Recording: a `Recorder` component (MediaRecorder → `storage.setBlob('rec:<id>')`, playback via object URL),
     shown in `RevealAnswer` when `answer.record` is set (the field already exists in `core/types.ts`).
3. **Production build + offline**: `npm run build && npm run preview`. Check the service worker, offline use,
   installability and runtime font caching.
4. **Full QA click-through**: every screen and module at desktop and **375 px phone width**, light + dark mode.
   Especially test the Kanji module, the writing pad (draw → check → grade) and the course-pack unlock in a
   production preview (see §4). Fix bugs.
5. **README.md** per the spec (CSV format `kana,kanji,de,en,lesson,tags` with an example; "add a module" guide
   based on `core/types.ts` → `StudyModule` and `src/modules/index.ts`).
6. **`.github/workflows/deploy.yml`** for GitHub Pages (`npm ci` → `npm test` → `npm run build` → upload `dist`,
   deploy-pages). `base: './'` and the hash router already work on Pages.
7. **Deploy**: the user will give access to their GitHub account **when the project is finished**. The repo
   should be private if their plan allows; the Pages site is public, which is fine because only the encrypted pack
   ships. Then: install on phone → Settings → Course pack → passphrase.

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
npm test                             # 61 unit tests (vitest)
npm run typecheck
npm run build && npm run preview     # production build, no private content
npm run pack                         # private/ → public/pack.enc
PACK_PASSPHRASE='…' npm run unpack   # public/pack.enc → private/
```

## 6. Code map

```
src/core/       types.ts (module contract: StudyModule, Exercise, Question, Answer, Hint), srs.ts, store.ts, db.ts,
                session.ts, sessionConfig.ts, stats.ts, backup.ts, privatePack.ts, hooks.ts
src/lib/        romaji.ts, furigana.ts, csv.ts, speech.ts, router.ts, date.ts
src/components/ answers.tsx, HintPanel.tsx, Strokes.tsx (stroke animation + DrawPad), Ruby, Sheet, Icon, ProgressRing
src/screens/    Home, Study, ModuleScreen (+ToolScreen), Session, Review, Stats, Settings
src/modules/    kana/ hiragana/ katakana/ vocab/ grammar/ numbers/ kanji/ listening/ (draft)  → index.ts registry
src/styles/     tokens.css (light/dark design tokens), base.css, components.css
src/data/       strokes.json (KanjiVG, generated)
scripts/        build-pack.mjs, unpack-pack.mjs, pack-lib.mjs, build-kanji.mjs, build-strokes.mjs, make-icons.swift (macOS)
```

**Adding a module**: create `src/modules/<name>/index.ts(x)` that exports a `StudyModule`, with `exercises`
(each has `items(ctx)` and `question(item, ctx)` returning a `Question`) and optionally `groups`, `presets`,
`tools` and `chart`. Then add it to `MODULES` in `src/modules/index.ts`. Card ids are `module:exercise:item`.

Licences: KanjiVG (CC BY-SA 3.0); KANJIDIC2 and JMdict (EDRDG, CC BY-SA 4.0). Both are credited in Settings → About.
