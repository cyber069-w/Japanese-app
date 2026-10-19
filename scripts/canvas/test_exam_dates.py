"""Run: python3 scripts/canvas/test_exam_dates.py"""
import datetime
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('cs', pathlib.Path(__file__).with_name('canvas_sync.py'))
cs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cs)
T = datetime.date(2026, 10, 19)


class ExamDates(unittest.TestCase):
    def test_german_numeric_with_and_without_year(self):
        self.assertEqual(list(cs.find_exam_dates('Die Klausur findet am 15.12.2026 statt.', T)), ['2026-12-15'])
        self.assertEqual(list(cs.find_exam_dates('Schlussprüfung: 14.01.', T)), ['2027-01-14'])  # no year → next such date

    def test_month_names_and_english(self):
        self.assertIn('2026-12-15', cs.find_exam_dates('Prüfung am 15. Dezember 2026', T))
        self.assertIn('2026-12-15', cs.find_exam_dates('The final exam is on December 15, 2026.', T))
        self.assertIn('2026-12-15', cs.find_exam_dates('Midterm exam: 15 December', T))
        self.assertIn('2026-12-15', cs.find_exam_dates('Exam 2026-12-15 room 01', T))

    def test_ignores_past_dates_and_dates_without_exam_word(self):
        self.assertEqual(cs.find_exam_dates('Zweittermin Closed-Book-Test am Freitag, 09.10.2026', T), {})
        self.assertEqual(cs.find_exam_dates('Abgabe der Hausaufgabe bis 25.10.2026', T), {})

    def test_far_future_is_ignored(self):
        self.assertEqual(cs.find_exam_dates('Exam 01.01.2030', T), {})


if __name__ == '__main__':
    unittest.main()
