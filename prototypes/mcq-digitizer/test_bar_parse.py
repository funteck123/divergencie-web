"""Question bars: a wide grey rectangle with "Q<n> <year-session>, P<paper>" on it before each question (the owner's Computer Science topical books)."""
import os, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fitz
import extract_mcq as em


def make_book(path, bars=((1, 0, 100), (2, 0, 400), (3, 1, 120)), grey=0.38, footer=True):
    doc = fitz.open()
    for _ in range(2):
        doc.new_page(width=595, height=842)
    for n, pg, y in bars:
        p = doc[pg]
        p.draw_rect(fitz.Rect(60, y, 535, y + 15), color=None, fill=(grey, grey, grey))
        p.insert_text((64, y + 11), f"Q{n}", fontsize=11, color=(1, 1, 1))
        p.insert_text((100, y + 11), f"2015-June, P1{n}, Q{n}", fontsize=11, color=(1, 1, 1))
        p.insert_text((90, y + 40), f"Question text {n}. Explain the term. [{n + 1}]", fontsize=11)
    if footer:
        for i in range(2):
            p = doc[i]
            p.insert_text((50, 811), f"1 Information representation qp   {i + 2}", fontsize=9)
    doc.save(path)


class Bars(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp(); self.path = os.path.join(self.dir, "b.pdf")

    def test_starts_come_from_the_grey_bars_with_their_paper_reference(self):
        make_book(self.path)
        doc = fitz.open(self.path)
        starts = em.find_bar_question_starts(doc)
        self.assertEqual([s["number"] for s in starts], ["1", "2", "3"])
        self.assertEqual(starts[0]["ref"], "2015-June, P11, Q1")
        self.assertEqual([s["page"] for s in starts], [0, 0, 1])

    def test_crops_stop_above_the_footer(self):
        make_book(self.path)
        doc = fitz.open(self.path)
        segs = em.bar_segments(em.find_bar_question_starts(doc), doc.page_count, em.BAR_QP_TOP)
        self.assertTrue(all(b <= em.BAR_BOTTOM for group in segs for _, _, b in group))

    def test_the_theory_parser_uses_bars_and_marks_come_from_the_brackets(self):
        make_book(self.path)
        self.assertEqual([b["questionNumber"] for b in em.parse_theory_qp(self.path)], ["1", "2", "3"])
        self.assertEqual(em.qp_question_marks(self.path), [("1", 2), ("2", 3), ("3", 4)])

    def test_two_bars_are_not_enough(self):
        make_book(self.path, bars=((1, 0, 100), (2, 0, 400)))
        doc = fitz.open(self.path)
        self.assertEqual(em.find_bar_question_starts(doc), [])

    def test_a_light_rectangle_is_not_a_bar(self):
        make_book(self.path, grey=0.9)
        doc = fitz.open(self.path)
        self.assertEqual(em.find_bar_question_starts(doc), [])

    def test_repeated_numbers_do_not_make_two_questions(self):
        make_book(self.path, bars=((1, 0, 100), (1, 0, 300), (2, 0, 500), (3, 1, 120)))
        doc = fitz.open(self.path)
        self.assertEqual([s["number"] for s in em.find_bar_question_starts(doc)], ["1", "2", "3"])


if __name__ == "__main__":
    unittest.main()
