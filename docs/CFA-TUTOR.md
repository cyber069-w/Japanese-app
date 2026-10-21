# CFA tutor – setup and prompts

The FreeFellow lessons are **not** in this repository or on the public site (third-party material). They live on your Mac in
`private/cfa/` (git-ignored): `manifest.json`, and per lesson a `.pdf` and a `.txt` in `private/cfa/lessons/<topic>/`
(105 lessons, ~23 000 characters each on average, the longest ~40 000).

## A. Today, without API credits: a Claude Project

1. claude.ai → Projects → **New project** "CFA Level 1".
2. Project **instructions**: paste the system prompt below.
3. Project **knowledge**: upload the lesson PDFs (all 105, or one topic at a time – start with the topics you study now).
4. Copy the project's URL → app → Settings → Tutor → CFA Level 1. "Ask tutor" in the app then opens that project with a prompt copied.
5. In each chat start with the "cover this lesson" prompt (below) and name the lesson exactly as in the file name.

For study packs (terms, formulas, questions) attach **one lesson PDF** to a normal chat together with the pack prompt from the app
(CFA → Import lesson → "Copy prompt"). One lesson per chat gives the best quality. Paste the JSON answer into Import lesson.
Packs sync to your other devices through your private sync repo; the lesson text itself never leaves your Mac/Claude account.

## B. Later, with API credits

There are no "Projects" in the API. A tutor in the app would send, per question: system prompt + the text of **one** lesson
(~6 000 tokens, cached after the first call so follow-up questions cost very little) + your chat history. Needs:
- a key stored only on the device (never in the repo or sync) – this changes your rule "secrets only in `private/` on the Mac",
  so decide first; the alternative is a Mac-side relay (answers arrive with a delay, like the overnight grading);
- the lesson texts on the device: a Mac job can push them encrypted to the sync repo like the Canvas inbox.

## C. System prompt (project instructions / API system prompt)

```
You are my CFA Level I tutor. I am a German-speaking student preparing for the exam; the exam is in English.
Rules:
1. Base every answer on the lesson material provided (the attached/project lesson files). If the material does not cover
   something, say so first, then answer from general CFA knowledge and mark it "(outside the lesson)". Never invent formulas,
   numbers or definitions; if unsure, say you are unsure.
2. Keep CFA terms, formulas and symbols in English exactly as the curriculum uses them. Explain in English by default; switch
   to German only when I ask. Keep answers short and exam-oriented.
3. Teach, don't just answer: first a one-line answer, then the reasoning, then (for calculations) the steps with the formula,
   then one common exam trap ("Exam trap") if the lesson names one.
4. When I ask to be tested: ask one question at a time in CFA exam style (three options A/B/C), wait for my answer, then give
   the correct answer with the explanation and where it is in the lesson (section title).
5. Cite the lesson title and section for facts you use. Don't quote long passages; paraphrase.
6. If my question is ambiguous or mixes lessons, ask which lesson I mean.
```

## D. "Cover this lesson" prompt (first message of a chat)

```
Lesson: <exact lesson title, e.g. "Benchmarking Returns"> (topic: <topic>).
Use only this lesson as the source. Please:
1. Give me the lesson in 10 bullet points (what the exam tests).
2. List every formula with a one-line "when to use it".
3. Quiz me: 5 exam-style questions, one at a time, starting easy.
Then wait for my first answer.
```

Variants: "Explain <concept> from this lesson with a worked example", "Find the exam traps in this lesson", "Make 10 flashcards (term ⇥ definition) from this lesson".
