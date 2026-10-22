#!/usr/bin/env python3
"""
Puts the guided lessons (private/cfa/learn/<topic>-NN.json: {"learn": {...}, "de": {term: German}, "plain": {term: plain meaning}}) into the packs
(private/cfa/packs/<topic>-NN.json) and rebuilds <topic>-all.json – without reshuffling the answer options.
Usage: python3 scripts/cfa/merge-learn.py quant
"""
import glob
import json
import os
import sys

topic = sys.argv[1]
for f in sorted(glob.glob(f'private/cfa/learn/{topic}-[0-9][0-9].json')):
    g = json.load(open(f))
    p = f'private/cfa/packs/{os.path.basename(f)}'
    pack = json.load(open(p))
    pack['learn'] = g['learn']
    for t in pack['terms']:
        if t['term'] in g.get('de', {}):
            t['de'] = g['de'][t['term']]
        if t['term'] in g.get('plain', {}):
            t['plain'] = g['plain'][t['term']]
    json.dump(pack, open(p, 'w'), ensure_ascii=False, indent=2)
files = sorted(glob.glob(f'private/cfa/packs/{topic}-[0-9][0-9].json'))
json.dump({'lessons': [json.load(open(f)) for f in files]}, open(f'private/cfa/packs/{topic}-all.json', 'w'), ensure_ascii=False, indent=1)
print(sum('learn' in json.load(open(f)) for f in files), 'of', len(files), 'packs have a guided lesson')
