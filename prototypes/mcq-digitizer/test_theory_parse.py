"""parse_theory_qp / parse_theory_ms run on real worksheet PDFs. A reference to a name that only exists in another function
(`notes_page`, 2026-10-18) made every NEW theory worksheet fail while the old ones, built earlier, hid it.
Needs the cached worksheet PDFs (data/mcq-digitizer/structured-library/pdfs, gitignored): skipped when they are absent."""
import glob, os, unittest
import extract_mcq as em

PDFS = sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data", "mcq-digitizer", "structured-library", "pdfs", "*.pdf")))[:3]


class TheoryParse(unittest.TestCase):
    @unittest.skipUnless(PDFS, "no cached worksheet PDFs on this machine")
    def test_parses_without_error_and_finds_questions_somewhere(self):
        found = 0
        for pdf in PDFS:
            blocks = em.parse_theory_qp(pdf)       # must not raise
            answers = em.parse_theory_ms(pdf)      # must not raise
            self.assertIsInstance(blocks, list)
            self.assertIsInstance(answers, list)
            found += len(blocks) + len(answers)
        self.assertGreater(found, 0, "none of the sample PDFs produced a single block")


if __name__ == "__main__":
    unittest.main()
