"""Run from the repo root: python3 -m unittest scripts/ops/test_strip_sme_banner.py"""
import os, sys, tempfile, unittest
import fitz
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import strip_sme_banner as S


def make_pdf(path, banner_in_form=True):
    """A page with a real line in Helvetica and the Save My Exams banner (Times Italic) printed over it, as a form XObject like the real originals."""
    ban = fitz.open(); bp = ban.new_page(width=400, height=60)
    bp.insert_text((10, 20), "For more awesome resources, visit us at www.savemyexams.co.uk", fontname="tiit", fontsize=9)
    doc = fitz.open(); page = doc.new_page(width=595, height=842)
    page.insert_text((72, 60), "Determine the heat of combustion of butan-1-ol by plotting", fontname="helv", fontsize=11)
    page.insert_text((72, 90), "Second real line below the banner", fontname="helv", fontsize=11)
    if banner_in_form:
        page.show_pdf_page(fitz.Rect(70, 40, 470, 100), ban, 0)
    else:
        page.insert_text((72, 60), "For more awesome resources, visit us at www.savemyexams.co.uk", fontname="tiit", fontsize=9)
    doc.save(path)


class StripBanner(unittest.TestCase):
    def test_banner_form_is_removed_and_real_text_is_untouched(self):
        with tempfile.TemporaryDirectory() as d:
            src, out = os.path.join(d, "raw.pdf"), os.path.join(d, "clean.pdf")
            make_pdf(src)
            self.assertIn("savemyexams", fitz.open(src)[0].get_text())
            rep, ok = S.strip(src, out)
            text = fitz.open(out)[0].get_text()
            self.assertTrue(ok, rep)
            self.assertNotIn("savemyexams", text)
            self.assertIn("Determine the heat of combustion of butan-1-ol", text)
            self.assertIn("Second real line below the banner", text)

    def test_a_page_with_no_banner_is_left_alone(self):
        with tempfile.TemporaryDirectory() as d:
            doc = fitz.open(); doc.new_page().insert_text((72, 72), "Only real text here", fontname="helv", fontsize=11)
            src, out = os.path.join(d, "a.pdf"), os.path.join(d, "b.pdf"); doc.save(src)
            rep, ok = S.strip(src, out)
            self.assertTrue(ok)
            self.assertEqual(fitz.open(out)[0].get_text().strip(), "Only real text here")

    def test_character_check_catches_a_lost_real_character(self):
        self.assertEqual(S.chars_of(type("P", (), {"get_text": lambda self, k: {"blocks": [{"lines": [{"spans": [{"font": "Arial", "text": "ab c"}]}]}]}})()), ["a", "b", "c"])


if __name__ == "__main__":
    unittest.main()
