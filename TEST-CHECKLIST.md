# Test checklist (what I could not test myself)

Tick as you go. "Mac" = Chrome or Safari on the Mac, "Phone/iPad" = the installed app. Report anything off with the item number.

## 0 · Setup (once)
- [ ] GitHub repo → Settings → Pages → Source: **GitHub Actions**; Actions tab shows a green "Deploy" run for `main`; the Pages link opens the app.
- [ ] Phone/iPad: open the Pages link in Safari → Share → Add to Home Screen. App opens full screen. Turn on flight mode → it still opens (offline).
- [ ] Settings → Sync: connect all devices with the same repo and sync password. Settings → Connections shows "Device sync: Working".
- [ ] `private/azure-speech.json` has region `germanywestcentral` (Connections shows Azure "Working").

## 1 · Mac (Chrome)
**Microphone**
- [ ] Speaking → Read aloud: record a sentence → four scores + per-word chips.
- [ ] Interview → import the sample pack (Import pack → paste JSON) → Spoken practice → Start → allow the microphone → recording runs, live transcript appears, Stop → playback works, stats (wpm, fillers) show, rate 1–5 → "Saved".
- [ ] Teleprompter on: words highlight and scroll at the chosen speed; Pause works.
- [ ] Daily warm-up: one take, no redo; streak shows 1; second visit says "done for today".

**Calendar and iA Writer**
- [ ] Shutdown → "Add shutdown reminders to Calendar": the .ics opens in Apple Calendar; **7 weekly events** at your times, 15 min, alert at start, the link opens `#/shutdown`. Import again → no duplicates.
- [ ] Applications → an entry with a deadline → "Calendar" → imports as all-day event with alert.
- [ ] Shutdown → "Write in iA Writer": opens a note at `/Shutdown/YYYY-MM-DD.md` (if iA Writer puts it elsewhere, tell me the file name).

**Mac job**
- [ ] `python3 scripts/canvas/canvas_sync.py --inbox` runs without errors; app shows the news tab (5 sources) and Canvas rows.
- [ ] Put a PDF into `<subject>/Notizen/` in OneDrive, run the job → "New notes" row appears.
- [ ] Optional (Claude drafts / grading): set `"claude": {"enabled": true, "bin": "<full path to claude>", "max_per_day": 3}` in `private/canvas-config.json`, run the job once and watch the output. Drafts appear as "Draft ready" on Home; Accept imports only after your tap.
- [ ] Optional (phone inbox): create `private/sync-config.json` `{ "repo", "token", "password" }`; after the job, the phone shows the Canvas inbox without the dev server.

## 2 · Phone (iPhone)
- [ ] Home: pull down at the top → "Release to refresh" → refreshes. No horizontal scrolling on any screen.
- [ ] Home capture field + quick add; type a to-do with a date → it appears; tick it off.
- [ ] Look: Settings → Look: Leather, Night, Glass, Apple all render; Apple follows system light/dark.
- [ ] Focus: start a timer, lock the phone for a minute, unlock → the timer is still right; day clock drag works with a finger.
- [ ] Finance: set a test password → add a cost → lock → wrong password refused → right password unlocks; app switch away and back → it is locked again.
- [ ] Sync: add a to-do on the phone, open the Mac app → appears within a minute (and the reverse). Delete it on one side → gone on the other.
- [ ] Interview practice on the phone: microphone permission prompt appears once, recording works (Safari uses Apple speech recognition; if no live transcript, type it in the box).
- [ ] Tap targets feel big enough (chips, checkboxes, buttons).

## 3 · iPad
- [ ] Portrait and landscape: Home cards reflow (no overlap, no cut-off text); sidebar shows in landscape, tab bar in portrait.
- [ ] Split view / Slide Over: the app still lays out cleanly at narrow widths.
- [ ] Apple look: sidebar and tab bar blur; icon tiles have the glass highlight.
- [ ] Pointer/keyboard (if attached): `N` focuses quick capture on Home; Esc closes sheets.

## 4 · Known gaps (not bugs you need to report)
- Recordings stay on the device that made them (not synced); transcripts and ratings do sync.
- Finance: no "change password" yet; two devices creating a vault at the same time → one side shows "could not be decrypted".
- JSON backup (Settings → Backup) does not yet include the new stores (to-dos, applications, clubs, readings, finance, interview, shutdown).
- Monkeytype stats (H2) wait for your ApeKey; full budgeting (G3) is later.
- Canvas syllabi are empty, so exam-date proposals only appear if an announcement/page names a future date.
