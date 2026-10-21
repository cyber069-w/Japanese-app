# Handover – CFA study packs (and project state), 21 Oct 2026

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
  Exception (user's decision, 21 Oct): the lesson **PDFs** may ship *encrypted* in `public/cfa-pdf/` (see section 7). Packs and lesson text still never.
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
| Scripts to rebuild everything | `scripts/cfa/pdftext.swift`, `build-manifest.py`, `split.swift`, `combine-packs.py` |
| Validation test | `src/modules/cfa/privatePacks.test.ts` (checks `private/cfa/packs/quant-all.json` with the app's importer; skipped if the file is absent) |
| Tutor setup + prompts (no lesson content) | `docs/CFA-TUTOR.md` |

Status: Quant packs are **written, validated by the importer (0 errors), not yet imported or reviewed by the user**. The user said
they will import and check them first, then decide whether to continue with Economics.

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

1. Ask the user how the Quant import went; fix what they report (formula doubts are likely in lessons 1, 5, 9, 10).
2. If they want more: **Economics (8)**, then Corporate Issuers, FSA, Equities, Fixed Income (19 – largest), Derivatives, Alternatives, Portfolio, Ethics.
   Ethics is text-heavy (cases, Standards I–VII) – questions should be vignette style; use more questions per lesson.
   Work 3–4 lessons per batch and report each batch. A lesson costs ≈ 10–20 k tokens to read and ≈ 5 k to write.
3. Optional later: put the lesson texts on the user's devices for the API tutor (encrypted push to the sync repo like `scripts/canvas/push-inbox.mjs`),
   in-app lesson reader, per-lesson "Ask tutor" using `docs/CFA-TUTOR.md` prompts. Needs the user's decision on API keys (their rule: secrets only in `private/` on the Mac).

## 6 · Project state (short)

Branch `nihongo-update` is merged into `main` (GitHub Pages deploy by Actions; user still has to confirm Actions/Pages are green).
Built since the first handover: Today hub, connections/history, OneNote PDF notes, targets + weekly report, exam mode, Azure pronunciation,
glass/Apple looks, shutdown, applications, interview prep, reading list + news, clubs, encrypted finance, quick capture, sync of the new stores,
Mac-job extras (exam dates, Claude drafts and overnight grading – off by default). Details: `FEATURES.md`, `todo-next/FEATURE-QUEUE.md`,
test list for the user: `TEST-CHECKLIST.md`.

Environment: Node in `~/.local/node/bin` (`export PATH=$HOME/.local/node/bin:$PATH`), `npm test` (≈ 290 tests), `npm run build`, dev server `npm run dev`
(port 5173; start it in the user's terminal or from the app folder, not from the parent folder). macOS has `swift` (PDFKit) – no poppler/pdftotext here.
Not verified on real devices: microphone flows, Apple Calendar import, iA Writer path, GitHub sync, `claude -p` jobs (no `claude` on the Mac's PATH).

Open decisions for the user: Monkeytype ApeKey (H2), Outlook key (calendar sync), weekly-plan day window, Canvas rules review (BWL handouts),
API-key policy for an in-app tutor.

## 7 · Guided lessons and lesson PDFs (21 Oct, later session)

The user found the drill-only packs hard ("I don't know most of the words") and asked for two ways to learn each lesson:
- **Learn** (guided): optional `learn` field in a pack – `{ intro, words: [{term, definition, de}], sections: [{title, text, example?, remember?, trap?, check: {q, options, answer, explain}}], summary: [] }`.
  In texts, `[[word]]` or `[[shown text|glossary term]]` makes a tappable word (looked up in `terms` + `learn.words`). Terms and words may have `de`
  (German translation first, then ": short note") – only shown with the small **DE** switch (user's wish: German must stay discreet; exam is English).
  Plain English for a beginner, one idea per step, every number recomputed. Screen: `src/modules/cfa/Learn.tsx`, route `#/learn/<lesson id>`.
  `privatePacks.test.ts` checks every `[[word]]` resolves and every step has a check question.
  **Status: all 12 quant lessons have a guided version** (user approved the style of the quant 11 sample). Source of truth:
  `private/cfa/learn/<topic>-NN.json` (`{learn, de: {term: German}}`); `python3 scripts/cfa/merge-learn.py <topic>` puts them into the packs
  and rebuilds `<topic>-all.json` without reshuffling. Next topic: write its packs first (section 4), then its guided lessons.
- **PDF**: all 105 lesson PDFs ship encrypted in `public/cfa-pdf/<topic>-<module>.enc` (+ `index.json` with the shared salt), made by
  `node scripts/cfa/build-pdfs.mjs` with the course-pack passphrase (user's choice, 21 Oct: encrypted on the site is OK, like `pack.enc`).
  The app derives the key once per device (Settings → Course pack unlock, or the passphrase field in the PDF view), keeps it in IndexedDB,
  downloads a PDF the first time it is opened and keeps it offline (`pdfs.ts`, `PdfViewer.tsx` with pdf.js). Not precached.
- CFA topic pages (`#/c/cfa/t/<topic>`) list the imported lessons; a row opens the lesson window `#/learn/<id>` with two tabs, Guided lesson / Original PDF, plus Practise (user's wish: one quick link, both versions inside).
- Note: FreeFellow's module numbers are **alphabetical**, not the curriculum order (e.g. TVM is 10, Types of returns 11). Not changed – it would change lesson ids.
