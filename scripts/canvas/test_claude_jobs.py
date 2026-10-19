"""Run: python3 scripts/canvas/test_claude_jobs.py  (uses a fake runner, never calls Claude)"""
import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import claude_jobs as cj  # noqa: E402

CFG = {**cj.DEFAULTS, 'enabled': True, 'max_per_day': 2}
CFA = json.dumps({'topic': 'quant', 'module': 3, 'title': 'Time value', 'terms': [{'term': 'PV', 'definition': 'x'}]})


class Jobs(unittest.TestCase):
    def setUp(self):
        self.tmp = pathlib.Path(tempfile.mkdtemp())
        self.state = self.tmp / 'state.json'
        (self.tmp / 'a.pdf').write_text('x')

    def test_budget_is_spent_and_respected(self):
        calls = []
        runner = lambda p, c: calls.append(p) or CFA  # noqa: E731
        cands = [{'id': str(i), 'subject': 'CFA', 'file': f'{i}.pdf', 'to': 'a.pdf'} for i in range(5)]
        out = cj.make_drafts(cands, self.tmp, CFG, self.state, set(), runner)
        self.assertEqual(len(out), 2)
        self.assertEqual(len(calls), 2)
        self.assertEqual(cj.budget_left(self.state, CFG), 0)

    def test_formats_by_subject_and_validation(self):
        self.assertEqual([cj.draft_format(s) for s in ('Japanisch', 'CFA', 'Mikro')], ['vocab-csv', 'cfa-json', 'summary'])
        self.assertTrue(cj.valid_draft('cfa-json', 'Hier: ' + CFA))
        self.assertFalse(cj.valid_draft('cfa-json', 'nothing'))
        self.assertTrue(cj.valid_draft('vocab-csv', 'a;b\nc;d\ne;f'))
        self.assertFalse(cj.valid_draft('vocab-csv', 'only one line'))

    def test_failures_do_not_stop_the_job_and_cost_nothing(self):
        def boom(p, c):
            raise RuntimeError('offline')
        out = cj.make_drafts([{'id': '1', 'subject': 'CFA', 'file': 'a.pdf', 'to': 'a.pdf'}], self.tmp, CFG, self.state, set(), boom)
        self.assertEqual(out, [])
        self.assertEqual(cj.budget_left(self.state, CFG), 2)

    def test_done_files_and_non_pdfs_are_skipped(self):
        out = cj.make_drafts([{'id': '1', 'subject': 'CFA', 'file': 'a.pdf', 'to': 'a.pdf'}, {'id': '2', 'subject': 'CFA', 'file': 'b.docx', 'to': 'a.pdf'}], self.tmp, CFG, self.state, {'1'}, lambda p, c: CFA)
        self.assertEqual(out, [])

    def test_grading(self):
        self.assertEqual(cj.parse_grade('Ergebnis: {"score": 7.26, "feedback": "Gut."}'), {'score': 7.3, 'feedback': 'Gut.'})
        self.assertIsNone(cj.parse_grade('{"score": "x"}'))
        res = cj.grade_queue([{'id': 'a', 'question': 'Q', 'answer': 'A'}, {'id': 'b', 'question': 'Q', 'answer': 'A'}], {'b'}, CFG, self.state, lambda p, c: '{"score": 5, "feedback": "ok"}')
        self.assertEqual([r['id'] for r in res], ['a'])


if __name__ == '__main__':
    unittest.main()
