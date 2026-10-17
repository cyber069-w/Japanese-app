# TODO – study platform

Next work is split into phases with ready-made prompts (model + effort per phase): see `HANDOVER-PHASES.md`.

Single list of everything still open. `ROADMAP.md` keeps the background; this file is ticked off as work lands.
Status: [ ] open · [x] done · [~] solved differently / blocked (reason in the line).

## Phase 1 – Data & import
- [x] Store each imported row's position; word list always shows source-file order (only study modes shuffle)
- [x] Word list: romaji → German by default, kana only via toggle
- [x] Check with the existing vocab files: rows in file = entries in app, same order (6 course files: 292 rows = 292 entries, order and positions match; Quizlet test list 14 = 14)
- [x] Import area: CSV/TSV, Quizlet text, clipboard paste; column mapping; preview of first 10 rows; duplicates; error rows; undo

## Phase 2 – Design system & Home
- [x] Design round: 3 previews shown; user sent a Monkeytype “leather” reference → leather light + night, airy, one colour per subject
- [x] Design system: leather tokens (colours, type scale, spacing), Roboto Mono, flat components, Tabler icons, loading screen and error boundary – applied through the shared tokens
- [x] Home = subject tiles (courses + Focus) and “coming soon” tiles; app name “Study Desk”, neutral header and icon
- [x] No Japanese characters, words or motifs outside the Japanese subject (checked on Home, Review, Stats, Settings, Focus; kana chart moved from Stats to the kana module pages; washi/seal look removed)
- [x] Layout clean down to ~700 px (bottom nav no longer wraps); mini window is redone in Phase 5

## Phase 3 – Japanese
- [x] Kana pronunciation: 118 pre-recorded sounds (macOS voice Kyoko, slower rate) for every kana incl. dakuten / handakuten / combinations / loanword sounds; used instead of browser TTS for single kana (`scripts/build-kana-audio.mjs`). Lengths all 0.32–0.55 s; not checked by ear
- [x] Grammar as a lexicon: search, 6 categories + A–Z; entry = name · rule (DE) · formation · examples (romaji, DE, kana toggle, audio + slow) · related entries. “Typical mistakes” only shows where the source has them (none yet – not invented; the tutor button asks for them)
- [x] Grammar notes rewritten in German + romaji (`grammar/data/lexicon.json`); grammar flashcards removed, grammar drills show romaji
- [x] “Ask tutor” in every lexicon entry, in the vocab detail row and on every subject page; copies a prompt (German, romaji) and opens Claude / the subject’s Claude Project (Settings → Tutor)
- [x] Audio with a slow option in the word list and lexicon; single kana from recorded files; “no Japanese voice” help already in Settings → Sound
- [x] Mixed-kana drill (Katakana → “Hiragana + katakana”, selected rows in both scripts)
- [~] Kanji stays “coming later” (your earlier decision); its tool pages are now blocked by URL too

## Phase 4 – Speaking (voice)
- [x] Read aloud (Speaking → Read aloud): grammar sentence in romaji + German (kana via toggle), listen normal/slow, speak, words recognised shown green/red with % and recogniser confidence. Browser speech recognition (Chrome/Edge/Safari, not Firefox; audio goes to Google/Apple). Comparison unit-tested; microphone run not tested here
- [ ] Real pronunciation analysis (pitch accent, mora length, sounds) – needs a phoneme model or an AI audio service; not possible with browser recognition alone

## Phase 5 – Focus
- [x] Mini window / widget tab redesigned in the leather system (380 px tested)
- [x] Subject choice hidden until Start (or Switch): radial flower picker with study/lecture in the centre; dropdown always below it, alone when the window is too narrow; Esc closes
- [x] “Add time” (green, sparkle) and “Edit entry” (amber, pencil) dialogs; prefilled; start / end / duration chips; overlap warning; delete with an 8-second Undo
- [x] Timer is a list of timestamps (survives reloads, restarts and sleep); finished sessions now keep their stretches for the timeline
- [x] Auto-save: every change is written to IndexedDB at once and shared with open tabs
- [x] Today timeline with gaps ≥ 10 min (tap to fill) and day coverage in % for an adjustable day window
- [x] Reminder when no timer runs (in-app + optional system notification); “still on it?” check-in, auto-stop after 5 min without answer, and a question after sleep whether the time counts. Only while the app is open somewhere; ticker logic not run end-to-end here (no waiting 30 min)
- [x] Focus sessions and subjects sync between devices (merged by id, newest edit wins, deletions stick – unit-tested, not run against GitHub here)
- [ ] Lecture reminders before a lecture starts (needs the timetable refresh job – see Canvas)

## Older open items (ROADMAP / HANDOVER)
- [x] Daily goal as a free number in answers or minutes; exam date per subject (Stats countdown). 7-day overview: Home is now subject tiles only, so it lives in Stats (30-day answers, 14-day focus)
- [x] “Due” counts each word once; a review asks it once (the most overdue exercise), the rest stay due
- [x] Review course filter shows now that CFA has content (by design: hidden while only one subject has cards)
- [x] CFA: lessons sync, formula sheet (search, print/PDF), worked examples in the lesson pack, mixed questions = Practice questions with several lessons selected
- [x] Tutor session summaries per subject (subject page → Tutor; stored on this device)
- [x] Hiragana memory texts (based on the Tofugu pictures) moved into the encrypted course pack; katakana texts are my own and stay
- [x] QA: 375 px (9 screens, no sideways scroll), ~700 px, 380 px widget, leather + night; production build precaches app, fonts and all 118 kana sounds. Service-worker registration not testable in the built-in browser – check once on the phone after deploying
- [x] Canvas: `scripts/canvas/canvas_sync.py` (daily 7:00 via launchd) sorts lecture slides etc. into the OneDrive course folders by the rules in `private/canvas-config.json`, never overwrites, recognises existing files; the app's bell shows deadlines as suggestions, filtered announcements and new files (dev server only for now)
- [ ] Canvas inbox on the phone: needs the inbox in the sync repo (the dev server serves it locally only)
- [ ] Canvas rules review with the user: BWL has a “Handout Vorlesungsfolien” and a “Handout Post Vorlesungsfolien” per week (different files, feel like doubles) – decide which version to keep; check the other subjects the same way
- [~] Inbox per course for OneNote PDFs / photos, Claude drafts lessons – needs the private repo `study-content`
- [~] Vocab lessons 6+, user's own grammar rules, hiragana notes – user supplies the material
- [~] BWL and Recht content – needs the user's lecture material
- [~] Automatic refresh of the Outlook timetable – Outlook blocks browser fetches; needs a scheduled job (with Canvas)
