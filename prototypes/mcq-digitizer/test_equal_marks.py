"""Run: python3 -m unittest test_equal_marks   (from prototypes/mcq-digitizer)"""
import unittest
from extract_mcq import apply_equal_marks

COVER = "Answer both questions.\nAll questions in this paper carry equal marks.\nFor Examiner's Use"
blk = lambda n, m=0: {"questionNumber": str(n), "marks": m}

class EqualMarks(unittest.TestCase):
    def test_two_questions_share_forty(self):
        self.assertEqual([b["marks"] for b in apply_equal_marks([blk(1), blk(2)], COVER)], [20, 20])
    def test_four_questions(self):
        self.assertEqual([b["marks"] for b in apply_equal_marks([blk(i) for i in range(1, 5)], COVER)], [10] * 4)
    def test_printed_marks_are_never_overridden(self):
        out = apply_equal_marks([blk(1, 15), blk(2, 25)], COVER)
        self.assertEqual([b["marks"] for b in out], [15, 25])
    def test_one_printed_mark_means_leave_it_alone(self):
        self.assertEqual([b["marks"] for b in apply_equal_marks([blk(1, 20), blk(2, 0)], COVER)], [20, 0])
    def test_needs_the_equal_marks_sentence(self):
        self.assertEqual([b["marks"] for b in apply_equal_marks([blk(1), blk(2)], "Answer both questions.")], [0, 0])
    def test_uneven_split_is_refused_not_guessed(self):
        self.assertEqual([b["marks"] for b in apply_equal_marks([blk(1), blk(2), blk(3)], COVER)], [0, 0, 0])
    def test_sentence_survives_line_breaks_and_case(self):
        self.assertEqual(apply_equal_marks([blk(1), blk(2)], "ALL  questions in this paper\ncarry equal marks")[0]["marks"], 20)
    def test_no_questions(self):
        self.assertEqual(apply_equal_marks([], COVER), [])
    def test_does_not_change_input(self):
        src = [blk(1), blk(2)]
        apply_equal_marks(src, COVER)
        self.assertEqual([b["marks"] for b in src], [0, 0])

if __name__ == "__main__":
    unittest.main()
