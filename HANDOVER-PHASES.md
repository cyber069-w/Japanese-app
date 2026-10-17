# Handover – next phases (one chat per phase)

Written 17 Oct 2026. Every phase below is a **self-contained prompt**: open a new chat, set the model and effort
named in the phase, paste the prompt block. Do the phases in order; each one ends with commit + push to
`nihongo-update`. Background for every phase: `HANDOVER.md` (app, private content rules), `TODO.md` (open items),
`ROADMAP.md`.

## Two chats instead of six (the user's choice)

**Chat A – phases 1–3 · Opus 5.5, effort high**

```
Read HANDOVER-PHASES.md completely (shared rules, open input, phases 1, 2 and 3), TODO.md, then build
phases 1, 2 and 3 of my study app (~/Claude Code/nihongo-app, branch nihongo-update) one after the other,
exactly as described there. One bundled question round at the start (my weekly plan for the day window comes
with this message or I'll paste it), then no more questions. After each phase: npm test, npm run build,
browser check (1280 / 700 / 375 px), commit, push, tick TODO.md. Final answer max 15 lines per phase:
done / open / solved differently.
```

**Chat B – phases 4–6 · Sonnet 5.5, effort medium** (after chat A is merged into the branch)

```
Read HANDOVER-PHASES.md completely (shared rules, open input, phases 4, 5 and 6), TODO.md, then build
phases 4, 5 and 6 of my study app (~/Claude Code/nihongo-app, branch nihongo-update) one after the other,
exactly as described there. One bundled question round at the start, then no more questions. My Azure Speech
key and region are in private/azure-speech.json – never print them. After each phase: npm test, npm run build,
browser check, commit, push, tick TODO.md. Final answer max 15 lines per phase: done / open / solved differently.
```

The single-phase prompts below stay as the detailed spec both chats work from.

## Shared rules (they are repeated in every prompt)

- Read `HANDOVER-PHASES.md` (this file, your phase only), `TODO.md` and only the files you need.
- Plan in at most 10 lines, then **one** bundled question round (max 3 questions) only if something is really
  unclear – otherwise decide and list your decisions at the end.
- Nothing writes outside the app (Canvas, OneDrive, mail, calendar) unless the user presses a button.
- No made-up data: unknown = “–”. Rules, not AI, decide priorities. The app never calls an AI by itself, except
  Azure Speech in phase 6.
- UI language English, content German + romaji; no Japanese characters outside the Japanese subject (kana only
  with the “Show kana” layer). Leather design tokens in `src/styles/tokens.css`.
- Secrets (tokens, keys) only in `private/` (git-ignored) or on the device – never in chat, code or git.
- Test: `npm test`, `npm run build`, check the screens in the browser (also ~700 px and 375 px). Commit per phase,
  push to `nihongo-update`, tick the items in `TODO.md`. Final answer: max 12 lines (done / open / solved differently).
- Node: `export PATH=$HOME/.local/node/bin:$PATH`. The user runs `npm run dev` in their own terminal.

## Open input from the user (ask once if still missing)

- **Day window for “Your day”** (when study blocks may be suggested): the user brings their weekly plan into
  the phase-1 chat. Until then use the Focus day window (Settings in Focus, default 08:00–22:00).
- **Azure Speech key + region** for phase 6: the user creates them (Azure portal → Speech service, free tier F0)
  and saves them in `private/azure-speech.json` as `{ "key": "…", "region": "westeurope" }` – or enters them in
  the app's Settings. Never ask for the key in chat.

---

## Phase 1 – Today hub · **Opus 5.5, effort high**

```
Read HANDOVER-PHASES.md (shared rules + phase 1), TODO.md, then build phase 1 of my study app
(~/Claude Code/nihongo-app, branch nihongo-update).

Goal: one “Today” screen that tells me what to do now, from data the app already has – no AI, fixed rules.
Sources: due cards (core/session countDue), Canvas inbox (core/canvas.ts: deadlines, important announcements,
new files), lecture timetable (core/calendar.ts), Focus log (core/focusStore.ts: gaps, running timer),
exam dates per subject (settings.examDates).

1. Priorities list, grouped by horizon: Overdue · Next 2 hours · Today · Tomorrow · This week · When you can.
   Score = base per kind + horizon boost (overdue 40, 2 h 35, today 25, tomorrow 12, week 5). Kinds:
   accepted Canvas deadlines (base 45, +10 within 2 days), new Canvas deadline suggestions (35),
   important unseen announcements (30), due cards per subject (30, +10 if exam within 14 days),
   new lecture files to go through (“Folien Woche 6 Politik nacharbeiten”, 28, from inbox.files),
   next lecture within 2 h (30), Focus gaps today ≥ 30 min (20). Merge duplicates, top 12 + “Show all”.
   Every row: what, why (source chips), one action button (Study now / Start timer / Open in Canvas /
   Fill gap / Ask tutor for flashcards from these slides) and Dismiss → “Dismissed (n)” list with Restore,
   kept 7 days (device storage).
2. “Your day”: timeline from now to the end of the day window: lectures from the timetable, then suggested
   study blocks in free gaps ≥ 45 min (subject = highest-scoring open item), each with “Start timer” that
   starts a Focus session for that subject. The day window comes from my weekly plan (I give it to you in
   this chat) – otherwise the Focus day window.
3. “What I checked”: chips per source (Canvas, Timetable, Focus, Cards) with “n read · m to act on”,
   red if a source failed or is stale (Canvas inbox older than 36 h → “Canvas sync didn't run – is the Mac on?”).
4. Place: Home gets a “Today” section above the subject tiles (Home may now show more than tiles – my wish),
   and a nav entry “Today” is NOT added; the Focus page links to it.
Tests for the scoring/merging (pure functions in core/today.ts). Browser check at 1280, 700, 375 px.
```

## Phase 2 – Connections + history · **Sonnet 5.5, effort medium**

```
Read HANDOVER-PHASES.md (shared rules + phase 2), TODO.md, then build phase 2 of my study app
(~/Claude Code/nihongo-app, branch nihongo-update).

1. Settings → “Connections”: one row each for Canvas (inbox age, last sync from private/canvas-report.json via
   the dev server, like /canvas-inbox.json), Outlook timetable (last import date), Device sync (core/sync status),
   Azure Speech (key present yes/no). Status: Working / Stale / Not set up / Failed, each with a short how-to-fix.
2. History: every action the app does for me is logged (device storage, newest 300): Canvas deadline accepted,
   tutor prompt copied, focus entry added/edited/deleted, import done, read-aloud result. Settings → “History”:
   search, filter by kind, delete one / clear all.
3. Canvas inbox on the phone: the Mac job (scripts/canvas/canvas_sync.py) also writes the inbox into the
   device-sync repo (core/github.ts / sync.ts) as an encrypted file the app reads when the dev server isn't
   available. Only if device sync is set up; otherwise skip and say so.
```

## Phase 3 – OneNote via PDF export (way B) · **Opus 5.5, effort medium**

```
Read HANDOVER-PHASES.md (shared rules + phase 3), TODO.md, then build phase 3 of my study app
(~/Claude Code/nihongo-app, branch nihongo-update). The OneNote API is not available to me (university
account) – use the export way:

1. I export OneNote sections/pages as PDF into my OneDrive course folders
   (~/Library/CloudStorage/OneDrive-UniversitaetSt.Gallen/Universität Main Ordner/2026:27 HS/Courses/<subject>/…,
   e.g. a “Notizen” or “One Note Folien” subfolder). Extend scripts/canvas/canvas_sync.py (or a sibling script run
   by the same 7:00 launchd job) to list new PDFs in those folders that came from OneNote (by folder name
   “Notizen”/“One Note …”, configurable in private/canvas-config.json) and add them to the inbox as
   “New notes: <file> (<subject>)”.
2. In the app (Today + bell): “New notes” rows with actions “Make flashcards with the tutor” (copies a prompt
   that tells Claude to read the PDF I attach and answer with the CFA-style JSON pack / a vocab CSV / a German
   summary – pick by subject) and “Done”.
3. For Japanese: the textbook PDFs Canvas downloaded (Japanisch/Zusatzmaterial: MNG lessons L1–6 romanized,
   chapter supplements) – write a step-by-step in the import tool how to get vocab lessons 6+ into the app
   via the tutor (romaji ⇥ German, Quizlet format) – do NOT copy textbook content into the repo (copyright:
   only into private/ + encrypted pack, see HANDOVER.md §4).
```

## Phase 4 – Time targets + weekly report · **Sonnet 5.5, effort medium**

```
Read HANDOVER-PHASES.md (shared rules + phase 4), TODO.md, then build phase 4 of my study app
(~/Claude Code/nihongo-app, branch nihongo-update).

1. Focus → “Targets”: hours per subject per week (editable; suggested from the last 2 weeks of the Focus log,
   rounded to 0.5 h). Bar chart this week: done vs target. Subjects below target get a suggestion
   “Block 1 h for <subject> tomorrow” (adds a planned block shown in Today's “Your day”).
2. Weekly report (Stats → “Weekly report”): per subject focus hours, lectures attended (lecture sessions),
   cards answered + accuracy, open/finished Canvas deadlines, new files. Export as PDF (print view) and as
   Markdown (download). Also the Monday “last week” view I can paste into my planning chat.
```

## Phase 5 – Exam mode · **Sonnet 5.5, effort medium**

```
Read HANDOVER-PHASES.md (shared rules + phase 5), TODO.md, then build phase 5 of my study app
(~/Claude Code/nihongo-app, branch nihongo-update).

1. Per subject with an exam date (settings.examDates): from 6 weeks before, the subject page shows an exam
   plan: weeks left, topics not yet mastered (preparation meter), suggested weekly hours.
2. Old exams: a Canvas rule switch per subject in private/canvas-config.json (“exams”: true) so the daily job
   also fetches the files it already classifies as Prüfungen into <subject>/Prüfungen. Show them in the
   subject's exam area (file names + “open the folder” hint, the app can't open local files).
3. Mock exam: timed mixed session from the subject's modules (Japanese: vocab + grammar + listening;
   CFA: practice questions), result with weak topics → “Drill these” button.
```

## Phase 6 – Pronunciation check with Azure Speech · **Sonnet 5.5, effort medium**

```
Read HANDOVER-PHASES.md (shared rules + phase 6), TODO.md, then build phase 6 of my study app
(~/Claude Code/nihongo-app, branch nihongo-update). I have an Azure Speech resource; key and region are
in private/azure-speech.json (dev server) – also let me enter them in Settings (stored on the device only).
Never print the key.

1. In Speaking → Read aloud: when a key is set, record with the microphone and call Azure Speech
   Pronunciation Assessment (ja-JP, reference text = the target sentence in kana/kanji, granularity Word,
   use the official browser SDK from npm, pinned version, or the REST short-audio endpoint).
2. Show accuracy / fluency / completeness / overall (0–100) and per word: romaji + score + error type
   (omission, insertion, mispronunciation), colour-coded; keep the current browser-recognition mode as the
   fallback when no key is set or offline.
3. Log each attempt (sentence id, scores, date) on the device; show progress per sentence (best / last).
4. Document limits (pitch accent only partly scored, audio goes to Microsoft) in the tool and in TODO.md.
```

## Also open (any phase can pick these up when it has time)

- Publish: merge `nihongo-update` into `main` (PR on github.com/cyber069-w/Japanese-app), deploy to Pages, test
  offline + install on the phone.
- Canvas rules review with the user (BWL “Handout” vs “Post Handout”, other subjects) – needs the user.
