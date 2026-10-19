"""fill_picture_only_questions: a question that is only a picture (no text heading) is recovered when exactly one whole page lies in the gap."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fitz
import extract_mcq as em


def doc_with(pages):
    """pages: list of 'text' or 'image' (a page holding only a small picture) or 'blank'."""
    doc = fitz.open()
    pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 40, 40)); pix.clear_with(200)
    for kind in pages:
        pg = doc.new_page(width=612, height=792)
        if kind == "text": pg.insert_text((72, 100), "A question stem.", fontsize=11)
        if kind == "image": pg.insert_image(fitz.Rect(100, 100, 300, 300), pixmap=pix)
    return doc


def start(n, page, y=100.0):
    return {"number": str(n), "inlineText": "", "page": page, "y0": y, "isStatementFormat": False, "viaExplicitPreamble": False}


class Fill(unittest.TestCase):
    def test_one_picture_page_between_10_and_12_is_question_11(self):
        out = em.fill_picture_only_questions([start(10, 1), start(12, 3)], doc_with(["text", "text", "image", "text"]))
        self.assertEqual([s["number"] for s in out], ["10", "11", "12"])
        self.assertEqual(out[1]["page"], 2)

    def test_two_missing_numbers_need_two_pages(self):
        out = em.fill_picture_only_questions([start(5, 1), start(8, 4)], doc_with(["text", "text", "image", "image", "text"]))
        self.assertEqual([s["number"] for s in out], ["5", "6", "7", "8"])

    def test_a_gap_that_does_not_match_the_pages_is_left_alone(self):
        starts = [start(10, 1), start(13, 3)]  # three numbers missing, one page between
        self.assertEqual(em.fill_picture_only_questions(starts, doc_with(["text", "text", "image", "text"])), starts)

    def test_neighbours_on_adjacent_pages_are_left_alone(self):
        starts = [start(25, 1), start(27, 2)]
        self.assertEqual(em.fill_picture_only_questions(starts, doc_with(["text", "text", "text"])), starts)

    def test_a_blank_page_is_not_a_question(self):
        starts = [start(10, 1), start(12, 3)]
        self.assertEqual(em.fill_picture_only_questions(starts, doc_with(["text", "text", "blank", "text"])), starts)

    def test_consecutive_numbers_change_nothing(self):
        starts = [start(1, 1), start(2, 1, 300.0), start(3, 2)]
        self.assertEqual(em.fill_picture_only_questions(starts, doc_with(["text", "text", "text"])), starts)


if __name__ == "__main__":
    unittest.main()
