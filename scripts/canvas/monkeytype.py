"""
Monkeytype typing stats for the app (Focus → Typing). Read once a day by the Mac job with your ApeKey.

Needs private/monkeytype.json: {"apeKey": "..."} – make the key on monkeytype.com → Account settings → Ape keys
→ Generate, then switch it to *active*. Without the file nothing happens.
Uses GET /results (30 calls a day allowed with an ApeKey; the job makes one) and GET /users/stats.
"""
import datetime
import json
import urllib.error
import urllib.request

API = 'https://api.monkeytype.com'


def _get(path, key):
    req = urllib.request.Request(API + path, headers={'Authorization': 'ApeKey ' + key, 'User-Agent': 'StudyDesk'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get('data')


def summarize(results, stats=None, today=None):
    """Last 7 days (tests, minutes, average/best wpm, average accuracy), wpm per day for 14 days, the 5 latest tests and totals."""
    today = today or datetime.date.today()
    day = lambda r: datetime.datetime.fromtimestamp(r['timestamp'] / 1000).date()
    week = [r for r in results if (today - day(r)).days < 7]
    avg = lambda xs: round(sum(xs) / len(xs), 1) if xs else None
    days = []
    for i in range(13, -1, -1):
        d = today - datetime.timedelta(days=i)
        rs = [r for r in results if day(r) == d]
        if rs:
            days.append({'date': d.isoformat(), 'tests': len(rs), 'minutes': round(sum(r.get('testDuration', 0) for r in rs) / 60, 1), 'wpm': avg([r['wpm'] for r in rs])})
    recent = sorted(results, key=lambda r: r['timestamp'], reverse=True)[:5]
    out = {
        'week': {'tests': len(week), 'minutes': round(sum(r.get('testDuration', 0) for r in week) / 60, 1),
                 'wpm': avg([r['wpm'] for r in week]), 'best': max((r['wpm'] for r in week), default=None), 'acc': avg([r['acc'] for r in week])},
        'days': days,
        'recent': [{'at': datetime.datetime.fromtimestamp(r['timestamp'] / 1000).isoformat(timespec='minutes'), 'wpm': r['wpm'], 'acc': r['acc'],
                    'test': f"{r.get('mode', '')} {r.get('mode2', '')}".strip()} for r in recent],
    }
    if stats:
        out['total'] = {'tests': stats.get('completedTests', 0), 'hours': round((stats.get('timeTyping') or 0) / 3600, 1)}
    return out


def collect(private_dir, old=None):
    """Stats from Monkeytype, or None without a key file. A failed call keeps the last stats and says what went wrong."""
    cfg_file = private_dir / 'monkeytype.json'
    if not cfg_file.exists():
        return None
    key = (json.loads(cfg_file.read_text()).get('apeKey') or '').strip()
    if not key:
        return None
    stamp = datetime.datetime.now().isoformat(timespec='seconds')
    since = int((datetime.datetime.now() - datetime.timedelta(days=14)).timestamp() * 1000)
    try:
        results = _get(f'/results?onOrAfterTimestamp={since}&limit=1000', key) or []
        try:
            stats = _get('/users/stats', key)
        except Exception:
            stats = None
        return {'at': stamp, **summarize(results, stats)}
    except urllib.error.HTTPError as e:
        why = 'ApeKey not accepted – is it switched to active?' if e.code in (401, 403) else f'Monkeytype answered HTTP {e.code}'
    except Exception as e:
        why = f'Monkeytype not reachable ({type(e).__name__})'
    return {**(old or {}), 'at': stamp, 'error': why}
