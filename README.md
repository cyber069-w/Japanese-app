# Nihongo – a private Japanese study app

A calm, ad-free study app for *Minna no Nihongo* and the A1 exam: a static **PWA** that works offline and installs on
phone and laptop. No backend, no account, no tracking – your progress stays on your device, and if you like it syncs
between your devices through a private repository in your own GitHub account (encrypted, free).

| Module | What you practise |
| --- | --- |
| **Hiragana / Katakana** | reading, recall with look-alike distractors, words, writing with stroke order, memory pictures, look-alike drill |
| **Vocabulary** | Minna no Nihongo by lesson, both directions, typing with live romaji → kana, flashcards, CSV import |
| **Kanji** | N5 kanji (or your own list): meaning, readings, example words, drawing with stroke order |
| **Grammar** | lessons 1–10: grammar cards, particles, sentence building, choose the form, translation |
| **Numbers & time** | 1–10,000 with every sound change, clock times, dates, prices, phone numbers, counters |
| **Listening** | dictation, “what does it mean?”, *hear the difference* (ビル / ビール, きて / きって), sentences, sentence dictation |
| **Speaking** | self-introduction builder (じこしょうかい), 32 oral exam questions with model answers, voice recording |

Every module feeds one spaced-repetition engine (SM-2 with learning steps): wrong answers come back a few cards later
and sooner the next days, known cards fade out. **Review** mixes everything that is due. **Stats** shows streaks,
accuracy per module, progress per lesson and red→green heatmaps. Word meanings are in **German** by default
(English is a switch in Settings).

---

## Run it locally

Requires **Node 22.12+**.

```bash
npm ci
npm run dev          # http://localhost:5173 – hot reload, includes private/ if present
npm test             # unit tests (Vitest)
npm run typecheck
npm run build        # production build into dist/ (never includes private/)
npm run preview      # serve dist/ at http://localhost:4173 – test offline/installing here
```

Keyboard: <kbd>Enter</kbd> check / next · <kbd>1</kbd>–<kbd>6</kbd> choose · <kbd>Space</kbd> audio ·
<kbd>Shift</kbd>+<kbd>Space</kbd> slow audio · <kbd>?</kbd> hint · <kbd>R</kbd> record · <kbd>Esc</kbd> quit.

## Your private course pack

The Minna no Nihongo vocabulary and the hiragana memory pictures (from Tofugu’s *Learn Hiragana*) are copyrighted and
must never be public. They live in `private/`, which is **git-ignored**:

```
private/
  vocab/*.csv                 your vocab lists (format below)
  hints/hiragana/<id>.jpg     memory pictures, id = romaji (a, ka, shi, tsu, wo, n …)
  PASSPHRASE.txt              the pack passphrase
```

`npm run pack` encrypts that folder into **`public/pack.enc`** (AES-256-GCM, key from your passphrase via PBKDF2). Only
this encrypted file is committed and deployed. On each device, open **Settings → Course pack** once and enter the
passphrase – the content is decrypted in the browser and kept on that device (also offline).

```bash
npm run pack                                  # private/ → public/pack.enc (after any change in private/)
PACK_PASSPHRASE='your passphrase' npm run unpack   # public/pack.enc → private/ (new computer)
```

Never commit `private/` or the passphrase. The dev server bundles `private/` directly so you don’t need to unlock
locally; production builds never do.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` tests and builds every push and pull request (`npm ci` → `npm test` → `npm run build`);
pushes to `main` are then published to GitHub Pages. One-time setup:

1. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push (or merge) to `main`. The **Actions** tab shows the run; the site appears at
   `https://<user>.github.io/<repo>/` – for this repo **https://cyber069-w.github.io/Japanese-app/**.
3. You can also start a deploy by hand: **Actions → Deploy to GitHub Pages → Run workflow**.

The site is public, which is fine: it contains only the app and the encrypted pack. The build uses relative paths and
a hash router, so it works under any sub-path.

> **Private repository?** GitHub Pages from a private repo needs a paid plan (GitHub Pro or higher). On a free account,
> either make the repository public – safe, because `private/` and the passphrase were never committed and the pack is
> encrypted – or keep it private and upgrade. The tests and build run either way.

**Install it:** open the site on your phone – iPhone: Share → *Add to Home Screen*; Android/Chrome: menu → *Install
app*; desktop Chrome/Edge: the install icon in the address bar. Then Settings → Course pack → passphrase. After the
first visit everything works offline, fonts included.

**Updates** install themselves: after a deploy, the app picks up the new version the next time you open it online.

## Sync between devices

Optional and free: progress, daily history, settings, imported word lists, the kanji list and your self-introduction
sync through **one encrypted file in a private repository of your own GitHub account**. There is no server – the app
talks to the GitHub API directly. Theme, voice speed, sound and recordings stay per device; the course pack is unlocked
on each device as before.

1. Create a private, empty repository, e.g. `nihongo-sync` (<https://github.com/new>).
2. Create a [fine-grained access token](https://github.com/settings/personal-access-tokens/new): *Repository access*
   → Only select repositories → `nihongo-sync`; *Repository permissions* → **Contents: Read and write**; expiration
   as long as offered. Keep it in your password manager.
3. In the app: **Settings → Sync between devices** → repository (`your-name/nihongo-sync`), token and a sync password.
   Do the same on every device with the same password.

How it works: the file (`progress.enc`) is AES-256-GCM encrypted with a key derived from your sync password – GitHub
only ever sees ciphertext. Each sync reads the file, merges, writes it back and takes over the result (newest answer per
card wins; every device keeps its own daily log, so studying on two devices on the same day adds up and nothing is
counted twice; settings, lists and profile take the most recent change; a module reset reaches the other devices).
If two devices write at once, GitHub rejects the second write and that device merges again. Syncs run in the background
(when the app opens, ~20 s after you study, when you leave the app) and never block studying; offline you keep going and
it syncs later. Forgot the sync password? *Start fresh* replaces the file with one device’s data under a new password.
When the token expires, Settings shows it – create a new one and connect again.

## Add a vocab list

Two ways:

- **In the app** – Vocabulary → *Import words*: choose a CSV file or paste text. The list is stored on that device
  (and in your backup file). Good for quick additions.
- **In the course pack** – put the CSV in `private/vocab/` and run `npm run pack`, then commit `public/pack.enc`. Every
  device gets it after unlocking again (Settings → Course pack → *Update*).

**Format:** one word per line, a header row, columns in any order:

| column | required | content |
| --- | --- | --- |
| `kana` | yes | the word in kana, as you want to type it |
| `kanji` | no | written form with kanji – furigana is added automatically |
| `de` | `de` or `en` | German meaning |
| `en` | `de` or `en` | English meaning |
| `lesson` | yes | Minna no Nihongo lesson (0 = intro) |
| `tags` | no | `extra` (useful-words pages) or `place` (place names) – optional groups |

```csv
kana,kanji,de,en,lesson,tags
とけい,時計,Uhr,watch; clock,6,
でんしゃ,電車,Zug,train,5,
[お]みやげ,[お]土産,Souvenir,souvenir,2,
だれ (どなた),誰 (どなた),wer,who,1,
～かい (～がい),～階,~. Stock,~th floor,3,
きょうと,京都,Kyoto,Kyoto,5,place
```

- Commas, semicolons (German Excel) and tabs all work; quote fields that contain the separator.
- `[お]みやげ` – the part in brackets is optional, both おみやげ and みやげ are accepted.
- `だれ (どなた)` – an alternative in round brackets is accepted too.
- `～` marks a placeholder (counters, patterns); such entries are skipped in typing exercises.
- A single `meaning` column also works – the importer asks whether it is German or English. Header names in German
  (`Deutsch`, `Lektion` …) are understood as well.

## Add a module

A module is a folder in `src/modules/` that exports a `StudyModule` (see `src/core/types.ts`). Home, Study, Review and
Stats pick it up automatically – no other screen needs changes.

**1. Create the items and an exercise** – `src/modules/colours/index.ts`:

```ts
import type { BaseItem, Exercise, Question, StudyModule } from '../../core/types';
import { shuffle } from '../../core/session';
import data from './colours.json'; // [{ "kana": "あか", "kanji": "赤", "de": "rot", "en": "red", "lesson": 8 }, …]

interface Colour extends BaseItem { kana: string; de: string; en: string }

// id: unique and stable (it is part of the saved progress) · groups: for the filter chips
const ITEMS: Colour[] = data.map((c) => ({
  id: c.kana, label: c.kanji, sub: c.de, groups: [`L${c.lesson}`], lesson: c.lesson, kana: c.kana, de: c.de, en: c.en,
}));

const meaning: Exercise<Colour> = {
  id: 'meaning',
  name: 'Colour → meaning',
  description: 'See the word, pick the colour.',
  icon: '色',
  items: () => ITEMS,
  question: (it, ctx): Question => {
    const others = shuffle(ctx.pool.filter((x) => x.id !== it.id), ctx.rng).slice(0, 3);
    const opts = shuffle([it, ...others], ctx.rng);
    const m = (c: Colour) => c[ctx.settings.meaningLang];
    return {
      prompt: { text: it.label, lang: 'ja', size: 'large', instruction: 'Which colour is it?' },
      answer: { type: 'choice', options: opts.map((o) => ({ label: m(o), lang: 'latin' })), correct: opts.indexOf(it) },
      solution: { main: it.label, lang: 'ja', sub: `${it.kana} · ${m(it)}` },
      speak: it.kana,
    };
  },
};

export const colours: StudyModule = {
  id: 'colours',
  name: 'Colours',
  nameJa: '色',
  icon: '色',
  description: 'Colour words from lesson 8.',
  status: 'ready',
  exercises: [meaning],
  groups: () => [{ id: 'L8', label: '第8課', section: 'Lessons' }],
};
```

**2. Register it** in `src/modules/index.ts`:

```ts
import { colours } from './colours';
export const MODULES: StudyModule[] = [hiragana, katakana, vocab, kanji, grammar, numbers, listening, speaking, colours];
```

**3. Test it**: `npm run dev`, open Study → Colours, and add a `*.test.ts` next to your logic (`npm test`).

What a question can use:

| `answer.type` | widget | notes |
| --- | --- | --- |
| `typing` | text field | `input: 'romaji' \| 'kana' \| 'katakana' \| 'number' \| 'text'`; kana inputs convert romaji live; `check(value)` decides |
| `choice` | 2–6 buttons | keys 1–6 |
| `order` | word tiles | `tiles` + every accepted order in `solutions` |
| `draw` | drawing pad + stroke order | self-graded; needs the character in `src/data/strokes.json` |
| `reveal` | flashcard | self-graded; `record: 'key'` adds the voice recorder |

More options: `hint` / `revealHint` (keyword, text, picture, rules – shown on <kbd>?</kbd> and after mistakes),
`speakWhen: 'prompt'` (audio is the question, e.g. listening), `prompt.audioOnly`, `fastMs` (fast answers count as
“easy”), `generative: true` (random questions per category, like Numbers), `srs: false` (not scheduled). A module can
also add `presets` and `defaultGroups` for the filter, `tools` (extra pages like the kana chart), a `chart` (heatmap on
Stats), a `banner` and an `emptyState`.

Card ids are `module:exercise:item` – renaming an `id` starts that item’s progress from zero.

## Project structure

```
src/core/        module contract (types.ts), SRS engine (srs.ts), sessions, store + IndexedDB, stats, backup, course pack,
                 sync (sync.ts engine, syncMerge.ts merge rules, github.ts API client)
src/lib/         romaji ⇄ kana, katakana for names, furigana alignment, CSV, speech, crypto, router, dates
src/components/  answer widgets, hints, stroke order + drawing pad, recorder, sheet, icons
src/screens/     Home, Study, module page, Session, Review, Stats, Settings
src/modules/     one folder per module + index.ts (the registry)
src/styles/      design tokens (light/dark), base, components
scripts/         course pack (pack/unpack), font subsets for offline, kanji + stroke data builders
```

Data is stored in IndexedDB (`nihongo-app`): progress, daily log, settings, imported lists, your self-introduction,
the unlocked pack, voice recordings and – if connected – the sync connection. **Settings → Backup** exports everything except the pack and recordings as JSON;
importing merges (for each card the newer progress wins).

To rebuild the kanji data or stroke data (only needed when you change the kanji list):
`npm run build:kanji -- kanjidic2.xml.gz JMdict.gz` and `npm run build:strokes -- kanjivg.xml.gz` (files from
[edrdg.org](https://www.edrdg.org) and [KanjiVG](https://kanjivg.tagaini.net)). German kanji meanings are maintained in
`N5_DE` in `scripts/build-kanji.mjs`.

## Credits

- Stroke order: [KanjiVG](https://kanjivg.tagaini.net) © Ulrich Apel, CC BY-SA 3.0
- Kanji readings, meanings and example words: KANJIDIC2 and JMdict © [EDRDG](https://www.edrdg.org), CC BY-SA 4.0
- Fonts: Noto Sans JP and Noto Serif JP, SIL Open Font License
- The mnemonic texts are original. The course pack content (Minna no Nihongo vocabulary, Tofugu pictures) is for
  personal study only and is never published in readable form.
