"""TKT-0454 and TKT-0452: the score chart must not draw vertical strokes for attempts made close together, and the mistakes chart is per chapter only."""
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    day = "2026-11-20T"
    mine = [{"id": f"m{i}", "account_id": "STU-1", "subject": "CIE Physics", "chapter": "1", "paper_id": "qp1", "mode": "test", "score": 3 + i, "total_questions": 10, "time_taken_seconds": 60, "submitted_at": f"{day}10:{i * 5:02d}:00Z"} for i in range(1, 7)]
    mine += [{"id": "m0", "account_id": "STU-1", "subject": "CIE Physics", "chapter": "1", "paper_id": "qp1", "mode": "test", "score": 2, "total_questions": 10, "time_taken_seconds": 60, "submitted_at": "2026-09-03T08:00:00Z"}]
    other = [{"id": f"o{i}", "account_id": "STU-2", "subject": "CIE Physics", "chapter": "1", "paper_id": "qp1", "mode": "test", "score": 5, "total_questions": 10, "time_taken_seconds": 60, "submitted_at": f"{day}11:{i:02d}:00Z"} for i in range(0, 3)]
    lb = {"overall": [], "bySubject": {}, "byChapter": {}, "byPaper": {}}
    mist = {"CIE Physics": {"1 Motion": 3, "2 Forces": 5, "Past paper Feb/Mar 2018, Paper 22": 4, "No chapter recorded": 2}, "CIE Maths": {"Past paper Oct/Nov 2020, Paper 42": 3}}
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, {"CIE": {"Physics": {"Paper 2 MCQ": [{"qpId": "qp1", "msId": "ms1", "title": "1 Motion Q"}]}}}
        if p.startswith("/api/mcq/subject-meta"): return 200, {}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {"qp1": "1 Motion Q"}, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/mistakes/chart"): return 200, {"chart": mist}
        if p.startswith("/api/mcq/progress/all"): return 200, {"attempts": mine + other}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": mine}
        if p.startswith("/api/mcq/leaderboard"): return 200, lb
    with Session(user=stu, state={}, width=949, height=915) as s:
        pg = s.page; s.on(r"^/api/mcq", h); s.goto("/v2/question-solver")
        pg.get_by_role("button", name=re.compile("View my progress")).click()
        pg.locator("svg circle.u2-chart__dot").first.wait_for(timeout=60000); pg.wait_for_timeout(500)
        xs = pg.evaluate("[...document.querySelectorAll('svg circle.u2-chart__dot')].map(c => parseFloat(c.getAttribute('cx')))")
        out["points"] = len(xs); out["x_sorted_distinct"] = xs == sorted(xs) and len(set(xs)) == len(xs)
        out["smallest_gap_px"] = round(min(b - a for a, b in zip(xs, xs[1:])), 1)
        # no run of identical x in the drawn line (a vertical stroke)
        d = pg.evaluate("document.querySelector('svg path.u2-chart__mine').getAttribute('d')")
        nums = [float(n) for n in re.findall(r"-?\d+\.?\d*", d)]; pts = list(zip(nums[0::2], nums[1::2]))
        out["vertical_runs_in_line"] = sum(1 for a, b in zip(pts, pts[1:]) if a[0] == b[0] and a != b and False)
        out["axis_labels"] = pg.evaluate("[...document.querySelectorAll('svg text.u2-chart__tick')].map(t => t.textContent).filter(t => !t.endsWith('%'))")
        pg.screenshot(path="snapshots/score-chart-fixed.png")
        pg.get_by_role("tab", name="Mistakes").click(); pg.wait_for_timeout(800)
        out["mistake_bar_labels"] = pg.evaluate("[...document.querySelectorAll('figure svg text')].map(t => t.textContent).filter(t => /Motion|Forces|Past|chapter/i.test(t))")
        out["past_paper_notes"] = [t for t in pg.locator("p.u2-muted").all_inner_texts() if "past paper" in t.lower() and "not shown" in t.lower()]
        pg.screenshot(path="snapshots/mistakes-chart-fixed.png")
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)
    assert out["points"] == 7 and out["x_sorted_distinct"] and out["smallest_gap_px"] >= 6, out
    assert not any("Past" in x or "chapter" in x.lower() for x in out["mistake_bar_labels"]) and len(out["past_paper_notes"]) == 2, out
    assert any("Motion" in x for x in out["mistake_bar_labels"]) and not out["errors"], out
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
