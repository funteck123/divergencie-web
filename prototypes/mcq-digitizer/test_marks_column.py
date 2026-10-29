"""Run: python3 -m unittest test_marks_column   (from prototypes/mcq-digitizer)"""
import unittest
from extract_mcq import marks_column_total

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

if __name__ == "__main__":
    unittest.main()
