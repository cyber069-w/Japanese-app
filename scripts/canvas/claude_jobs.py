"""
Overnight jobs that call Claude Code (`claude -p`) from the Mac job: drafts for new slides/notes (I2) and grading of free-text
answers (I3). Everything is OFF until private/canvas-config.json has

  "claude": { "enabled": true, "bin": "claude", "max_per_day": 3 }

Nothing is applied automatically: drafts and gradings go to the inbox, the app asks (Accept / Ignore). A daily budget keeps
the job inside your plan's limits. Nothing leaves the Mac except what `claude -p` itself sends.
"""
import json
import os
import re
import subprocess
import time
from pathlib import Path

DEFAULTS = {'enabled': False, 'bin': 'claude', 'max_per_day': 3, 'timeout': 600}


def settings(config):
    return {**DEFAULTS, **(config.get('claude') or {})}


def budget_left(state_file, cfg, today=None):
    today = today or time.strftime('%Y-%m-%d')
    st = json.loads(state_file.read_text()) if state_file.exists() else {}
    return max(0, cfg['max_per_day'] - st.get(today, 0))


def spend(state_file, today=None):
    today = today or time.strftime('%Y-%m-%d')
    st = json.loads(state_file.read_text()) if state_file.exists() else {}
    st = {today: st.get(today, 0) + 1}
    state_file.write_text(json.dumps(st))


def run_claude(prompt, cfg):
    """One non-interactive call. Returns the text answer or raises RuntimeError."""
    cmd = [os.path.expanduser(cfg['bin']), '-p', prompt, '--output-format', 'text', '--allowedTools', 'Read']
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=cfg['timeout'])
    if r.returncode != 0 or not r.stdout.strip():
        raise RuntimeError((r.stderr or 'empty answer').strip()[:200])
    return r.stdout.strip()


# ---- I2: drafts ---------------------------------------------------------------------------------

def draft_format(subject):
    s = subject.lower()
    if 'japan' in s:
        return 'vocab-csv'
    if 'cfa' in s:
        return 'cfa-json'
    return 'summary'


PROMPTS = {
    'vocab-csv': 'Lies die Datei {path} (Lektion mit Vokabeln). Antworte NUR mit einer CSV-Liste, eine Zeile pro Wort: romaji;deutsche Bedeutung (Hepburn, Semikolon, keine Kopfzeile, keine Erklärungen, Reihenfolge wie im Dokument).',
    'cfa-json': 'Lies die Datei {path} (CFA Level 1 Lektion). Antworte NUR mit EINEM JSON-Objekt: {{"topic": "quant|economics|corporate|fsa|equities|fixed-income|derivatives|alternatives|portfolio|ethics", "module": <Nummer>, "title": "...", "terms": [{{"term": "...", "definition": "..."}}], "formulas": [{{"name": "...", "formula": "...", "note": "..."}}], "questions": [{{"q": "...", "options": ["...", "...", "..."], "answer": 0, "explain": "..."}}], "examples": [{{"title": "...", "problem": "...", "solution": "..."}}]}}. Nur Inhalte aus dem Dokument; 8-15 Begriffe, alle Formeln, 8-12 Fragen mit genau drei Optionen.',
    'summary': 'Lies die Datei {path}. Antworte auf Deutsch mit (1) einer Zusammenfassung in 10 Stichpunkten, (2) den wichtigsten Begriffen mit je einer Zeile Definition, (3) 8 Prüfungsfragen mit Antwort im Format Frage;Antwort (ein Eintrag pro Zeile). Nur Inhalte aus dem Dokument.',
}


def valid_draft(fmt, text):
    if fmt == 'cfa-json':
        m = re.search(r'\{[\s\S]*\}', text)
        try:
            d = json.loads(m.group(0)) if m else None
        except ValueError:
            return False
        return isinstance(d, dict) and bool(d.get('title')) and any(d.get(k) for k in ('terms', 'formulas', 'questions'))
    if fmt == 'vocab-csv':
        rows = [ln for ln in text.splitlines() if ';' in ln]
        return len(rows) >= 3
    return len(text) > 200


def make_drafts(candidates, base, cfg, state_file, done_ids, runner=run_claude):
    """candidates: [{'id','subject','file','to'}] (PDFs newly seen). Returns new drafts; stops when the daily budget is used."""
    out = []
    for c in candidates:
        if c['id'] in done_ids or not c['file'].lower().endswith('.pdf'):
            continue
        if budget_left(state_file, cfg) <= 0:
            break
        fmt = draft_format(c['subject'])
        path = Path(base) / c['to']
        if not path.exists():
            continue
        try:
            text = runner(PROMPTS[fmt].format(path=path), cfg)
            spend(state_file)
        except Exception as e:  # a failing call must never stop the daily job
            print(f"Draft skipped ({c['file']}): {e}")
            continue
        if valid_draft(fmt, text):
            out.append({'id': f"d-{c['id']}", 'subject': c['subject'], 'file': c['file'], 'format': fmt, 'text': text, 'at': time.strftime('%Y-%m-%dT%H:%M:%S')})
        done_ids.add(c['id'])
    return out


# ---- I3: grading --------------------------------------------------------------------------------

GRADE_PROMPT = ('Du bewertest die Antwort eines Studenten. Frage: {question}\nReferenz (Folieninhalt oder Musterpunkte):\n{context}\n\nAntwort des Studenten:\n{answer}\n\n'
                'Antworte NUR mit JSON: {{"score": <Zahl 0-10>, "feedback": "<max. 4 Sätze auf Deutsch: was stimmt, was fehlt, ein konkreter Tipp>"}}')


def parse_grade(text):
    m = re.search(r'\{[\s\S]*\}', text)
    try:
        d = json.loads(m.group(0)) if m else None
    except ValueError:
        return None
    if not isinstance(d, dict) or not isinstance(d.get('score'), (int, float)) or not d.get('feedback'):
        return None
    return {'score': max(0, min(10, round(float(d['score']), 1))), 'feedback': str(d['feedback'])[:600]}


def grade_queue(queue, graded_ids, cfg, state_file, runner=run_claude):
    """queue: [{'id','question','answer','context'}] from the app. Returns results for items not graded yet."""
    out = []
    for q in queue:
        if q['id'] in graded_ids:
            continue
        if budget_left(state_file, cfg) <= 0:
            break
        try:
            text = runner(GRADE_PROMPT.format(question=q['question'], context=q.get('context') or '(keine)', answer=q['answer']), cfg)
            spend(state_file)
        except Exception as e:
            print(f"Grading skipped ({q['id']}): {e}")
            continue
        g = parse_grade(text)
        if g:
            out.append({'id': q['id'], **g, 'at': time.strftime('%Y-%m-%dT%H:%M:%S')})
    return out
