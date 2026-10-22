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
- [~] Real pronunciation analysis: now via Azure Speech (Phase 6) – scores sounds per word; pitch accent only partly reflected

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
- [x] Canvas inbox on the phone: the Mac job encrypts the inbox into the sync repo (`scripts/canvas/push-inbox.mjs`, needs `private/sync-config.json` = { repo, token, password }); the app falls back to it when the dev server isn't there. Format round-trip is unit-tested, not run against GitHub here
- [ ] Canvas rules review with the user: BWL has a “Handout Vorlesungsfolien” and a “Handout Post Vorlesungsfolien” per week (different files, feel like doubles) – decide which version to keep; check the other subjects the same way
- [~] Inbox per course for OneNote PDFs / photos, Claude drafts lessons – needs the private repo `study-content`
- [~] Vocab lessons 6+, user's own grammar rules, hiragana notes – user supplies the material
- [~] BWL and Recht content – needs the user's lecture material
- [~] Automatic refresh of the Outlook timetable – Outlook blocks browser fetches; needs a scheduled job (with Canvas)

## Phase 1 – Today hub (HANDOVER-PHASES)
- [x] Today on Home: ranked list by horizon, dismiss/restore (7 days), Your day timeline, source chips (`core/today.ts`, 13 tests). Day window = Focus day window (weekly plan not provided yet). Timetable chip shows red until an .ics is imported on this device

## Phase 2 – Connections + history
- [x] Settings → Connections (Canvas, Outlook timetable, Device sync, Azure Speech; Working / Stale / Not set up / Failed + fix) and Azure key entry (device only)
- [x] Settings → History (newest 300; search, filter, delete one / clear all): Canvas accepted, tutor prompt copied, focus add/edit/delete, imports, read-aloud results

## Phase 3 – OneNote via PDF export
- [x] Mac job lists new PDFs in `Notizen` / `One Note …` folders (pattern `notes_folders` in private/canvas-config.json, last 30 days, each once) → inbox files with kind "notes"; tested on a temp folder, not on the real OneDrive
- [x] Today + bell: “New notes” rows with “Make flashcards with the tutor” (Japanese → CSV romaji;German, CFA → JSON pack, others → German summary + Q/A) and Done
- [x] Vocab import: step-by-step for textbook lessons 6+ via the tutor (nothing copied into the repo)

## Phase 4 – Time targets + weekly report
- [x] Focus → Targets: hours per subject per week, suggestion from the last 2 weeks (0.5 h steps), done-vs-target bars, “Block 1 h for X tomorrow” → planned block in Today's “Your day”
- [x] Stats → Weekly report (this / last week): focus, target, lectures, cards + accuracy, Canvas deadlines due / still open, new files; PDF (print), Markdown download, copy for the planning chat. “Finished deadlines” is not tracked by Canvas data – shown as due / still open instead

## Phase 5 – Exam mode
- [x] Course page → Exam Preparation: from 6 weeks before the exam date: weeks left, sections below 70 %, suggested weekly hours (rule of thumb, shown in the UI)
- [x] Old exams: `"exams": true` per course in private/canvas-config.json makes the Mac job also fetch files it classifies as Prüfungen into <subject>/Prüfungen; the exam area lists the file names (needs a Canvas run – not run against Canvas here)
- [x] Mock exam: mixed, timed (questions + minutes adjustable), no repeats after a mistake, weak topics + “Drill these”. Japanese = vocab + grammar + listening; other subjects = all their checked modules

## Phase 6 – Pronunciation check with Azure Speech
- [x] Read aloud: with a key (private/azure-speech.json via the dev server, or Settings → Connections, device only) the app records, converts to 16 kHz WAV and calls the REST short-audio endpoint (ja-JP, word granularity, reference = the sentence's written form). Shows overall / accuracy / fluency / completeness and per word romaji + score + error type, colour-coded; without a key the browser check stays as before. Attempts (best / last / count per sentence) are kept on the device and logged in History. REST instead of the SDK: no extra dependency
- [x] Verified outside the browser: with region `germanywestcentral` the key is accepted and CORS allows the call from the app. Microphone → score not run end to end here
- [x] Azure region typo fixed (`germanywestcentral`, checked 22 Oct)
- Limits: the recording goes to Microsoft (not stored by the app); pitch accent / mora length only partly scored; a clip is limited to 20 s here (Azure short-audio limit ~30 s); Japanese word segmentation is Azure's, so kanji words are shown as written when they can't be turned into romaji

## Home redesign (19 Oct)
- [x] Home = frosted-glass bento: Your lessons (timetable + suggested study blocks), To-dos (own to-dos with optional date + Canvas deadlines), Focus timer, Review, This week (targets + exam countdown), What to do next, Subjects. Canvas tile removed (the bell covers it)
- [x] Focus → Today is now a clock: drag on the ring to pick a time range → “Log this time”; dashed gaps are tappable
- [x] Glass on every screen + Settings → Display → Surfaces (Glass / Flat, device-only, default Glass); backdrop gradient softened
- [x] Apple look (Settings → Display → Surfaces → Apple): neutral grouped panels, SF system font, system blue, graphite dark (follows system / Light / Dark), coloured app-icon tiles for subjects, modules and Home cards (`styles/apple.css`). Checked at 375 / 768 / 1024 / 1280 px in all three surfaces: no sideways overflow. Not checked on a real iPad/iPhone/Mac (Safari) – only the built-in browser
- [x] Settings → Look: one picker (Leather · Night · Glass · Apple) + Appearance (System/Light/Dark) for Glass and Apple
- [ ] Reference screenshot for the Home layout never arrived – compare once it does
- [ ] Files / OneNote integration on Home: only the “What to do next” rows (new files, new notes) exist; decide if a dedicated card is wanted

## Polish round (19 Oct, evening)
- [x] Glass app-icon tiles only in the Apple look (gradient, specular highlight, inner rim, coloured shadow); Leather / Glass / Flat show the original plain icons again
- [x] Review shows the course bar and follows the course chip; review uses the course colour
- [x] Voice speed down to 0.25× (slider, slow button and recorded kana sounds)
- [x] Apple look: headline line-height and card spacing on course pages
- [ ] The PWA home-screen icon (public/icons) is not redesigned yet – a glass-style app icon could be generated with scripts/make-icons.swift
- [x] Empty states (lessons, to-dos, targets, all clear), pull-to-refresh on Home (phone/iPad: reloads Canvas + sync), bigger tap targets on touch screens
- [x] FEATURES.md: purpose + full feature inventory + limits, as input for brainstorming
