import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

def main():
    out = {}
    stu = {"UserID": "STU-36", "UserType": "Student", "Name": "Riddhi", "UiPreference": "next"}
    library = {"CIE": {"Physics": {"Paper 2 MCQ": [{"qpId": "qp1", "msId": "ms1", "title": "1 Motion Q"}]}}}
    qs = [{"questionNumber": str(i), "image": IMG, "optionLetters": list("ABCD"), "correctAnswer": "A"} for i in range(1, 9)]
    attempts = [{"id": "att1", "account_id": "STU-36", "subject": "CIE Physics", "chapter": "1", "paper_id": "qp1", "mode": "test", "score": 2, "total_questions": 3, "time_taken_seconds": 70, "submitted_at": "2026-10-01T10:00:00Z"}]
    resp = [{"question_number": "1", "marks_awarded": None, "marks_available": None, "student_answer": "A", "correct_answer": "A"},
            {"question_number": "2", "marks_awarded": None, "marks_available": None, "student_answer": "C", "correct_answer": "B"},
            {"question_number": "3", "marks_awarded": None, "marks_available": None, "student_answer": None, "correct_answer": "D"}]
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, library
        if p.startswith("/api/mcq/subject-meta"): return 200, {}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {"qp1": "1 Motion Q"}, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/fetch-and-digitize"): return 200, {"questions": qs}
        if p.startswith("/api/mcq/question-image"): return 200, {"image": IMG}
        if p.startswith("/api/mcq/question-responses"): return 200, {"responses": resp}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": attempts}
        if p.startswith("/api/mcq/leaderboard"): return 200, {"overall": [], "bySubject": {}, "byChapter": {}, "byPaper": {}}
        if p.startswith("/api/mcq/mistakes/chart"): return 200, {"chart": {}}
    with Session(user=stu, state={}, width=1280, height=900) as s:
        s.page.on("dialog", lambda d: d.accept())
        s.on(r"^/api/mcq", h)
        s.goto("/v2/question-solver")
        edge = "(sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().left) : null; }"
        out["edge_title_picker"] = [s.page.evaluate(edge, "main h1"), s.page.evaluate(edge, ".u2-solver-picker")]
        s.page.get_by_role("button", name=re.compile("Digitize|Fetch|Load|Start", re.I)).first.click()
        s.page.get_by_role("button", name="Test Mode").click()
        s.page.get_by_role("button", name="Submit quiz").wait_for()
        out["edge_title_quiz"] = [s.page.evaluate(edge, "main h1"), s.page.evaluate(edge, ".u2-solver")]
        out["default_is_one_page"] = s.page.locator(".u2-allq__item").count()
        # question 6 is far down the page: answer it without any navigation, then jump with the number strip
        s.page.get_by_role("button", name="Question 8", exact=True).click()
        s.page.wait_for_timeout(1200)   # smooth scroll
        in_view = s.page.evaluate("() => { const r = document.getElementById('u2-q-8').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }")
        out["jump_scrolls_to_question_8"] = in_view
        s.page.get_by_role("radiogroup", name="Answer for question 8").locator("label", has_text="A").click()
        out["answered_marker"] = s.page.get_by_role("button", name=re.compile("Question 8, answered")).count()
        out["no_next_button_in_page_mode"] = s.page.get_by_role("button", name="Next →").count()
        # switch to one at a time and back; the choice is remembered
        s.page.get_by_role("button", name="One at a time").click()
        out["one_at_a_time_cards"] = s.page.locator(".u2-allq__item").count()
        out["next_button_back"] = s.page.get_by_role("button", name="Next →").count()
        s.page.reload(wait_until="networkidle")
        out["choice_remembered_after_reload"] = s.page.evaluate("localStorage.getItem('u2-quiz-layout')")
        s.goto("/v2/question-solver")
        # progress and the answers panel
        s.page.get_by_role("button", name=re.compile("progress", re.I)).click()
        s.page.get_by_role("tab", name="History").click()
        s.page.get_by_role("button", name="View").click()
        s.page.get_by_role("list", name="Your answers").wait_for()
        out["edge_title_progress"] = [s.page.evaluate(edge, "main h1"), s.page.evaluate(edge, ".u2-solver")]
        out["answer_rows"] = s.page.locator(".u2-ans__item").count()
        out["badges"] = [b.inner_text() for b in s.page.locator(".u2-ans .u2-badge").all()]
        out["mcq_has_no_mark_scheme_button"] = s.page.get_by_role("button", name="Mark scheme").count() == 0   # TKT-0351: MCQ papers have no mark scheme picture
        s.page.locator(".u2-ans__item").nth(1).get_by_role("button", name="Question").click()
        s.page.locator(".u2-ans__item").nth(1).locator("img").wait_for()
        s.page.screenshot(path="snapshots/v2-history-answers.png", full_page=True)
        out["errors"] = s.errors[:3]
        out["hscroll"] = s.hscroll()
    for k in ("edge_title_picker", "edge_title_quiz", "edge_title_progress"):
        assert out[k][0] == out[k][1], (k, out[k])   # the title and the content share one left edge
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
