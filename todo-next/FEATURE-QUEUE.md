# Study Desk – next features (from the user's brainstorm, 19 Oct 2026)

Saved from the user's message. Rules, status tags and tasks A1–I7 below are the user's; progress is ticked at the end of each line in `PROGRESS` below.

Rules: follow existing patterns (IndexedDB stores, merge-by-id device sync, "Ask tutor" prompt bridge, accept/ignore inbox from the Mac job). No backend, no accounts, no new network calls except the ones named in a task. Nothing is written outside the app unless the user presses a button. Secrets only in `private/` on the Mac. UI text English, unknown = "–". One task = one commit.

Tags: [READY] build now · [WAITING] blocked · [ON HOLD] do not build.

- A1 [READY] Calendar export helper (ics) + "Add to Calendar" button; repeat rule, alarm, URL, description.
- B1 [READY] Shutdown screen (#shutdown): today's numbers, tomorrow, top 3 → to-dos dated tomorrow, Done + shutdown streak on Stats, Quick version.
- B2 [READY] "Write in iA Writer": Markdown note, ia-writer://new?path=…&text=…, clipboard fallback, folder/one-note-per-day in Settings.
- B3 [READY] Per-weekday shutdown time (default 22:30) + "Add shutdown reminders to Calendar" (weekly repeating events, 15 min, alert at start, URL → #shutdown).
- B4 [READY] Home banners: shutdown not done after the weekday time; after 00:30 "Just your top 3 (60 s)"; next morning offer quick version if missed.
- C1 [READY] Applications store + list by stage (Researching → Applied → Online test → Video interview → Interview → Assessment centre → Offer / Rejected / Withdrawn), filters; seed Nomura Spring Insight, FNF scholarship, PEVC Mentorship (EQT, Permira, Cinven).
- C2 [READY] Move to next stage + stage picker with history; deadlines/next steps in To-dos and What to do next; Add to Calendar.
- C3 [READY] Paste-an-email update, keyword rules (EN/DE) in one editable JSON, user confirms.
- C4 [ON HOLD] Automatic email reading – do not build.
- C5 [DROPPED] Import of the old tracker.
- C6 [READY] Watchlist of programmes (typed in by the user; never fetch/scrape Trackr); filters; calendar buttons.
- D1 [READY] Interview course with decks (Technical, Behavioural/Fit, Firm-specific), SRS reveal + self-rate.
- D2 [READY] Interview JSON pack import + "Generate pack" tutor prompt (20 original questions per topic).
- D3 [READY] Spoken practice mode (20 s prep, record 60/90/120 s, transcript, wpm, filler words, self-rate 1–5, attempts kept).
- D4 [READY] "Get feedback" prompt button.
- D5 [READY] Daily 60-second warm-up with streak and trend chart.
- D6 [READY] Teleprompter while recording.
- D7 [READY] Sparring mode prompt.
- E1 [READY] Reading items (pre/post-lecture default due dates from timetable).
- E2 [READY] Readings on Home + shutdown; Focus "Reading" tag; weekly report.
- E3 [READY] Readings from Canvas (Mac job rules → inbox "Add to reading list").
- E4 [READY] News tab (Mac job reads RSS once a day, headlines only, max 5 per source, private/news-config.json, feed-unavailable handling).
- F1 [READY] Clubs (notes field + dated checklist only).
- G1 [READY] Encrypted finance store (PBKDF2-SHA-256 600k + AES-GCM, locks after 5 min idle/hidden, ciphertext sync).
- G2 [READY] Study-costs tracker (CHF, categories, totals, CSV).
- G3 [LATER] Full budgeting – keep model open (kind: "study-cost").
- H1 [READY] Monkeytype link (Home quick links, Focus subject area, optional "Typing" timer).
- H2 [WAITING user step] Monkeytype stats via Mac job (ApeKey in private/monkeytype.json).
- H3 [READY, lowest] Quick capture (Home input, shortcut N, inbox → shutdown triage).
- I1 [READY] "Today" screen (ordered list + two suggested blocks with Start).
- I2 [READY] Claude Code drafts in the inbox (Mac job, `claude -p`, once a day).
- I3 [READY] Overnight grading of free-text answers (Mac job).
- I4 [READY] Exam dates from syllabi (Canvas job → inbox accept/ignore).
- I5 [READY] Sunday weekly planning prompt from the weekly report.
- I6 [READY] Measure the rules (suggestion outcomes, dismiss rate per rule type, ECTS target suggestion, exam record).
- I7 [READY] Market and deal log (tag → interview cards).

Dropped: push notifications, Shortcuts, **preparation meter (remove from the existing app too)**, Python section, auto email reading, old tracker import.
Not possible in a web app: AirPods posture, eye/gesture tracking, Apple Watch app, home-screen widget.

## PROGRESS
- [x] A1 ics helper + Add to Calendar (format tested; not imported into Apple Calendar here)
- [x] B1–B4 shutdown screen, iA Writer note (path honouring NOT tested on the Mac), per-weekday calendar reminders, Home nudges, streak on Stats
- [x] Preparation meter removed from the UI (course bar pill + sheet, switcher, Home tiles, exam plan text); core/meter.ts stays because the exam plan still uses it to find weak sections
- [x] C1–C3, C6 Applications (#/applications): pipeline by stage + watchlist, filters, history, paste-an-email rules (editable JSON in the screen, default `src/data/emailRules.json`), Add to Calendar, dates in To-dos / What to do next, Home tile. Seeds Nomura / FNF / PEVC Mentorship as *Researching* because their stages and dates are unknown
- NOT synced between devices yet: to-dos, shutdown log, applications (device-local kv). Sync of these stores is a separate task
- [x] D1–D7 Interview course (decks, JSON pack + prompt, spoken practice with 20 s prep / 60-90-120 s record / live transcript via browser speech recognition / wpm + filler stats / 1–5 self-rating into the SRS / attempts with playback, Get feedback, Spar, teleprompter, daily warm-up with streak + trend, warm-up row in Today). **Not tested with a real microphone** (blocked in the built-in browser); Azure is not used for the transcript because its short-audio endpoint stops at ~60 s. Interview questions and attempts are device-only (not synced) for now
- [x] E1–E4 Reading list (#/readings): kinds, due defaults from the timetable (pre = next lecture, post = +2 days), progress, Reading timer tag (Focus picker → weekly report column), “Before tomorrow’s lectures” on Home + shutdown, Canvas reading suggestions (reading_patterns in canvas-config.json), News tab (Mac job reads 5 feeds, max 5 headlines each, all five checked working, failed feeds show “feed unavailable”). Readings, news state and Canvas reading suggestions are device-local; the news/readings inbox part syncs to the phone with the Canvas inbox
- [x] Sync of the new stores (to-dos, readings, applications, interview questions + attempts, shutdown log): item-by-item merge, newest change wins, newer deletion beats older edit, first-time data never lost (`core/kvSync.ts`, 8 tests incl. the sync file). Run end to end only in unit tests, not against GitHub. NOT synced: recordings (audio stays on the device), planned blocks, focus targets, news state, and these stores are not part of the JSON backup yet
