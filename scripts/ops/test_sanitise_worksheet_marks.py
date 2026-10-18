"""The three-step marks rule of sanitise_worksheet_marks.py: mark scheme marks, else question paper marks, else practice only."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sanitise_worksheet_marks as s


def rec(*marks):
    return {"answers": [{"questionNumber": str(i + 1), "marks": m} for i, m in enumerate(marks)]}


class Decide(unittest.TestCase):
    def test_mark_scheme_marks_kept_when_they_add_up(self):
        self.assertEqual(s.decide(rec(2, 4, 2), 8, [("1", 1)]), ("mark scheme", None))

    def test_question_paper_marks_used_when_mark_scheme_is_misread(self):
        source, marks = s.decide(rec(1, 1, 1), 8, [("1", 2), ("2", 4), ("3", 2)])
        self.assertEqual((source, marks), ("question paper", {"1": 2, "2": 4, "3": 2}))

    def test_practice_only_when_neither_adds_up(self):
        self.assertEqual(s.decide(rec(0, 0, 0), 8, [("1", 2), ("2", 4), ("3", 1)]), (None, None))

    def test_a_question_without_brackets_blocks_the_paper_rule(self):
        self.assertEqual(s.decide(rec(0, 0), 6, [("1", 0), ("2", 6)]), (None, None))

    def test_answer_block_without_a_question_blocks_the_paper_rule(self):
        self.assertEqual(s.decide(rec(0, 0, 0), 8, [("1", 4), ("2", 4)]), (None, None))

    def test_duplicate_question_numbers_are_never_guessed(self):
        self.assertEqual(s.decide(rec(0, 0), 8, [("1", 4), ("1", 4)]), (None, None))


if __name__ == "__main__":
    unittest.main()
