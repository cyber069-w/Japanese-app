# todo-next

What comes next, and the rule for when to stop and ask.

## Rule: quality check before switching

If I (the model working on this app) notice that I **cannot deliver what is asked at the quality needed** – for example a design
that stays off after two tries, a bug I can't find, logic that needs deeper reasoning, a task too large to do carefully in
this session – I do **not** push on and hand over something mediocre. I stop, say plainly what I can't do well and why,
and ask: **switch model, raise the effort, or split the task?** The user decides.

Signals: repeated failed fixes, output I wouldn't be happy to ship, no way to verify the result, the task needs real-device
testing I can't do, or the answer depends on a decision only the user can make.

## Queue (in order)

1. Merge `nihongo-update` → `main`, deploy to GitHub Pages, test offline + install on the phone/iPad.
2. ~~Paste-back planning~~ done: Home → Your lessons → “Plan my week” (prompt → paste JSON → review → add; replaces the earlier pasted plan, keeps manual blocks).
3. ~~Accept study blocks~~ done (Accept on suggested blocks; “Planned later” list). Planned blocks also show as an outer arc on the Focus day clock.
4. ~~Weekly-plan day window~~ replaced (22 Oct) by the **rolling plan**: today + tomorrow from weekly targets, deadlines/exams, lectures,
   logged time and Apple Calendar busy times (`core/rollingPlan.ts`, Today → "Your plan"). Calendar: run `swift scripts/calendar/busy.swift`
   once in Terminal to allow access, then load `scripts/calendar/com.maximilian.calendarbusy.plist` (every 15 min). Live on main since 22 Oct.
5. ~~Outlook calendar sync~~ dropped (22 Oct): the user's mail and calendar are on Apple.
6. ~~Canvas rules review (BWL handouts)~~ user checked 22 Oct: no problems; they report when a rule is needed.
7. Brainstorm results from the user → turn the chosen ideas into tasks here.

Background: `../FEATURES.md` (purpose and features), `../TODO.md` (history), `../HANDOVER*.md`.

## Note

The brainstorm ideas are **not in this file** – it only holds the queue above. Paste or save them here (or tell me where they are) and I'll turn each into a task.
