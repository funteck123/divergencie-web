"""Run: python3 -m unittest test_marks_column   (from prototypes/mcq-digitizer)"""
import unittest
from extract_mcq import marks_column_total, marks_without_subtotal

L = lambda text, page, y0, x0, bold=False: {"text": text, "page": page, "y0": y0, "x0": x0, "bold": bold}
HEADER = [L("Question", 0, 70, 120), L("Answer", 0, 70, 400), L("Marks", 0, 70, 790)]

class MarksColumn(unittest.TestCase):
    def test_sums_the_bare_numbers_in_the_marks_column(self):
        lines = HEADER + [L("1(a)(i)", 0, 100, 110), L("4", 0, 100, 800), L("1(a)(ii)", 0, 200, 110), L("1", 0, 200, 800), L("1(a)(iii)", 0, 300, 110), L("5", 0, 300, 800)]
        self.assertEqual(marks_column_total(lines, 0, 90, 0, None), 10)
    def test_numbers_in_the_answer_column_do_not_count(self):
        lines = HEADER + [L("1", 0, 100, 200), L("2", 0, 130, 200), L("3", 0, 160, 200), L("4", 0, 100, 800)]
        self.assertEqual(marks_column_total(lines, 0, 90, 0, None), 4)
    def test_only_the_block_range_counts(self):
        lines = HEADER + [L("4", 0, 100, 800), L("1", 0, 200, 800), L("5", 0, 300, 800)]
        self.assertEqual(marks_column_total(lines, 0, 190, 0, 290), 1)
    def test_each_page_uses_its_own_header(self):
        lines = HEADER + [L("Marks", 1, 70, 760), L("3", 0, 100, 800), L("2", 1, 100, 770)]
        self.assertEqual(marks_column_total(lines, 0, 90, 1, None), 5)
    def test_no_header_means_no_marks(self):
        self.assertEqual(marks_column_total([L("4", 0, 100, 800)], 0, 90, 0, None), 0)
    def test_three_digit_numbers_and_words_are_ignored(self):
        lines = HEADER + [L("100", 0, 100, 800), L("ora", 0, 120, 800), L("2", 0, 140, 800)]
        self.assertEqual(marks_column_total(lines, 0, 90, 0, None), 2)

class BoldSubtotals(unittest.TestCase):
    """Older Chemistry layout: a mark against every point (plain, at the header's left edge) and a bold subtotal on the right."""
    ROWS = HEADER + [L("1", 0, 100, 784), L("1", 0, 120, 784), L("1", 0, 140, 784), L("3", 0, 160, 810, bold=True)]
    def test_every_digit_counts_the_subtotal_twice(self):
        self.assertEqual(marks_column_total(self.ROWS, 0, 90, 0, None), 6)
    def test_plain_digits_are_the_real_marks(self):
        self.assertEqual(marks_column_total(self.ROWS, 0, 90, 0, None, bold=False), 3)
    def test_bold_digits_are_the_subtotals(self):
        self.assertEqual(marks_column_total(self.ROWS, 0, 90, 0, None, bold=True), 3)

class CentredHeader(unittest.TestCase):
    def test_plain_marks_left_of_a_centred_header_still_count(self):
        header = [L("Marks", 0, 70, 724)]
        lines = header + [L("1", 0, 100, 703), L("1", 0, 120, 703), L("2", 0, 140, 840, bold=True)]
        self.assertEqual(marks_column_total(lines, 0, 90, 0, None, bold=False), 2)
    def test_answer_column_numbers_far_to_the_left_still_do_not(self):
        header = [L("Marks", 0, 70, 724)]
        self.assertEqual(marks_column_total(header + [L("3", 0, 100, 400)], 0, 90, 0, None), 0)

class SubtotalsPrintedTwice(unittest.TestCase):
    def test_section_subtotals_then_the_question_total(self):
        self.assertEqual(marks_without_subtotal("[1]\n[11]\n[4]\n[1]\n[2]\n[1]\n[1]\n[1]\n[2]\n[1]\n[1]\nTotal\n[26]"), 26)
    def test_a_plain_list_is_left_alone(self):
        self.assertIsNone(marks_without_subtotal("[2]\n[3]\n[5]\n[1]"))
    def test_no_brackets(self):
        self.assertIsNone(marks_without_subtotal("no marks here"))
    def test_two_marks_and_a_half_bracket_is_only_a_candidate(self):
        # [2] [1] [1]: the 2 is half of 4, so it reads as a total here; the paper-level check (sum 40) is what accepts or refuses it
        self.assertEqual(marks_without_subtotal("[2] [1] [1]"), 2)

if __name__ == "__main__":
    unittest.main()
