#!/usr/bin/env python3
"""
Canvas → course folders. Fetches the files of your Canvas courses and sorts them into your
OneDrive course folders, following the rules in private/canvas-config.json.

  python3 scripts/canvas/canvas_sync.py            # dry run: shows what would happen, changes nothing
  python3 scripts/canvas/canvas_sync.py --download # downloads the planned files

Safety rules:
  - Never overwrites or deletes anything. A file that changed in Canvas is saved next to the old one
    as "<name> (Version YYYY-MM-DD).pdf" and listed in the report.
  - Files you already have (same name, also with "-1"/"-2"/"(1)" suffixes, or same size) are not fetched again.
  - Only files matched by a rule are downloaded ("planned"); everything else is listed as optional.

Needs: private/canvas-token.txt (your Canvas access token), private/canvas-config.json.
  python3 scripts/canvas/canvas_sync.py --inbox  # only refresh deadlines / announcements

Writes: private/canvas-state.json (what was fetched), private/canvas-report.json (last run),
        private/canvas-inbox.json (deadlines, announcements and new files – read by the app's bell).
"""
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / 'private'
TOKEN = (PRIVATE / 'canvas-token.txt').read_text().strip()
CONFIG = json.loads((PRIVATE / 'canvas-config.json').read_text())
STATE_FILE = PRIVATE / 'canvas-state.json'
REPORT_FILE = PRIVATE / 'canvas-report.json'
API = CONFIG['canvas'].rstrip('/') + '/api/v1/'
BASE = Path(os.path.expanduser(CONFIG['base']))
SUBFOLDERS = CONFIG.get('subfolders', ['Vorlesungen', 'Übungen', 'Prüfungen', 'Zusatzmaterial', 'Abgaben und Projekte', 'Archiv'])


def get(path, raw=False):
    """GET with paging (follows rel="next")."""
    url = path if path.startswith('http') else API + path
    out = []
    while url:
        req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + TOKEN})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                if raw:
                    return r.read()
                data = json.load(r)
                link = r.headers.get('Link', '')
        except urllib.error.HTTPError as e:
            return {'error': e.code}
        if not isinstance(data, list):
            return data
        out += data
        m = re.search(r'<([^>]+)>; rel="next"', link)
        url = m.group(1) if m else None
    return out


IMAGE_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.heic'}


def nfc(s):
    return unicodedata.normalize('NFC', s)


def key(name):
    """Comparable file name: no extension, no download suffixes (-1, (2)), no spacing/dash differences."""
    stem = re.sub(r'\.[A-Za-z0-9]{1,5}$', '', nfc(name).strip()).lower()
    stem = re.sub(r'(\s*\(\d+\)|-\d)$', '', stem.strip())
    return re.sub(r'[\s_\-–—]+', '_', stem).strip('_')


GUESS = [
    ('Prüfungen', r'prüfung|pruefung|klausur|exam|mock|probe|antwortbogen|lösungen \(|beilage'),
    ('Übungen', r'übung|uebung|aufgabe|lösung|loesung|serie|series|exercise|tutorium|session|lernkontroll'),
    ('Vorlesungen', r'vorlesung|folien|slides|handout|\bvl\d|woche|lecture|skript|sitzung'),
]


def guess(name, module):
    text = f'{name} {module}'.lower()
    for folder, rx in GUESS:
        if re.search(rx, text):
            return folder
    return 'Zusatzmaterial'


def matches(rule, f):
    for field, value in (('module', f['module']), ('page', f.get('page') or ''), ('file', f['name'])):
        if field in rule and not re.search(rule[field], value, re.I):
            return False
    if 'exclude' in rule and re.search(rule['exclude'], f['name'], re.I):
        return False
    return True


def course_files(cid):
    """Every file of a course: module items and files linked from module pages."""
    mods = get(f'courses/{cid}/modules?include[]=items&per_page=100')
    if not isinstance(mods, list):
        return [], f'modules not readable ({mods.get("error")})'
    found = {}
    for m in mods:
        for it in m.get('items', []):
            if it['type'] == 'File':
                found.setdefault(it['content_id'], {'module': m['name'], 'page': None})
            elif it['type'] == 'Page' and it.get('page_url'):
                pg = get(f'courses/{cid}/pages/{it["page_url"]}')
                body = pg.get('body') or '' if isinstance(pg, dict) else ''
                for fid in set(re.findall(r'/files/(\d+)', body)):
                    found.setdefault(int(fid), {'module': m['name'], 'page': it['page_url']})
    files = []
    for fid, where in found.items():
        meta = get(f'courses/{cid}/files/{fid}')
        if not isinstance(meta, dict) or 'error' in meta or not meta.get('url'):
            continue
        name = nfc(meta.get('display_name') or meta.get('filename') or str(fid))
        ext = os.path.splitext(meta.get('filename') or '')[1]
        if ext and not name.lower().endswith(ext.lower()):
            name += ext
        if (meta.get('content-type') or '').startswith('image/') or ext.lower() in IMAGE_EXT:
            continue  # banners, icons and photos on course pages
        files.append({'id': fid, 'name': name, 'size': meta.get('size') or 0, 'updated': meta.get('updated_at') or '', 'url': meta['url'], **where})
    return files, None


def local_index(folder):
    idx = []
    if folder.exists():
        for p in folder.rglob('*'):
            if p.is_file() and not p.name.startswith('.'):
                idx.append((key(p.name), p.stat().st_size, p))
    return idx


def safe_name(name):
    return re.sub(r'[/:]', '-', name).strip()


def free_path(path):
    if not path.exists():
        return path
    stem, ext = os.path.splitext(path.name)
    n = 2
    while (path.parent / f'{stem} ({n}){ext}').exists():
        n += 1
    return path.parent / f'{stem} ({n}){ext}'


def plain(html, limit=400):
    text = re.sub(r'<[^>]+>', ' ', html or '')
    text = re.sub(r'&nbsp;|\xa0', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:limit] + ('…' if len(text) > limit else '')


def collect_inbox(new_files):
    """Upcoming deadlines (not yet submitted), announcements of the last 30 days and recently fetched files."""
    since = time.strftime('%Y-%m-%dT00:00:00Z', time.gmtime(time.time() - 30 * 86400))
    folder_of = {c['id']: c['folder'] for c in CONFIG['courses']}
    name_of = {c['id']: c.get('name', c['folder']) for c in CONFIG['courses']}
    deadlines, announcements = {}, []
    for cid in folder_of:
        items = get(f'courses/{cid}/assignments?bucket=future&per_page=100')
        for a in items if isinstance(items, list) else []:
            if not a.get('due_at') or a.get('has_submitted_submissions'):
                continue
            deadlines[f"a{a['id']}"] = {'id': f"a{a['id']}", 'course': name_of[cid], 'subject': folder_of[cid], 'title': a['name'].strip(),
                                        'due': a['due_at'], 'url': a.get('html_url'), 'kind': 'quiz' if 'online_quiz' in (a.get('submission_types') or []) else 'assignment'}
    todo = get('users/self/todo?per_page=50')
    for t in todo if isinstance(todo, list) else []:
        a = t.get('assignment') or {}
        cid = a.get('course_id')
        if a.get('id') and f"a{a['id']}" not in deadlines and cid in folder_of:
            deadlines[f"a{a['id']}"] = {'id': f"a{a['id']}", 'course': name_of[cid], 'subject': folder_of[cid], 'title': (a.get('name') or '').strip(),
                                        'due': a.get('due_at'), 'url': a.get('html_url'), 'kind': 'todo'}
    codes = '&'.join(f'context_codes[]=course_{cid}' for cid in folder_of)
    ann = get(f'announcements?{codes}&start_date={since}&per_page=100')
    for x in ann if isinstance(ann, list) else []:
        cid = int(x.get('context_code', 'course_0').split('_')[1])
        announcements.append({'id': f"n{x['id']}", 'course': name_of.get(cid, ''), 'subject': folder_of.get(cid, ''), 'title': x.get('title', '').strip(),
                              'posted': x.get('posted_at'), 'text': plain(x.get('message')), 'url': x.get('html_url')})
    inbox_file = PRIVATE / 'canvas-inbox.json'
    old = json.loads(inbox_file.read_text()) if inbox_file.exists() else {}
    stamp = time.strftime('%Y-%m-%dT%H:%M:%S')
    files = [{'id': f"f{i}-{f['file']}", 'subject': f['course'], 'file': f['file'], 'to': f['to'], 'at': stamp} for i, f in enumerate(new_files)] + old.get('files', [])
    inbox = {'at': stamp, 'deadlines': sorted(deadlines.values(), key=lambda d: d['due'] or ''), 'announcements': sorted(announcements, key=lambda a: a['posted'] or '', reverse=True), 'files': files[:60]}
    inbox_file.write_text(json.dumps(inbox, ensure_ascii=False, indent=1))
    push_to_sync_repo()
    return inbox


def push_to_sync_repo():
    """Copies the inbox, encrypted, into the device-sync repo so the phone can read it (skips if not set up)."""
    node = Path.home() / '.local/node/bin/node'
    try:
        r = subprocess.run([str(node) if node.exists() else 'node', str(ROOT / 'scripts/canvas/push-inbox.mjs')], capture_output=True, text=True, timeout=120)
        print((r.stdout or r.stderr).strip())
    except Exception as e:  # never let the phone copy break the daily job
        print(f'Phone copy skipped: {e}')


def main():
    if '--inbox' in sys.argv:
        inbox = collect_inbox([])
        print(f"Inbox: {len(inbox['deadlines'])} deadlines, {len(inbox['announcements'])} announcements")
        return
    download = '--download' in sys.argv
    state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    report = {'at': time.strftime('%Y-%m-%dT%H:%M:%S'), 'downloaded': [], 'versions': [], 'planned': [], 'existing': [], 'optional': [], 'problems': []}
    for course in CONFIG['courses']:
        folder = BASE / course['folder']
        files, problem = course_files(course['id'])
        if problem:
            report['problems'].append(f"{course['folder']}: {problem}")
        have = local_index(folder)
        for f in files:
            sid = str(f['id'])
            rule = next((r for r in course.get('rules', []) if matches(r, f)), None)
            entry = {'course': course['folder'], 'file': f['name'], 'module': f['module']}
            known = state.get(sid)
            if known:
                # already fetched: only a changed file counts (newer and different size)
                if f['updated'] > known['updated'] and f['size'] != known['size'] and rule:
                    stem, ext = os.path.splitext(safe_name(f['name']))
                    target = free_path(Path(known['path']).parent / f"{stem} (Version {f['updated'][:10]}){ext}")
                    report['versions'].append({**entry, 'to': str(target.relative_to(BASE))})
                    if download:
                        target.write_bytes(get(f['url'], raw=True))
                        state[sid] = {'path': str(target), 'updated': f['updated'], 'size': f['size']}
                continue
            match = next((p for k, size, p in have if k == key(f['name']) or (f['size'] and size == f['size'] and p.suffix.lower() == os.path.splitext(f['name'])[1].lower())), None)
            if match:
                state[sid] = {'path': str(match), 'updated': f['updated'], 'size': f['size'], 'existing': True}
                report['existing'].append({**entry, 'to': str(match.relative_to(BASE))})
                continue
            if not rule:
                report['optional'].append({**entry, 'to': guess(f['name'], f['module'])})
                continue
            target = free_path(folder / rule['to'] / safe_name(f['name']))
            report['planned'].append({**entry, 'to': str(target.relative_to(BASE)), 'size': f['size']})
            if download:
                target.parent.mkdir(parents=True, exist_ok=True)
                tmp = target.with_name(target.name + '.part')
                tmp.write_bytes(get(f['url'], raw=True))
                tmp.rename(target)
                state[sid] = {'path': str(target), 'updated': f['updated'], 'size': f['size']}
                report['downloaded'].append({**entry, 'to': str(target.relative_to(BASE))})
                have.append((key(target.name), f['size'], target))
    if download:
        STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=1))
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=1))
    inbox = collect_inbox(report['downloaded'] + report['versions'] if download else [])

    def show(title, rows, with_to=True):
        print(f'\n{title}: {len(rows)}')
        last = None
        for r in rows:
            if r['course'] != last:
                print(f"  {r['course']}")
                last = r['course']
            print(f"    - {r['file']}" + (f"  →  {r['to'].split('/', 1)[1] if '/' in r['to'] else r['to']}" if with_to else ''))

    print(f"{'DOWNLOAD' if download else 'DRY RUN – nothing changed'} · {report['at']}")
    if download:
        print(f"Already in your folders (recognised, not fetched again): {len(report['existing'])}")
    else:
        show('Already in your folders (recognised, not fetched again)', report['existing'])
    show('Downloaded' if download else 'Would download', report['downloaded'] if download else report['planned'])
    if report['versions']:
        show('Changed in Canvas – new version saved next to the old one' if download else 'Changed in Canvas – would save a new version', report['versions'])
    if download:
        print(f"\nOptional (not downloaded): {len(report['optional'])} – run without --download to see them")
    else:
        show('Optional (not downloaded, suggested folder)', report['optional'])
    for p in report['problems']:
        print('Problem:', p)
    print(f"\nInbox for the app: {len(inbox['deadlines'])} deadlines, {len(inbox['announcements'])} announcements, {len(inbox['files'])} new files")


if __name__ == '__main__':
    main()
