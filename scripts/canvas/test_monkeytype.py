"""Run: python3 scripts/canvas/test_monkeytype.py"""
import datetime
import importlib.util
import json
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('mt', pathlib.Path(__file__).with_name('monkeytype.py'))
mt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mt)
T = datetime.date(2026, 10, 22)


def res(days_ago, wpm, acc=95.0, secs=30):
    at = datetime.datetime.combine(T - datetime.timedelta(days=days_ago), datetime.time(10, 0))
    return {'timestamp': at.timestamp() * 1000, 'wpm': wpm, 'acc': acc, 'testDuration': secs, 'mode': 'time', 'mode2': '30'}


class Summary(unittest.TestCase):
    def test_week_days_recent_total(self):
        s = mt.summarize([res(0, 80), res(0, 90, 97), res(3, 70), res(10, 60)], {'completedTests': 412, 'timeTyping': 9000}, T)
        self.assertEqual(s['week'], {'tests': 3, 'minutes': 1.5, 'wpm': 80.0, 'best': 90, 'acc': 95.7})  # the 10-day-old test is outside the week
        self.assertEqual([d['date'] for d in s['days']], ['2026-10-12', '2026-10-19', '2026-10-22'])
        self.assertEqual(s['days'][-1], {'date': '2026-10-22', 'tests': 2, 'minutes': 1.0, 'wpm': 85.0})
        self.assertEqual(len(s['recent']), 4)
        self.assertEqual(s['recent'][0]['test'], 'time 30')
        self.assertEqual(s['total'], {'tests': 412, 'hours': 2.5})

    def test_no_tests(self):
        s = mt.summarize([], None, T)
        self.assertEqual(s['week'], {'tests': 0, 'minutes': 0.0, 'wpm': None, 'best': None, 'acc': None})
        self.assertNotIn('total', s)

    def test_no_key_file_means_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertIsNone(mt.collect(pathlib.Path(d)))
            (pathlib.Path(d) / 'monkeytype.json').write_text(json.dumps({'apeKey': ''}))
            self.assertIsNone(mt.collect(pathlib.Path(d)))


if __name__ == '__main__':
    unittest.main()
