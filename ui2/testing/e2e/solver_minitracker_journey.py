"""TKT-0448: the small progress card beside the Question Solver library. All data is fake (harness). Checks: shows on a wide screen to the right of the picker, hidden where there is no room, numbers match the fake attempts, empty state, and the button opens the full progress screen."""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

LIB = {"CIE": {"Physics": {"Paper 2 MCQ": [{"qpId": "qp1", "msId": "ms1", "title": "1 Motion Q"}, {"qpId": "qp2", "msId": "ms2", "title": "2 Forces Q"}, {"qpId": "qp3", "msId": "ms3", "title": "3 Energy Q"}, {"qpId": "qp4", "msId": "ms4", "title": "4 Waves Q"}]}}}
def att(i, paper, mode, score, day):
    return {"id": f"a{i}", "account_id": "STU-36", "subject": "CIE Physics", "chapter": "1", "paper_id": paper, "mode": mode, "score": score, "total_questions": 10, "time_taken_seconds": 60, "submitted_at": f"2026-11-{day:02d}T10:00:00Z"}
ATT = [att(1, "qp1", "test", 9, 1), att(2, "qp2", "test", 4, 2), att(3, "qp2", "test", 6, 3), att(4, "qp3", "practice", None, 4)]  # qp1 solved (90%), qp2 best 60% (tried), qp3 practised

def handlers(attempts):
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, LIB
        if p.startswith("/api/mcq/subject-meta"): return 200, {}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {"qp1": "1 Motion Q"}, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/solved-library"): return 200, {}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": attempts}
        if p.startswith("/api/mcq/leaderboard"): return 200, {"overall": [], "bySubject": {}, "byChapter": {}, "byPaper": {}}
        if p.startswith("/api/mcq/mistakes/chart"): return 200, {"chart": {}}
    return h

def run(width, attempts, shot=None):
    stu = {"UserID": "STU-36", "UserType": "Student", "Name": "Riddhi", "UiPreference": "next"}
    out = {}
    with Session(user=stu, state={}, width=width, height=900) as s:
        s.on(r"^/api/mcq", handlers(attempts))
        s.goto("/v2/question-solver")
        s.page.get_by_role("button", name=re.compile("Fetch|Digitize|Load|Start", re.I)).first.wait_for(timeout=60000)
        s.page.wait_for_timeout(800)
        card = s.page.locator(".u2-minitracker")
        out["visible"] = card.is_visible()
        if out["visible"]:
            out["text"] = card.inner_text().replace("\n", " | ")
            picker = s.page.locator(".u2-solver-picker").bounding_box(); box = card.bounding_box()
            out["right_of_picker"] = box["x"] >= picker["x"] + picker["width"] - 1
            out["width_px"] = round(box["width"])
            out["bar_label"] = card.locator(".u2-done__bar").get_attribute("aria-label") if attempts else None
            out["bars_label"] = card.locator(".u2-minitracker__bars").get_attribute("aria-label") if any(a["mode"] != "practice" for a in attempts) else None
        out["hscroll"] = s.hscroll()
        if shot: s.page.screenshot(path=shot)
        if out["visible"]:
            card.get_by_role("button", name="Open full progress").click()
            s.page.get_by_role("tab", name="Score trend").wait_for()
            out["opens_progress"] = True
        out["errors"] = s.errors[:3]
    return out

if __name__ == "__main__":
    r1 = run(1440, ATT, "snapshots/v2-minitracker-1440.png"); print("1440 with attempts:", r1)
    r2 = run(1440, [], "snapshots/v2-minitracker-empty.png"); print("1440 no attempts:", r2)
    r3 = run(1280, ATT); print("1280:", r3)
    r4 = run(390, ATT); print("390:", r4)
    ok = (r1["visible"] and r1["right_of_picker"] and "1 of 4 papers solved" in r1["text"] and "3 tried" in r1["text"] and r1["opens_progress"] and not r1["hscroll"]
          and r2["visible"] and "after your first paper" in r2["text"] and not r3["visible"] and not r4["visible"] and not r3["hscroll"] and not r4["hscroll"])
    print("JOURNEY", "PASS" if ok else "FAIL"); sys.exit(0 if ok else 1)
