"""Tests for processed_videos.py (TKT-0384): the ledger is merged into the dataset, copies and holds are marked, nothing is uploaded."""
import csv, json, os, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
HEAD = ["fileName", "filePath", "localPaths", "level", "subject", "subjectCode", "component", "chapterTitle", "topic", "youtubeTitle", "instructor", "duplicateOf", "youtubeId"]


def row(name, **kw):
    r = {k: "" for k in HEAD}
    r.update(fileName=name, filePath="/x/" + name, level="A Level", subject="Physics", component="AS Level", chapterTitle="Waves", topic="Waves 1", youtubeTitle="A Level Physics 9702 | Ch 7 Waves | Waves 1")
    r.update(kw)
    return r


class MergeTest(unittest.TestCase):
    def run_merge(self, rows, ledger):
        d = tempfile.mkdtemp()
        with open(d + "/ds.csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=HEAD); w.writeheader(); w.writerows(rows)
        json.dump([{"filePath": r["filePath"]} for r in rows], open(d + "/ds.json", "w"))
        json.dump(ledger, open(d + "/ledger.json", "w"))
        subprocess.run([sys.executable, os.path.join(HERE, "processed_videos.py"), "--dataset", d + "/ds", "--ledger", d + "/ledger.json"], check=True, capture_output=True)
        return list(csv.DictReader(open(d + "/ds.csv"))), json.load(open(d + "/ds.json"))

    def entry(self, **kw):
        e = {"processedPath": "/d/out.mp4", "width": 1600, "height": 1030, "durationMin": 6.3, "sizeMB": 12.5, "md5": "abc", "date": "2022-11-09", "batch": "B6", "note": "ok", "hold": "", "verified": True}
        e.update(kw)
        return e

    def test_ready_copy_hold_and_untouched_rows(self):
        rows = [row("a.mp4"), row("b.mp4"), row("c.mp4"), row("z.mp4")]
        ledger = {"a.mp4": self.entry(), "b.mp4": {"duplicateOf": "a.mp4", "processedPath": "/d/out.mp4"}, "c.mp4": self.entry(hold="wrong title")}
        out, js = self.run_merge(rows, ledger)
        a, b, c, z = out
        self.assertEqual((a["readyToPost"], b["readyToPost"], c["readyToPost"], z["readyToPost"]), ("yes", "no", "hold", ""))
        self.assertEqual(b["duplicateOf"], "a.mp4"); self.assertEqual(b["processedVideoPath"], a["processedVideoPath"])
        self.assertEqual(z["processedVideoPath"], "")
        self.assertEqual(a["youtubeLink"], "")                     # nothing is uploaded
        self.assertIn("Recorded: 9 Nov 2022.", a["processedYouTubeDescription"]); self.assertIn("Batch B6.", a["processedYouTubeDescription"])
        self.assertIn("Chapter 7: Waves.", a["processedYouTubeDescription"]); self.assertIn("Duration: 6 min.", a["processedYouTubeDescription"])
        self.assertEqual(js[0]["readyToPost"], "yes")

    def test_link_only_when_uploaded_and_wrong_duplicate_flag_cleared(self):
        rows = [row("a.mp4", youtubeId="XYZ", duplicateOf="/old/other.mp4")]
        out, _ = self.run_merge(rows, {"a.mp4": self.entry(notDuplicate="different bytes")})
        self.assertEqual(out[0]["youtubeLink"], "https://www.youtube.com/watch?v=XYZ")
        self.assertEqual(out[0]["duplicateOf"], ""); self.assertIn("cleared", out[0]["processingNote"])
        out, _ = self.run_merge(rows, {"a.mp4": self.entry(verified=False)})
        self.assertEqual(out[0]["readyToPost"], "no")              # not verified is never "yes"


if __name__ == "__main__":
    unittest.main()
