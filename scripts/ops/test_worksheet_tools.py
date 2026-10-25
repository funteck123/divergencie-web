"""Tests for the worksheet tools (TKT-0349): read_question_marks.py and relabel_schemes_by_position.py.
Run from the repo root: python3 -m unittest scripts/ops/test_worksheet_tools.py
Each test builds a tiny worksheet in a temp folder (a cover PDF and pictures with printed [N] marks), so nothing real is read or written."""
import json, os, subprocess, sys, tempfile, unittest
from pathlib import Path

import fitz
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import read_question_marks as rqm  # noqa: E402


def picture(path, marks):
    """A wide question picture with a printed [N] at the right end, like the real ones."""
    im = Image.new("RGB", (1200, 150), "white")
    d = ImageDraw.Draw(im)
    f = ImageFont.load_default(size=30)
    d.text((60, 55), "Find the value of x in the equation.", fill="black", font=f)
    if marks:
        d.text((1080, 55), f"[{marks}]", fill="black", font=f)
    im.save(path)


def cover(path, total):
    doc = fitz.open()
    doc.new_page().insert_text((72, 100), f"Time Allowed:\n56 minutes\nMaximum Marks:\n{total}")
    doc.save(path)


def worksheet(tmp, printed, stored=None, scheme_numbers=None, total=None):
    """A worksheet entry. printed: the [N] on each question picture. stored: marks already in the database (default 0)."""
    cover(os.path.join(tmp, "QP1.pdf"), sum(printed) if total is None else total)
    n = len(printed)
    stored = stored or [0] * n
    questions, answers = [], []
    for i, m in enumerate(printed, 1):
        p = os.path.join(tmp, f"q{i}.png")
        picture(p, m)
        questions.append({"questionNumber": str(i), "imagePath": p})
    for k, num in enumerate(scheme_numbers or [str(i) for i in range(1, n + 1)]):
        answers.append({"questionNumber": num, "imagePath": os.path.join(tmp, "a.png"), "marks": stored[k] if k < len(stored) else 0})
    return {"qpId": "QP1", "msId": "MS1", "title": "T", "questions": questions, "answers": answers}


class ReadQuestionMarks(unittest.TestCase):
    def setUp(self):
        self._d = tempfile.TemporaryDirectory(); self.tmp = self._d.name
    def tearDown(self):
        self._d.cleanup()

    def test_accepts_when_read_marks_equal_cover(self):
        r = rqm.read_worksheet(worksheet(self.tmp, [3, 5, 4]), self.tmp)
        self.assertEqual(r["status"], "accepted", r["why"])
        self.assertEqual([v["marks"] for v in r["questions"].values()], [3, 5, 4])

    def test_leaves_alone_when_total_differs_from_cover(self):
        r = rqm.read_worksheet(worksheet(self.tmp, [3, 5, 4], total=13), self.tmp)
        self.assertEqual(r["status"], "left alone"); self.assertIn("13", r["why"])

    def test_leaves_alone_when_a_question_has_no_marks_read(self):
        r = rqm.read_worksheet(worksheet(self.tmp, [3, 0, 4], total=7), self.tmp)
        self.assertEqual(r["status"], "left alone"); self.assertIn("question(s) 2", r["why"])

    def test_refuses_scheme_numbers_that_do_not_match_questions(self):
        r = rqm.read_worksheet(worksheet(self.tmp, [3, 5, 4], scheme_numbers=["1", "3", "2"]), self.tmp)
        self.assertEqual(r["status"], "left alone"); self.assertIn("one to one", r["why"])

    def test_nothing_to_do_when_every_question_has_marks(self):
        r = rqm.read_worksheet(worksheet(self.tmp, [3, 5], stored=[3, 5]), self.tmp)
        self.assertEqual(r["status"], "nothing to do")

    def test_stored_marks_are_kept_unless_reread(self):
        ws = worksheet(self.tmp, [3, 5, 4], stored=[3, 9, 0])  # the stored 9 is wrong, the paper says 5
        self.assertEqual(rqm.read_worksheet(ws, self.tmp)["status"], "left alone")  # 3 + 9 + 4 = 16, the cover says 12
        again = rqm.read_worksheet(ws, self.tmp, reread=True)
        self.assertEqual(again["status"], "accepted")
        self.assertEqual([v["marks"] for v in again["questions"].values()], [3, 5, 4])

    def test_manual_mark_fills_a_question_ocr_cannot_read(self):
        r = rqm.read_worksheet(worksheet(self.tmp, [3, 0, 4], total=12), self.tmp, manual={("QP1", "2"): 5})
        self.assertEqual(r["status"], "accepted")

    def test_marks_file_replaces_ocr_and_stored_marks(self):
        ws = worksheet(self.tmp, [3, 5, 4], stored=[3, 9, 0])  # the paper says 3, 5, 4; the stored 9 is wrong
        r = rqm.read_worksheet(ws, self.tmp, given={"1": [3], "2": [5], "3": [4]})
        self.assertEqual(r["status"], "accepted", r["why"])
        self.assertEqual([v["marks"] for v in r["questions"].values()], [3, 5, 4])
        self.assertTrue(all(v.get("given") for v in r["questions"].values()))

    def test_marks_file_brackets_are_summed_per_question(self):
        r = rqm.read_worksheet(worksheet(self.tmp, [3, 5, 4]), self.tmp, given={"1": [1, 2], "2": [5], "3": [4]})
        self.assertEqual(r["status"], "accepted"); self.assertEqual(r["questions"]["1"]["marks"], 3)

    def test_marks_file_still_needs_the_cover_total(self):
        r = rqm.read_worksheet(worksheet(self.tmp, [3, 5, 4]), self.tmp, given={"1": [3], "2": [6], "3": [4]})
        self.assertEqual(r["status"], "left alone"); self.assertIn("13", r["why"])

    def test_manual_mark_still_needs_the_cover_total(self):
        r = rqm.read_worksheet(worksheet(self.tmp, [3, 0, 4], total=12), self.tmp, manual={("QP1", "2"): 9})
        self.assertEqual(r["status"], "left alone")


def entry(qnums, anums):
    return {"qpId": "QP1", "title": "T", "questions": [{"questionNumber": q} for q in qnums], "answers": [{"questionNumber": a, "marks": 0} for a in anums]}


class RelabelSchemes(unittest.TestCase):
    def setUp(self):
        self._d = tempfile.TemporaryDirectory(); self.dir = self._d.name; self.db = os.path.join(self.dir, "database.json")
    def tearDown(self):
        self._d.cleanup()

    def run_tool(self, *args):
        return subprocess.run([sys.executable, os.path.join(HERE, "relabel_schemes_by_position.py"), self.db, *args], capture_output=True, text=True)

    def backups(self):
        return [f for f in os.listdir(self.dir) if f.startswith("database.json.bak-")]

    def test_renumbers_by_position_and_backs_up(self):
        Path(self.db).write_text(json.dumps([entry(list("1234567"), list("1235456"))]))
        r = self.run_tool("--only", "QP1")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual([a["questionNumber"] for a in json.loads(Path(self.db).read_text())[0]["answers"]], list("1234567"))
        self.assertEqual(len(self.backups()), 1)
        self.assertNotIn("database.json.tmp", os.listdir(self.dir))

    def test_refuses_when_counts_differ_and_writes_nothing(self):
        before = json.dumps([entry(list("12345"), list("1235"))])
        Path(self.db).write_text(before)
        r = self.run_tool("--only", "QP1")
        self.assertNotEqual(r.returncode, 0); self.assertIn("STOP", r.stderr + r.stdout)
        self.assertEqual(Path(self.db).read_text(), before); self.assertEqual(self.backups(), [])

    def test_refuses_an_unknown_worksheet(self):
        Path(self.db).write_text(json.dumps([entry(list("123"), list("123"))]))
        self.assertNotEqual(self.run_tool("--only", "NOPE").returncode, 0)


if __name__ == "__main__":
    unittest.main()
