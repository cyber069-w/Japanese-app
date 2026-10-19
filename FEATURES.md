# Study Desk – purpose and feature inventory

Use this file as input for brainstorming new ideas. State: 19 Oct 2026, branch `nihongo-update` (not yet merged to `main`).

## Purpose

A **private, ad-free study cockpit for one university student** (German-speaking, University of St. Gallen, HS 2026/27).
It does three jobs:

1. **Learn** – spaced-repetition practice for the subjects that suit cards: Japanese A1 (Minna no Nihongo), CFA Level 1,
   BWL, Recht.
2. **Plan** – turn deadlines, lectures, exams and free time into "what do I do now?" using fixed rules (no AI decisions).
3. **Track** – log lecture and study hours, compare to weekly targets, see preparation per subject and exam.

Hard principles: no backend, no accounts, no tracking; data stays on the device (IndexedDB) and syncs only through the
user's own private GitHub repo, encrypted. Nothing writes outside the app (Canvas, OneDrive, mail, calendar) unless the
user presses a button. Unknown = "–", nothing is made up. The app has **no AI connection of its own because the user has no API key right now** (not
because AI is unwanted – AI decisions would be welcome). Today the "tutor" button copies a prompt and opens Claude; the
only direct call is Azure Speech for pronunciation scores. A bring-your-own-key AI layer is a possible future step. UI in English, content German +
romaji. Copyrighted material (textbook vocab, pictures) lives only in `private/` and an encrypted pack.

Platforms: static PWA (offline, installable) – Mac browser, iPhone, iPad. A local Mac job (Python/Node) feeds it from
Canvas and OneDrive.

## Screens and features

**Home** – frosted-glass overview: *Your lessons* (timetable + suggested study blocks), *To-dos* (own to-dos with optional
date + Canvas deadlines), *Focus* timer, *Review* (cards due), *This week* (hours vs targets, exam countdowns),
*What to do next* (ranked list from Canvas, cards, files, notes, gaps; dismiss for 7 days), subject tiles.

**Study / courses** – per course five areas: Study · Practice & Review · Exam Preparation · Imports · Tutor. Course switcher
and "preparation meter" (how ready, from saved answers; weighted by section).
- *Japanese:* hiragana and katakana (rows, presets, kana↔romaji, writing with stroke order, picture mnemonics, look-alike
  drill, 118 recorded kana sounds), vocabulary (import CSV/Quizlet/clipboard, both directions, word list in source order,
  audio normal/slow), grammar lexicon (6 categories, search, examples, "ask tutor"), numbers/time/dates/counters with
  generated drills, listening (dictation), speaking (question list, self-introduction builder, read-aloud, recording),
  kanji = "coming later".
- *CFA:* lesson packs imported as JSON made by Claude (terms, formulas, questions, worked examples), formula sheet
  (search, print/PDF), practice questions, mixed sessions.
- *BWL, Recht:* structure only – waiting for the user's lecture material.

**Review** – one queue of everything due across modules; per-course filter; weakest cards drill; "practise mistakes".

**Study sessions** – shared SRS engine (wrong comes back sooner), typing/choice/order/draw/reveal answers, hints, keyboard
shortcuts, audio, session summary.

**Stats** – streaks, daily goal (answers or minutes), 30-day activity, accuracy per module, heatmap, exam countdown,
*Weekly report* (per subject: focus hours vs target, lectures, cards + accuracy, Canvas deadlines; PDF, Markdown, copy for
a planning chat).

**Focus** – timer (study/lecture) with subject picker; survives reloads/sleep; "still on it?" check-ins and reminders;
*day clock* (drag to pick a time range, tap a gap to fill, coverage %); add/edit entries with undo; weekly *Targets* per
subject with suggestions from the last 2 weeks and "block 1 h tomorrow"; lecture timetable from an Outlook `.ics`;
mini window / widget tab; import from the old Focus Log.

**Exam mode** – 6 weeks before an exam date: weeks left, sections below 70 %, suggested weekly hours (rule of thumb);
mock exam (mixed, timed, no repeats, weak topics → "Drill these"); old exams found by the Canvas job listed per subject.

**Canvas bell** – deadlines (accept/ignore), filtered announcements (exams, room changes), new files, "new notes"
(OneNote PDFs); mute per subject. The Mac job (`scripts/canvas/canvas_sync.py`, daily 07:00) sorts lecture slides into the
OneDrive course folders by rules in `private/canvas-config.json`, never overwrites, and copies the inbox encrypted to
the sync repo so the phone can read it.

**Tutor bridge** – "Ask tutor" buttons build a German prompt and open Claude (optionally a per-subject Claude Project):
grammar entries, vocab rows, new slides/notes (answer format by subject: vocab CSV, CFA JSON pack, or summary + Q/A),
tutor session notes per subject.

**Pronunciation** – Speaking → Read aloud: with an Azure Speech key, scores per word (0–100) and overall, accuracy,
fluency, completeness; attempts kept per sentence; fallback to browser speech recognition.

**Settings** – study options, sound and voice speed (0.25–1.3×), look (Leather, Night, Glass, Apple; light/dark), tutor
links, *Connections* (Canvas, Outlook timetable, device sync, Azure – working/stale/not set up/failed + how to fix),
*History* (newest 300 actions), course pack unlock, backup/restore, device sync, reset.

**Sync and data** – IndexedDB; export/import JSON; encrypted GitHub-repo sync between devices (merge by id, newest wins);
encrypted private course pack (`pack.enc`, passphrase) for copyrighted content.

## What it cannot do (today)

- Run anything in the background: no push notifications, no reminders when the app is closed, the Mac job needs the Mac on.
- Read Outlook, OneNote or OneDrive directly (university account, no API key); Outlook timetable is a manual `.ics`
  import for now, OneNote works through PDF export.
- Open local files from the browser (it can only name them).
- Judge answers with AI (free-text answers, essays, calculations beyond typed numbers).
- Grade pitch accent precisely; the recording goes to Microsoft.
- Teach BWL/Recht content yet – no material imported.
- Be tested on a real iPhone/iPad/Safari so far (only the built-in browser at phone/tablet sizes).

## Open items (from TODO.md)

Merge to `main` + deploy to GitHub Pages and test offline/install; weekly-plan day window for "Your day"; Canvas rules
review (BWL handouts); Outlook calendar sync via key; lecture reminders; BWL/Recht/vocab 6+/grammar material; a single
"Look" picker; mobile gestures; better empty states; redesigned home-screen icon (current one already glass-style).

## Questions worth thinking about

- What would make the app the *first thing opened* every morning and the last every evening?
- Which student tasks are still outside it (notes, reading, writing, group work, applications, finances)?
- What can be automated by the Mac job or by prompts to Claude, without breaking "nothing writes out unless I press a button"?
- Which rules (priority scores, suggested hours) are wrong for real student life, and how would we measure that?
