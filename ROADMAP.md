# Roadmap – everything still to do

Priorities are the user's order where they gave one; ideas marked 💡 are suggestions.
Details of what exists today are in `HANDOVER.md`.

## A. Japanese (current course)
1. ✅ Romaji import, headerless Quizlet paste, coloured syllables with romaji, "per round" length (10/50/100/All).
2. Vocab lessons 6+ (user supplies; Quizlet paste now works), grammar rules reconciled with the user's own notes.
3. Kanji module browser-test, then enable it again.
4. Audio everywhere with a slow option (grammar examples, kana words, chapter pages).
5. Quizlet export of a chapter or selection (term ⇥ definition).
6. 💡 Longer "marathon" mode with a progress bar and break reminder; 💡 mixed-kana quiz (hiragana + katakana together).

## B. Look & feel (user's top wish)
7. Replace the plain icons and single-glyph tiles with one consistent icon set; design system with one accent per course;
   two mockups first, user picks, then roll out (practice screen, Home, course page).

## C. Other courses
8. **CFA Level 1**: lessons with notes, key terms, A/B/C questions as review cards, formula sheet, worked examples.
9. BWL and Recht: content shells exist, fill from the user's lecture material (existing skills for Mikroökonomik / Privatrecht can feed this).

## D. AI integration
10. Tutor: "Ask tutor" button per course that opens the course's Claude Project and copies a context note; session summaries list.
11. 💡 In-app question generator: Claude drafts review cards from pasted notes, the user approves / edits / discards.
12. 💡 Weakness-driven drills: send the weakest items to Claude for extra example sentences / explanations (needs an API key
    stored only on the device, or a Claude Project hand-off to avoid keys).

## E. Imports & automation
13. Inbox per course for OneNote PDFs / photos; Claude drafts lessons; Approve / Edit / Discard; source pages zoomable (needs the
    private repo `study-content`, since the app repo is public).
14. **Canvas auto-adder** 💡: pull deadlines and course files from Canvas and sort them into the right course folders.
    A static PWA cannot hold a Canvas login, so this runs outside the app: a scheduled job (Claude Code scheduled task or a
    GitHub Action) using the Canvas calendar (ICS) feed or an API token, writing into the private content repo; the app
    reads from there. Needs from the user: Canvas URL, how files are organised today, which feed/token is allowed.
15. **Focus Log integration** 💡: bring the user's Focus Log app in as a module (time tracking per course feeding the
    "time studied" stats and the preparation meter). Needs from the user: where its code lives and its data format.

## F. Planning & stats
16. Daily goal in answers or minutes, 7-day overview on Home, exam date per course.
17. 💡 Study plan from exam dates: weekly workload per course based on preparation meter and Canvas deadlines.
18. Fix: one word counts up to 4× in "due" (once per exercise) – count items.

## G. Housekeeping
19. Move Tofugu-derived memory texts out of the public code; keep copyrighted material only in the encrypted pack / private repo.
20. Full QA at 375 px, light + dark, offline/installability check after each larger change.
