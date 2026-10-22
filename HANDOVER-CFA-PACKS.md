# Handover – CFA study packs and lesson window (and project state), updated 22 Oct 2026

For a **new chat / account** that continues this work. Read this file, then `todo-next/README.md` (rule: if you cannot deliver
the quality asked, stop and ask the user about switching model / effort / splitting the task), `FEATURES.md` and `TODO.md`.
No secrets are in this file. Never print or commit anything from `private/`.

## 1 · The task in one paragraph

The user (German-speaking HSG student, prepares CFA Level I) received **"CFA Program Level I – Complete Lesson Guide"** by FreeFellow
(105 lessons, 10 topics, 1,030 pages, text © FreeFellow – the user got it from the owner). Goal: turn the lessons into **study packs**
for the app (key terms, formulas, exam-style questions, worked examples) so they can be drilled with the shared SRS engine, and
prepare the material for an AI tutor later (when the user has API credits – see `docs/CFA-TUTOR.md`).

## 2 · Rules (do not break)

- **Lesson content stays private.** It lives only in `private/cfa/` (git-ignored) and, once imported, on the user's own devices
  (synced through their *private* GitHub sync repo, encrypted). **Never** put lesson text or packs into `src/`, `public/`,
  commits, PRs, or the deployed site. `git ls-files | grep private/` must stay empty.
  Exceptions (user's decisions, 21 Oct): the lesson **PDFs** (`public/cfa-pdf/`) and the **lesson packs** (`public/cfa-lessons/`) ship
  *encrypted* with the course-pack passphrase (see section 7). Never in readable form; the passphrase is never printed or committed.
- Pack text: original questions, paraphrased explanations; short numbers/definitions from the lesson are fine for private study use. Do not paste long passages.
- UI text English; the packs are English (CFA exam language). Unknown = "–"; never invent facts – if the lesson text is garbled, say so.
- One finished piece → commit + push `nihongo-update`, fast-forward `main` (deploys via GitHub Actions). The user is on **Sonnet, medium effort**.

## 3 · What exists

| Item | Where |
|---|---|
| Source PDF (user's file) | `~/Desktop/cfa-level1-lessons.pdf` (not in repo) |
| Extracted text | `private/cfa/lessons.txt` (2.47 M characters, `=====PAGE n=====` markers) |
| Lesson manifest (105 lessons: topic, module no., title, pages) | `private/cfa/manifest.json` |
| Per-lesson `.txt` and `.pdf` | `private/cfa/lessons/<topic>/NN-title.{txt,pdf}` (avg 23 k characters ≈ 6 k tokens, max 40 k) |
| **Finished packs: Quantitative Methods, all 12 lessons** | `private/cfa/packs/quant-01.json … quant-12.json`, combined `quant-all.json`, copy at `~/Desktop/cfa-quant-packs.json` |
| Guided lessons, German texts, page notes (source of truth) | `private/cfa/learn/quant-NN.json` |
| Original PDFs with watermark (backup) | `private/cfa/lessons-original-pdf/` |
| Scripts to rebuild everything | `scripts/cfa/pdftext.swift`, `build-manifest.py`, `split.swift`, `combine-packs.py`, `merge-learn.py`, `remove-watermark.py`, `build-pdfs.mjs`, `build-lessons.mjs` |
| Shipped, encrypted (in the repo) | `public/cfa-pdf/` (105 PDFs), `public/cfa-lessons/` (lesson packs) |
| Validation test | `src/modules/cfa/privatePacks.test.ts` (checks `private/cfa/packs/quant-all.json` with the app's importer; skipped if the file is absent) |
| Tutor setup + prompts (no lesson content) | `docs/CFA-TUTOR.md` |

Status (22 Oct): Quant packs + guided lessons (EN + DE) + page notes for every PDF page + plain word meanings for all 12 lessons are live (they ship encrypted, no import needed).
The user uses them on Mac/iPad (Apple look, often dark mode). Economics was started and put on hold by the user.

### Counts per topic (lessons in the manifest)
quant 12 (done) · economics 8 · corporate 7 · fsa 12 · equities 13 · fixed-income 19 · derivatives 10 · alternatives 7 · portfolio 6 · ethics 11.

## 4 · How to make one pack (the workflow that was used)

1. `Read` `private/cfa/lessons/<topic>/NN-*.txt`. The first ~30 lines are often the *end of the previous lesson* (page overlap) – ignore.
   PDF-to-text mangles formulas and tables (symbols scattered over lines). Rebuild formulas from context + standard CFA knowledge; **recompute
   every number** you put into a question/example. Titles of a few manifest entries are wrong (quant 5 and 10; check the others) – use the TOC
   (`lessons.txt` pages 2–6) or the lesson's first heading.
2. Write `private/cfa/packs/<topic>-NN.json` in the app's schema (`src/modules/cfa/lessons.ts`, `LESSON_PROMPT`):
   ```json
   { "topic": "quant", "module": 1, "title": "…",
     "terms":    [{ "term": "…", "definition": "short, exam-relevant" }],
     "formulas": [{ "name": "…", "formula": "plain text", "note": "when to use" }],
     "questions":[{ "q": "…", "options": ["A","B","C"], "answer": 1, "explain": "…" }],
     "examples": [{ "title": "…", "problem": "…", "solution": "step by step with numbers" }] }
   ```
   `topic` ∈ quant, economics, corporate, fsa, equities, fixed-income, derivatives, alternatives, portfolio, ethics. `module` = order inside the topic.
3. Quality bar used: 8–16 terms, every formula of the lesson, **9–14 questions with exactly three distinct options** (CFA style, include the lesson's typical
   traps as wrong options), 2–4 worked examples with the lesson's numbers. Explanations name the trap. Mix of calculation and concept questions.
4. After all packs of a topic: `python3 scripts/cfa/combine-packs.py <topic>` (shuffles option positions – drafts put the right answer on B ~58 % of the time –
   and writes `<topic>-all.json`). Then adapt `privatePacks.test.ts` (file name / lesson count) and run `npm test`.
5. Copy `<topic>-all.json` to the Desktop for the user. Import in the app: **CFA → Import lesson → choose file** (supports an array / `{lessons:[…]}`; same topic + module replaces the old version).
6. Tick the line in `todo-next/FEATURE-QUEUE.md`, commit (without anything from `private/`), push.

## 5 · Next steps (in this order)

**Focus now (user, 21 Oct): perfect the Quant lessons; they become the template for the other topics. Economics is ON HOLD – do not start
other topics until the user asks.**

**Done 22 Oct:** German guided lessons for all 12 Quant lessons · page notes on **every page** of all 12 Quant PDFs (842 notes, all quotes
found, none unplaced in the browser) · plain-language meanings (`term.plain`) for all 149 Quant pack terms in "New words".
**User's decision (22 Oct): German is not needed any more** – exam questions are answered in English. Don't write new German texts
(notes for quant 4–10 and 12 are English only; the DE switch falls back to English). Existing German stays.

1. Ask how the lesson window feels on the iPad (Original · Annotated · Guided, Explain, share sheet) – nothing was tested on a real device yet.
   Ask whether the notes are too many/too few per page (6–11 per page now, incl. answers to the PDF's "Check yourself" questions).
2. When the user has API credits: answer "Explain" / "Ask tutor" inside the app (`Explain.tsx`, `lib/tutor.ts`). Their rule: keys only in `private/`.
3. Later (only when the user asks): other topics (Economics 8, Corporate 7, FSA 12, Equities 13, Fixed Income 19, Derivatives 10, Alternatives 7,
   Portfolio 6, Ethics 11) – packs (section 4) + guided lessons + notes + `plain` meanings, in the Quant format, English only.
   Ethics: vignette-style questions.

## 6 · Project state (short)

Branch `nihongo-update` is merged into `main` (GitHub Pages deploy by Actions; user still has to confirm Actions/Pages are green).
Built since the first handover: Today hub, connections/history, OneNote PDF notes, targets + weekly report, exam mode, Azure pronunciation,
glass/Apple looks, shutdown, applications, interview prep, reading list + news, clubs, encrypted finance, quick capture, sync of the new stores,
Mac-job extras (exam dates, Claude drafts and overnight grading – off by default). Details: `FEATURES.md`, `todo-next/FEATURE-QUEUE.md`,
test list for the user: `TEST-CHECKLIST.md`.

Environment: Node in `~/.local/node/bin` (`export PATH=$HOME/.local/node/bin:$PATH`), `npm test` (300 tests), `npm run build`, dev server `npm run dev`
(port 5173; start it in the user's terminal or from the app folder, not from the parent folder). macOS has `swift` (PDFKit) – no poppler/pdftotext here.
Not verified on real devices: microphone flows, Apple Calendar import, iA Writer path, GitHub sync, `claude -p` jobs (no `claude` on the Mac's PATH).

Open decisions for the user: Monkeytype ApeKey (H2), Outlook key (calendar sync), weekly-plan day window, Canvas rules review (BWL handouts),
API-key policy for an in-app tutor.

## 7 · The lesson window (built 21 Oct) – how it works

Topic page `#/c/cfa/t/<topic>` lists the lessons; a row opens `#/learn/<lesson id>` (`src/modules/cfa/Learn.tsx`, `LearnScreen`).
Header: tabs **Original · Annotated · Guided** (Original first and default), one small **EN | DE** switch (for Guided and the notes; hidden on
Original), quiet **Practise** button (selects this lesson in the CFA drills). Language and last tab are remembered per device (localStorage).

**Original** – `LessonPdf.tsx` + `PdfViewer.tsx` (pdf.js): zoom, Save, Full screen (pages on neutral grey; Esc closes).

**Annotated** – `AnnotatedPdf.tsx`: every page with a pdf.js text layer (selectable text, CSS copied/trimmed from pdf_viewer.css).
- Notes = `learn.annotations` `[{page, quote, kind: word|plain|formula|trap, title, note, de: {title, note}}]`, placed by finding `quote`
  in the page text (`annotate.ts`, spaces/case ignored; highlight boxes in % of the page). Page stays clean: **no permanent markers, no
  numbers, one neutral note style** (user's wish); tapping a note lights its passage up in soft blue for ~2.6 s. "Notes (n) / Hide notes"
  hides the whole column (remembered). Only lessons with notes show that button.
- Writing notes: own wording, 6–11 per page, `de` optional. Each PDF's first page often starts with the end of the previous lesson –
  one note says so; answers to the PDF's "Check yourself" questions ("Answer on this lesson's page") are notes too (recomputed).
  Check quotes the way the app does: pdf.js `getTextContent()` per page, join the items, drop all whitespace, lowercase, `indexOf`.
  Quotes must come from prose (formula pieces are scattered at the end of a page's text). Helper scripts used on 22 Oct (paths inside
  point to that session's scratchpad – adjust): `~/Library/Application Support/Claude/side-session-notes/local_132d5d51-…/cfa-note-tools/`.
- Mark text → "Explain" bar (portal to body; keeps the text while tapped – iPad clears selections on tap). "Mark area" → drag a box →
  image + the page text inside the box. `Explain.tsx`: matching lesson words/notes at once (offline), else "Ask tutor" (prompt with the
  page text) / "Send image to tutor" (Web Share → Claude app; fallback copies the image).
- Page width: **the same 696px in Original and Annotated** (`--lesson-page`); notes beside it only if there is room (container query
  ≥ 1034px), else below. User complained when the sizes differed – keep them equal.

**Guided** – the `learn` part of a pack: steps with **New words** (glossary words a step uses for the first time; style: blue chips on a
grey box with a thin line across between the words – the user tried a plain list and preferred this one), Explanation, Example, Remember, Exam trap, Quick check, "Ask tutor about
this step" (and about a word in the word sheet). Slim progress line "n / total". Step position is saved per device (localStorage).
- Format: `{ intro, words: [{term, definition, de}], sections: [{title, text, example?, remember?, trap?, check, de?: {title, text, example,
  remember, trap, check}}], summary, de?: {intro, summary}, annotations? }`. In texts `[[word]]` / `[[shown|glossary term]]` = tappable word.
  German: explanations in German, exam terms stay English. In DE mode the app itself adds the German word after every `[[word]]`
  that has a `de` – don't add your own "(German)" brackets after it (shows twice). Untranslated steps say so.
- All 12 quant lessons have a guided version in EN and DE.
- **New words / word sheet** show `term.plain` (a beginner meaning) when it exists, else `definition`; the sheet shows the exam
  `definition` small underneath. Drill cards and quizzes keep using `definition`. `plain` is optional in the pack format.

**Where the lessons come from (no import):** source of truth `private/cfa/learn/<topic>-NN.json` (`{learn, de: {term: German},
plain: {term: plain meaning}}`) →
`python3 scripts/cfa/merge-learn.py quant` (into `private/cfa/packs/`, no reshuffling) → `node scripts/cfa/build-lessons.mjs`
(encrypted `public/cfa-lessons/<topic>.enc` + `index.json` version) → commit + push. Devices load them at start-up, after every sync and
when a CFA page opens (`lessonPacks.ts`: keeps the decrypted packs per version, repairs any older copy, e.g. written back by sync).
A device without the key shows an unlock field on the topic page (wrong passphrase is checked and never stored).

**PDFs:** `node scripts/cfa/build-pdfs.mjs` encrypts `private/cfa/lessons/<topic>/NN-*.pdf` into `public/cfa-pdf/` (keeps the salt; a new
`version` makes devices re-download once). Watermark removed with `scripts/cfa/remove-watermark.py` (pypdf in a virtualenv;
originals kept in `private/cfa/lessons-original-pdf/`; user has the owner's permission).

**Tests:** `privatePacks.test.ts` (all quant lessons have a guided version, every `[[word]]` resolves in EN and DE texts, every term
has `plain`), `lessons.test.ts` (format, merge, quote finding, word matching). 300 tests.

**Testing tips (browser pane):** pdf.js only draws while the pane is visible – a hidden pane makes "Loading…" hang (call show_pane first).
The pane has no course-pack key; never type the passphrase. Instead, in the console: load `/private/cfa/packs/quant-all.json` (the dev
server serves it locally), `parseCfaLessons` + `setCfaLessons(mergeShipped(…))`; for PDFs put the plain `private/cfa/lessons/quant/NN-*.pdf`
into `storage.setBlob('cfa-pdf:<version from cfa-pdf/index.json>:quant-<n>', blob)` – `getPdf` then uses it without a key.
Long checks: start them without awaiting and read the result later (the console call times out after 45 s).
After code edits, `import('/src/…')` in the console may give a different module instance than the app's; use `storage` from
`/src/core/db.ts` or reload. Screenshots of an emulated 1180px viewport are scaled down – check sizes with JS instead.

FreeFellow's module numbers are **alphabetical**, not curriculum order (TVM = 10, Types of returns = 11). Not changed – it would change ids.
Suggested study order for the user: 11, 10, 12, 6, 8, 9, 5, 7, 3, 1, 2, 4.
