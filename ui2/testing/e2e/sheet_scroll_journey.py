"""TKT-0450: a long list inside a side panel must scroll. The student could not scroll the answers of a 38 question paper: only the first rows showed.
The viewport is the student's own: 1536 by 958 at zoom 67 percent."""
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    n = 60
    attempts = [{"id": "att1", "account_id": "STU-1", "subject": "CIE Physics", "chapter": "1", "paper_id": "qp1", "mode": "test", "score": 40, "total_questions": n, "time_taken_seconds": 70, "submitted_at": "2026-11-01T10:00:00Z"}]
    responses = [{"question_number": str(i), "student_answer": "B", "correct_answer": "B" if i % 3 else "A", "marks_awarded": None, "marks_available": None} for i in range(1, n + 1)]
    lb = {"overall": [], "bySubject": {}, "byChapter": {}, "byPaper": {}}
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, {"CIE": {"Physics": {"Paper 2 MCQ": [{"qpId": "qp1", "msId": "ms1", "title": "1 Motion Q"}]}}}
        if p.startswith("/api/mcq/subject-meta"): return 200, {}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {"qp1": "1 Motion Q"}, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/mistakes/chart"): return 200, {"chart": {}}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": attempts}
        if p.startswith("/api/mcq/leaderboard"): return 200, lb
        if p.startswith("/api/mcq/question-responses"): return 200, {"responses": responses}
    with Session(user=stu, state={}, width=1536, height=958) as s:
        pg = s.page; s.on(r"^/api/mcq", h); s.goto("/v2/question-solver")
        pg.get_by_role("button", name=re.compile("View my progress")).click()
        pg.get_by_role("tab", name="My attempts").click(); pg.get_by_role("button", name="View").first.click()
        pg.get_by_role("listitem").first.wait_for(); pg.wait_for_timeout(500)
        body = pg.locator(".u2-sheet__body")
        out["rows"] = pg.get_by_role("listitem").count()
        out["body_client_scroll"] = body.evaluate("e => [e.clientHeight, e.scrollHeight]")
        box = pg.locator(".u2-sheet").bounding_box(); pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        pg.mouse.wheel(0, 900); pg.wait_for_timeout(500)
        out["scrolled_to"] = body.evaluate("e => e.scrollTop")
        pg.mouse.wheel(0, 20000); pg.wait_for_timeout(500)
        last = pg.get_by_role("listitem").last
        out["last_row_visible"] = last.evaluate("e => { const r = e.getBoundingClientRect(), b = e.closest('.u2-sheet__body').getBoundingClientRect(); return r.bottom <= b.bottom + 2 && r.top >= b.top }")
        pg.screenshot(path="snapshots/sheet-scroll-fixed.png")
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)
    assert out["rows"] == n and out["body_client_scroll"][1] > out["body_client_scroll"][0] * 2, out
    assert out["scrolled_to"] > 0 and out["last_row_visible"], out
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
