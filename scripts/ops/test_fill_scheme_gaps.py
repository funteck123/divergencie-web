"""Tests for fill_scheme_gaps.py (TKT-0349). Run from the repo root: python3 -m unittest scripts/ops/test_fill_scheme_gaps.py
Each test writes a small made-up mark scheme PDF (a cover page, then one page of numbered blocks) into a temp folder and points the tool at it."""
import os, sys, tempfile, unittest

import fitz

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fill_scheme_gaps as fsg  # noqa: E402


def scheme_pdf(path, blocks):
    """blocks: [(heading text, y, body lines)]. The heading sits at x=60 like the real ones; marks codes go in a column at x=330."""
    doc = fitz.open()
    doc.new_page()  # the cover page, never searched
    page = doc.new_page()
    for heading, y, body in blocks:
        page.insert_text((60, y), heading, fontsize=11)
        for i, line in enumerate(body):
            page.insert_text((330, y + 16 * i), line, fontsize=11)
    doc.save(path)


def entry(have, want):
    return {"qpId": "QP1", "msId": "MS1", "title": "T",
            "questions": [{"questionNumber": n} for n in want],
            "answers": [{"questionNumber": n, "imagePath": f"x/a{n}.png", "marks": 4} for n in have]}


class FillSchemeGaps(unittest.TestCase):
    def setUp(self):
        self._d = tempfile.TemporaryDirectory(); self.dir = self._d.name
        os.makedirs(os.path.join(self.dir, "pdfs")); os.makedirs(os.path.join(self.dir, "images", "QP1"))
        self._lib = fsg.LIB; fsg.LIB = self.dir
    def tearDown(self):
        fsg.LIB = self._lib; self._d.cleanup()

    def pdf(self, blocks):
        scheme_pdf(os.path.join(self.dir, "pdfs", "MS1.pdf"), blocks)

    def test_nothing_to_do_when_one_scheme_per_question(self):
        self.assertEqual(fsg.plan_worksheet(entry(["1", "2"], ["1", "2"]))["status"], "nothing to do")

    def test_finds_a_long_heading_line_the_parser_missed(self):
        self.pdf([("1", 100, ["M1", "A1"]), ("2", 220, ["B1", "A1"]), ("3     (i) 6C4 x 2", 340, ["B2", "M1"]), ("4", 460, ["M1", "A1"])])
        r = fsg.plan_worksheet(entry(["1", "2", "4"], ["1", "2", "3", "4"]))
        self.assertEqual(r["status"], "fill", r["why"])
        self.assertEqual(r["found"], ["3"])
        self.assertEqual([s["number"] for s in r["starts"]], ["1", "2", "3", "4"])

    def test_leaves_alone_when_no_heading_line_exists(self):
        self.pdf([("1", 100, ["M1", "A1"]), ("2", 220, ["B1", "A1"]), ("4", 460, ["M1", "A1"])])
        r = fsg.plan_worksheet(entry(["1", "2", "4"], ["1", "2", "3", "4"]))
        self.assertEqual(r["status"], "left alone"); self.assertIn("question 3", r["why"])

    def test_ignores_a_number_that_is_not_at_the_heading_margin(self):
        doc = fitz.open(); doc.new_page(); page = doc.new_page()
        for text, x, y in (("1", 60, 100), ("M1", 330, 100), ("2", 60, 220), ("B1", 330, 220), ("3     (i) 6C4", 250, 340), ("B2", 330, 340), ("4", 60, 460), ("M1", 330, 460)):
            page.insert_text((x, y), text, fontsize=11)
        doc.save(os.path.join(self.dir, "pdfs", "MS1.pdf"))
        r = fsg.plan_worksheet(entry(["1", "2", "4"], ["1", "2", "3", "4"]))
        self.assertEqual(r["status"], "left alone")  # a "3" mid-page in a table cell is not a heading

    def test_refuses_a_block_with_no_mark_code(self):
        self.pdf([("1", 100, ["M1", "A1"]), ("2", 220, ["B1", "A1"]), ("3     (i) words only", 340, ["nothing here"]), ("4", 460, ["M1", "A1"])])
        r = fsg.plan_worksheet(entry(["1", "2", "4"], ["1", "2", "3", "4"]))
        self.assertEqual(r["status"], "left alone"); self.assertIn("no mark code", r["why"])

    def test_leaves_alone_without_a_pdf(self):
        self.assertEqual(fsg.plan_worksheet(entry(["1"], ["1", "2"]))["status"], "left alone")

    def test_cut_writes_one_picture_per_question_and_keeps_stored_marks(self):
        self.pdf([("1", 100, ["M1", "A1"]), ("2", 220, ["B1", "A1"]), ("3     (i) 6C4 x 2", 340, ["B2", "M1"]), ("4", 460, ["M1", "A1"])])
        e = entry(["1", "2", "4"], ["1", "2", "3", "4"])
        answers = fsg.cut(e, fsg.plan_worksheet(e)["starts"])
        self.assertEqual([a["questionNumber"] for a in answers], ["1", "2", "3", "4"])
        self.assertEqual([a["marks"] for a in answers], [4, 4, 0, 4])  # the new question has none yet, the others keep theirs
        for n in "1234":
            self.assertTrue(os.path.getsize(os.path.join(self.dir, "images", "QP1", f"a{n}.png")) > 0)


if __name__ == "__main__":
    unittest.main()
