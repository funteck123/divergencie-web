"""build_full_database.py must only ever pick multiple-choice pairs (category "MCQ"), never theory or structured components."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DRIVE_MAP_PATH", os.devnull)
import build_full_database as b


def f(name, i): return {"name": name, "id": i}


MAP = {"A Levels": {"Chemistry": {
    "MCQ": {"QP": [f("CAIE A Level Chemistry Ch1 Atomic Structure (MCQ) Worksheet 1 QP.pdf", "q1")], "MS": [f("CAIE A Level Chemistry Ch1 Atomic Structure (MCQ) Worksheet 1 MS.pdf", "m1")]},
    "Paper 2: AS Level Structured Questions": {"QP": [f("CAIE A Level Chemistry Ch12 Nitrogen & Sulfur (Theory) Worksheet 1 QP.pdf", "q2")], "MS": [f("CAIE A Level Chemistry Ch12 Nitrogen & Sulfur (Theory) Worksheet 1 MS.pdf", "m2")]},
}}}


class McqOnly(unittest.TestCase):
    def test_theory_component_is_never_picked(self):
        pairs = b.mcq_pairs_from_map(MAP)
        self.assertEqual([p["qpId"] for p in pairs], ["q1"])
        self.assertEqual(pairs[0]["msId"], "m1")

    def test_live_map_has_no_theory_pair(self):
        live = os.path.join(os.path.dirname(__file__), "../../../data/mcq-digitizer/drive-map/drive-map.json")
        if not os.path.exists(live): self.skipTest("no live map")
        import json
        for p in b.mcq_pairs_from_map(json.load(open(live))):
            self.assertEqual(p["category"], "MCQ")
            self.assertNotIn("(Theory)", p["qpName"])


if __name__ == "__main__":
    unittest.main()
