#!/usr/bin/env python3
"""
Removes the diagonal "FREEFELLOW.ORG" watermark from the private lesson PDFs (the user has the owner's permission;
the files stay private and ship only encrypted). The watermark is one text block per page: drawn under a 45° rotation
matrix, size 80, in the Cinzel font. Only blocks matching all three are removed; everything else on the page is untouched.

Needs pypdf (e.g. in a virtualenv):  python -I scripts/cfa/remove-watermark.py private/cfa/lessons-original-pdf private/cfa/lessons
Reads every <topic>/*.pdf under the first folder and writes the cleaned file to the same path under the second.
Then run: node scripts/cfa/build-pdfs.mjs
"""
import glob
import os
import re
import sys

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream

src, dst = sys.argv[1], sys.argv[2]
BLOCK = re.compile(rb'q\s+([\d.]+)\s+\1\s+\1\s+-\1\s+[-\d.]+\s+[-\d.]+\s+cm\s+BT\b.*?\bET\s+Q', re.S)
FONT = re.compile(rb'\b80 0 0 -80 [-\d.]+ [-\d.]+ Tm\s+/(\w+)')

files = removed = 0
problems = []
for f in sorted(glob.glob(os.path.join(src, '*', '*.pdf'))):
    writer = PdfWriter(clone_from=PdfReader(f))
    for n, page in enumerate(writer.pages, 1):
        data = page.get_contents().get_data()
        fonts = page['/Resources']['/Font'].get_object()

        def drop(m):
            hit = FONT.search(m.group(0))
            if hit and 'Cinzel' in str(fonts['/' + hit.group(1).decode()].get_object()['/BaseFont']):
                return b''
            return m.group(0)

        new, count = re.subn(BLOCK, lambda m: drop(m), data)
        gone = count - len([m for m in BLOCK.finditer(new)])
        if gone != 1:
            problems.append(f'{f} page {n}: removed {gone}')
        removed += gone
        cs = ContentStream(None, writer)
        cs.set_data(new)
        page.replace_contents(cs)
        page.compress_content_streams()
    out = os.path.join(dst, os.path.relpath(f, src))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    writer.compress_identical_objects()
    with open(out, 'wb') as fh:
        writer.write(fh)
    files += 1
print(f'{files} files, {removed} watermarks removed')
for p in problems[:20]:
    print('CHECK', p)
