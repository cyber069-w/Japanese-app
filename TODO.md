# TODO – study platform

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
- [ ] Mixed-kana quiz (hiragana + katakana together)
- [ ] Kanji module browser test, then enable again; `/m/kanji/t/*` reachable by URL while "coming later"

## Phase 4 – Speaking (voice)
- [x] Read aloud (Speaking → Read aloud): grammar sentence in romaji + German (kana via toggle), listen normal/slow, speak, words recognised shown green/red with % and recogniser confidence. Browser speech recognition (Chrome/Edge/Safari, not Firefox; audio goes to Google/Apple). Comparison unit-tested; microphone run not tested here
- [ ] Real pronunciation analysis (pitch accent, mora length, sounds) – needs a phoneme model or an AI audio service; not possible with browser recognition alone

## Phase 5 – Focus
- [ ] Mini window redesigned in the new design system
- [ ] Subject choice hidden until start: radial "flower" picker, dropdown fallback (keyboard, small windows)
- [ ] Add vs edit clearly separated: own title, icon, colour, prefilled values, quick start/end/duration, overlap warning, delete with undo
- [ ] Timer based on start timestamps (survives restart and sleep) – already true, keep it
- [ ] Auto-save
- [ ] Gaps in today's timeline detected and fillable with one tap; day coverage in %
- [ ] Reminder when no timer is running; ask after inactivity whether the time should count
- [ ] Sync focus sessions between devices; lecture reminders

## Older open items (ROADMAP / HANDOVER)
- [ ] Daily goal in answers or minutes, 7-day overview on Home, exam date per course
- [ ] "Due" counts a word up to 4× (once per exercise) – count items
- [ ] Review course filter only appears once a second course has content
- [ ] CFA: sync lessons between devices, formula sheet page, worked examples, mixed questions across lessons
- [ ] Tutor session-summaries list per course
- [ ] Move Tofugu-derived memory texts out of the public code
- [ ] Full QA at 375 px / ~700 px, light + dark, offline and installability
- [~] Canvas auto-adder – waiting for the user (Canvas URL, feed/token, folder layout); reminder noted
- [~] Inbox per course for OneNote PDFs / photos, Claude drafts lessons – needs the private repo `study-content`
- [~] Vocab lessons 6+, user's own grammar rules, hiragana notes – user supplies the material
- [~] BWL and Recht content – needs the user's lecture material
- [~] Automatic refresh of the Outlook timetable – Outlook blocks browser fetches; needs a scheduled job (with Canvas)
