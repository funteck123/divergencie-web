"""Screenshots of the new progress screens (score trend, completion, attempts panel, picker markers) with fake data, saved to snapshots/."""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"


def main():
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    titles = {f"w{i}": f"Ch{1 + i // 3} Motion (MCQ) Worksheet {1 + i % 3}" for i in range(9)}
    library = {"IGCSE": {"Physics": {"Paper 2 MCQ": [{"qpId": k, "msId": "m" + k, "title": t} for k, t in titles.items()]}}}
    yearly = {"IGCSE": {"Physics": {"Paper 4": [{"paperId": f"y{i}", "year": 2020 + i // 2, "session": "May", "variant": f"4{i % 2 + 1}", "title": f"y{i}"} for i in range(6)]}}}
    def at(i, paper, score, day, mode="test"):
        return {"id": f"a{i}", "account_id": "STU-1", "subject": "IGCSE Physics", "chapter": "1", "paper_id": paper, "mode": mode, "score": score if mode == "test" else None, "total_questions": 10, "time_taken_seconds": 600, "submitted_at": f"2026-10-{day:02d}T10:00:00Z"}
    mine = [at(1, "w0", 4, 2), at(2, "w1", 5, 4), at(3, "w1", 7, 6), at(4, "w2", 6, 9), at(5, "w3", 8, 12), at(6, "w4", 10, 14), at(7, "w5", 3, 16), at(8, "w5", 9, 18), at(9, "w6", 0, 19, "practice"), at(10, "y0", 8, 20)]
    other = [{**at(20 + i, "w0", 3 + i, 3 + 3 * i), "account_id": "STU-2"} for i in range(5)]
    lb = {"overall": [], "bySubject": {}, "byChapter": {}, "byPaper": {}}
    resp = [{"question_number": "1", "marks_awarded": None, "marks_available": None, "student_answer": "A", "correct_answer": "A"}]
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, library
        if p.startswith("/api/mcq/subject-meta"): return 200, {}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": titles, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, yearly
        if p.startswith("/api/mcq/question-responses"): return 200, {"responses": resp}
        if p.startswith("/api/mcq/progress/all"): return 200, {"attempts": mine + other}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": mine}
        if p.startswith("/api/mcq/leaderboard"): return 200, lb
        if p.startswith("/api/mcq/mistakes/chart"): return 200, {"chart": {}}
    os.makedirs("snapshots", exist_ok=True)
    for tag, w, hgt in (("desk", 1280, 900), ("phone", 390, 844)):
        with Session(user=stu, state={}, width=w, height=hgt) as s:
            s.on(r"^/api/mcq", h)
            s.goto("/v2/question-solver")
            s.page.get_by_role("button", name=re.compile("Fetch|Start", re.I)).first.wait_for(timeout=60000)
            s.page.get_by_role("combobox").nth(len(s.page.get_by_role("combobox").all()) - 1).click()
            s.page.wait_for_timeout(400)
            s.page.screenshot(path=f"snapshots/v2-picker-markers-{tag}.png")
            s.page.keyboard.press("Escape")
            s.page.get_by_role("button", name=re.compile("progress", re.I)).click()
            s.page.locator(".u2-chart").wait_for()
            s.page.screenshot(path=f"snapshots/v2-progress-trend-{tag}.png", full_page=True)
            s.page.get_by_role("tab", name="Completion").click()
            s.page.locator(".u2-done").first.wait_for()
            s.page.screenshot(path=f"snapshots/v2-progress-completion-{tag}.png", full_page=True)
            s.page.get_by_role("tab", name="My attempts").click()
            s.page.get_by_role("button", name="View").first.click()
            s.page.get_by_role("list", name="Your answers").wait_for()
            s.page.screenshot(path=f"snapshots/v2-progress-attempt-panel-{tag}.png")
            print(tag, "errors", s.errors[:3], "hscroll", s.hscroll())


if __name__ == "__main__":
    main()
