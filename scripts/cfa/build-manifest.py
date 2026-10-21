#!/usr/bin/env python3
"""
Splits the extracted FreeFellow text (private/cfa/lessons.txt) into lessons: writes private/cfa/manifest.json and
private/cfa/lessons/<topic>/NN-title.txt. A lesson starts on the page whose text has a line that is one of the 10 topic
headers (upper case) followed by the lesson title. Run from the app folder:
  swift scripts/cfa/pdftext.swift ~/Desktop/cfa-level1-lessons.pdf private/cfa/lessons.txt
  python3 scripts/cfa/build-manifest.py
  swift scripts/cfa/split.swift ~/Desktop/cfa-level1-lessons.pdf "$PWD/private/cfa"     # per-lesson PDFs
Known quirk: lessons 5 and 10 of Quantitative Methods get wrong titles from the page header ("freefellow.org",
"v1.30.0 89 FreeFellow") – real titles: "The Return and Risk of a Financial Portfolio", "The Time Value of Money in Finance".
Always check the first lines of each .txt for such garbage titles in the other topics too.
"""
import json
import os
import re
import unicodedata

t = open('private/cfa/lessons.txt').read()
parts = re.split(r'\n\n=====PAGE (\d+)=====\n', t)
P = {int(parts[i]): parts[i + 1] for i in range(1, len(parts), 2)}
TOP = {'QUANTITATIVE METHODS': 'quant', 'ECONOMICS': 'economics', 'CORPORATE ISSUERS': 'corporate', 'FINANCIAL STATEMENT ANALYSIS': 'fsa',
       'EQUITY INVESTMENTS': 'equities', 'FIXED INCOME': 'fixed-income', 'DERIVATIVES': 'derivatives', 'ALTERNATIVE INVESTMENTS': 'alternatives',
       'PORTFOLIO MANAGEMENT': 'portfolio', 'ETHICAL AND PROFESSIONAL STANDARDS': 'ethics'}
starts = []
for n in sorted(P):
    lines = [x.strip() for x in P[n].split('\n')]
    for i, line in enumerate(lines[:-1]):
        if line in TOP and lines[i + 1]:
            starts.append((n, TOP[line], lines[i + 1]))
            break
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()).strip('-')[:60]
man, cnt = [], {}
for i, (n, topic, title) in enumerate(starts):
    end = (starts[i + 1][0] - 1) if i + 1 < len(starts) else max(P)
    cnt[topic] = cnt.get(topic, 0) + 1
    f = f"{topic}/{cnt[topic]:02d}-{slug(title)}"
    os.makedirs(f"private/cfa/lessons/{topic}", exist_ok=True)
    body = '\n'.join(P[p] for p in range(n, end + 1))
    open(f"private/cfa/lessons/{f}.txt", 'w').write(f"{title}\n(topic: {topic}, pages {n}-{end})\n\n{body}")
    man.append({'topic': topic, 'module': cnt[topic], 'title': title, 'startPage': n, 'endPage': end, 'file': f, 'chars': len(body)})
json.dump(man, open('private/cfa/manifest.json', 'w'), indent=1, ensure_ascii=False)
print(len(man), cnt)
