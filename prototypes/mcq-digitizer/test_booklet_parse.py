"""Save My Exams topic booklets (A Level Maths Pure 2 and Pure 3): questions start at the "Question N" headings, never at the page-number footers,
and the logo banner and footer stay out of the crops. A synthetic booklet has the same geometry as the real ones."""
import io, os, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fitz
import extract_mcq as em


def make_booklet(path):
    doc = fitz.open()
    doc.new_page(width=612, height=792).insert_text((100, 300), "Cover page", fontsize=20)
    def page(header, body, footer, inline=None):
        pg = doc.new_page(width=612, height=792)
        pg.insert_text((207, 40), "Head to savemyexams.co.uk for more awesome resources", fontsize=8.5)
        if header:
            pg.insert_text((64, 38), f"Question {header}", fontsize=15)
        pg.insert_text((98, 100), body, fontsize=10.3)
        pg.insert_text((528, 130), "[ 3]", fontsize=10.3)  # a bracket with a space inside, as the real text layer has
        if inline:
            pg.insert_text((64, 400), f"Question {inline[0]}", fontsize=15)
            pg.insert_text((98, 440), inline[1], fontsize=10.3)
            pg.insert_text((528, 470), "[4]", fontsize=10.3)
        pg.insert_text((89, 774), str(footer), fontsize=7.5)
    page(1, "Find the value of a.", 2)
    page(2, "Solve the equation.", 3, inline=(3, "Differentiate the function."))
    doc.save(path)


class Booklet(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp()
        cls.path = os.path.join(cls.dir, "booklet.pdf")
        make_booklet(cls.path)

    def test_starts_are_the_headings_not_the_footers(self):
        doc = fitz.open(self.path)
        starts = em.find_booklet_question_starts(doc)
        self.assertEqual([s["number"] for s in starts], ["1", "2", "3"])
        self.assertTrue(all(s["y0"] < 700 for s in starts), "no start sits in the page footer")

    def test_crops_leave_out_banner_and_footer(self):
        doc = fitz.open(self.path)
        starts = em.find_booklet_question_starts(doc)
        for segs in em.booklet_segments(starts, doc.page_count):
            for _, top, bottom in segs:
                self.assertGreaterEqual(top, em.BOOKLET_BODY_TOP)
                self.assertLessEqual(bottom, em.BOOKLET_FOOTER_TOP)

    def test_first_question_missing_its_heading_is_added(self):
        doc = fitz.open()
        doc.new_page(width=612, height=792)
        pg = doc.new_page(width=612, height=792)
        pg.insert_text((98, 100), "Unlabeled first question.", fontsize=10.3)
        pg.insert_text((64, 400), "Question 2", fontsize=15)
        starts = em.find_booklet_question_starts(doc)
        self.assertEqual([s["number"] for s in starts], ["1", "2"])

    def test_theory_parser_uses_the_booklet_path(self):
        blocks = em.parse_theory_qp(self.path)
        self.assertEqual([b["questionNumber"] for b in blocks], ["1", "2", "3"])
        self.assertTrue(all(b["image"].startswith("data:image/png;base64,") for b in blocks))

    def test_marks_accept_spaces_inside_brackets(self):
        self.assertEqual(em.qp_question_marks(self.path), [("1", 3), ("2", 3), ("3", 4)])

    def test_a_plain_paper_is_not_a_booklet(self):
        doc = fitz.open()
        doc.new_page().insert_text((72, 100), "1 A plain bare-number paper.", fontsize=11)
        self.assertEqual(em.find_booklet_question_starts(doc), [])


if __name__ == "__main__":
    unittest.main()
