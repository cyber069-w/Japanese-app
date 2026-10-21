#!/usr/bin/env python3
"""
After writing private/cfa/packs/<topic>-NN.json: shuffles the answer options of every question (so the right answer is not
always B – the first drafts had 84 of 145 on index 1) and builds <topic>-all.json for the app's Import lesson.
Usage: python3 scripts/cfa/combine-packs.py quant      (run ONCE per new pack file, the shuffle is not idempotent in intent but is harmless to repeat)
"""
import glob
import json
import random
import sys

topic = sys.argv[1]
random.seed(hash(topic) & 0xFFFF)
files = sorted(glob.glob(f'private/cfa/packs/{topic}-[0-9][0-9].json'))
for f in files:
    p = json.load(open(f))
    for q in p['questions']:
        correct = q['options'][q['answer']]
        random.shuffle(q['options'])
        q['answer'] = q['options'].index(correct)
    json.dump(p, open(f, 'w'), ensure_ascii=False, indent=2)
json.dump({'lessons': [json.load(open(f)) for f in files]}, open(f'private/cfa/packs/{topic}-all.json', 'w'), ensure_ascii=False, indent=1)
print(len(files), 'packs combined')
