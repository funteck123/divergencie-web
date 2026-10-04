import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    library = {"CIE": {"Physics": {"Paper 2 MCQ": [{"qpId": "qp1", "msId": "ms1", "title": "1 Motion Q"}]}}}
    qs = [{"questionNumber": str(i), "image": IMG, "optionLetters": list("ABCD"), "correctAnswer": "A" if i < 3 else None} for i in (1, 2, 3)]
    attempts = [{"id": "att1", "account_id": "STU-1", "subject": "CIE Physics", "chapter": "1", "paper_id": "qp1", "mode": "test", "score": 2, "total_questions": 2, "time_taken_seconds": 70, "submitted_at": "2026-10-01T10:00:00Z"}]
    lb = {"overall": [{"accountId": "STU-1", "name": "Sam", "attempts": 1, "uniquePapers": 1, "uniqueQuestions": 2}], "bySubject": {}, "byChapter": {}, "byPaper": {}}
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, library
        if p.startswith("/api/mcq/subject-meta"): return 200, {}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {"qp1": "1 Motion Q"}, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/fetch-and-digitize"): return 200, {"questions": qs}
        if p.startswith("/api/mcq/attempts"): return 200, {"attempt": {"id": "att2"}}
        if p.startswith("/api/mcq/mistakes/chart"): return 200, {"chart": {"CIE Physics": {"1": 2}}}
        if p.startswith("/api/mcq/mistakes"): return 200, {"ok": True}
        if p.startswith("/api/mcq/progress/all"): return 200, {"attempts": attempts}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": attempts}
        if p.startswith("/api/mcq/leaderboard"): return 200, lb
        if p.startswith("/api/mcq/question-responses"): return 200, {"responses": [{"question_number": "1", "marks_awarded": None, "marks_available": None, "student_answer": "A"}]}
    with Session(user=stu, state={}) as s:
        s.page.on("dialog", lambda d: d.accept())
        s.on(r"^/api/mcq", h)
        s.goto("/v2/question-solver")
        s.page.get_by_role("button", name=re.compile("Digitize|Fetch|Load|Start", re.I)).first.wait_for(timeout=60000)
        out["picker"] = s.page.get_by_text("Choose a paper from the library").count()
        # the first paper request drops (a flaky connection): the page retries and the paper still opens
        drops = {"n": 0}
        def drop_once(route):
            if drops["n"] == 0:
                drops["n"] += 1; return route.abort("failed")
            return route.fallback()
        s.page.route("**/api/mcq/fetch-and-digitize", drop_once)
        s.page.get_by_role("button", name=re.compile("Digitize|Fetch|Load|Start", re.I)).first.click()
        s.page.get_by_role("button", name="Test Mode").click()
        out["retried_after_drop"] = drops["n"]
        # a mobile keyboard resize must not close anything: pick answers by radio
        for q in ("1", "2", "3"):
            s.page.get_by_role("radiogroup", name=f"Answer for question {q}").locator("label", has_text="A").click()
            if q != "3": s.page.get_by_role("button", name="Next →").click()
        out["autosave"] = s.page.evaluate("() => !!localStorage.getItem('mcqTestAutosave.v1')")
        s.page.get_by_role("button", name="Submit quiz").click()
        s.page.get_by_role("status").filter(has_text="Score").first.wait_for()
        out["score"] = s.page.locator(".u2-banner__big").inner_text()
        s.page.get_by_text("Score saved to your progress history.").wait_for()
        out["autosave_cleared"] = s.page.evaluate("() => !localStorage.getItem('mcqTestAutosave.v1')")
        posts = [(p, b) for m, p, b in s.calls if m == "POST" and "/api/mcq/attempts" in p or m == "POST" and "/api/mcq/mistakes" in p]
        out["posts"] = [(p, {k: v for k, v in (b or {}).items() if k in ("mode", "score", "totalQuestions", "paperId", "attemptId")}) for p, b in posts]
        s.page.get_by_role("button", name=re.compile("progress", re.I)).click()
        s.page.get_by_role("tab", name="History").click()
        out["history_rows"] = s.page.get_by_role("row").count()
        s.page.get_by_role("button", name="View").click()
        s.page.get_by_text("Question 1").first.wait_for()
        s.page.get_by_role("tab", name="Mistakes").click()
        out["bars"] = s.page.get_by_text("Mistakes per chapter").count() or s.page.locator("svg").count()
        s.page.get_by_role("tab", name="Leaderboard").click()
        out["lb_you"] = s.page.get_by_text("(you)").count()
        # the one dropped request above is deliberate and shows as a console error
        out["errors"] = [e for e in s.errors if "ERR_FAILED" not in e][:3]
        out["hscroll"] = s.hscroll()

    # ---- second paper: practice, upload, mistakes mode, written answers ----
    library2 = {"CIE": {"Physics": {"Paper 2 MCQ": [{"qpId": "qp1", "msId": "ms1", "title": "1 Motion Q"}], "Paper 4 Theory": [{"qpId": "qp4", "msId": "ms4", "title": "1 Motion Q"}]}}}
    meta2 = {"CIE": {"Physics": {"Paper 4 Theory": {}}}}
    graded = {"questionNumber": "1", "marksAwarded": 2, "marksAvailable": 3, "remark": "Close.", "studentAnswerVerbatim": "v = d/t", "markBreakdown": [{"markLabel": "M1", "awarded": True, "evidence": "v = d/t"}, {"markLabel": "A1", "awarded": False, "whatWasNeeded": "units"}], "fullMarkAnswer": "v = d/t = 5 m/s"}
    def h2(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, library2
        if p.startswith("/api/mcq/subject-meta"): return 200, {"CIE": {"Physics": {"mcqComponent": "Paper 2 MCQ"}}}
        if p.startswith("/api/mcq/digitize-structured"): return 200, {"questions": [{"questionNumber": "1", "image": IMG}], "answers": [{"questionNumber": "1", "image": IMG}]}
        if p.startswith("/api/mcq/grade-structured-question"): return 200, {**graded, "jobId": "j1"}
        if p.startswith("/api/mcq/grade-structured-status"): return 200, {"status": "done", "result": graded}
        if p.startswith("/api/mcq/digitize"): return 200, {"questions": qs}
        if p.startswith("/api/mcq/mistakes") and m == "GET": return 200, {"mistakes": [{"paperId": "qp1", "subject": "CIE Physics", "chapter": "1", "questionNumber": "2"}]}
        if p.startswith("/api/mcq/paper?"): return 200, {"questions": qs}
        r = h(m, p, b, st)
        return r
    with Session(user=stu, state={}) as s:
        s.page.on("dialog", lambda d: d.accept())
        s.on(r"^/api/mcq", h2)
        s.goto("/v2/question-solver")
        go = re.compile("Digitize|Fetch|Load|Start", re.I)
        s.page.get_by_role("button", name=go).first.wait_for(timeout=60000)
        s.page.get_by_role("combobox").nth(2).click(); s.page.get_by_role("option", name="Paper 2 MCQ").click()
        # practice: no radios, Question/Answer tabs, finishing records a practice attempt
        s.page.get_by_role("button", name=go).first.click()
        s.page.get_by_role("button", name="Practice Mode").click()
        s.page.get_by_role("tab", name="Answer").click()
        s.page.get_by_text("Correct answer:").first.wait_for(); out["practice_answer"] = s.page.get_by_text("Correct answer:").count()
        s.page.get_by_role("button", name="Pause").click(); s.page.get_by_role("button", name="Resume").click()
        s.page.get_by_role("button", name="Done practicing").click()
        out["practice_post"] = [b.get("mode") for m, p, b in s.calls if m == "POST" and p.startswith("/api/mcq/attempts")]
        # mistakes mode
        s.page.get_by_role("button", name="Mistakes Mode").click()
        s.page.get_by_role("radiogroup", name="Answer for question 1").locator("label", has_text="B").click()
        s.page.get_by_role("button", name="Submit quiz").click()
        s.page.get_by_text("Results saved.").wait_for()
        mp = [b for m, p, b in s.calls if m == "POST" and p.startswith("/api/mcq/mistakes")][-1]
        out["mistakes_post"] = (mp["paperId"], [(r["questionNumber"], r["correct"]) for r in mp["results"]], mp["attemptId"])
        s.page.get_by_role("button", name="Back to library").click()
        # upload
        s.page.get_by_role("button", name=re.compile("upload your own")).click()
        out["upload_disabled"] = s.page.get_by_role("button", name="Digitize this paper").get_attribute("aria-disabled")
        pdf = os.path.join(os.environ.get("CLAUDE_JOB_DIR", "/tmp"), "tmp", "x.pdf"); os.makedirs(os.path.dirname(pdf), exist_ok=True); open(pdf, "wb").write(b"%PDF-1.4\n")
        ins = s.page.locator("input[type=file]"); ins.nth(0).set_input_files(pdf); ins.nth(1).set_input_files(pdf)
        s.page.get_by_role("button", name="Digitize this paper").click()
        s.page.get_by_role("button", name="Test Mode").click()
        s.page.get_by_role("button", name="Submit quiz").click()
        s.page.get_by_text("Manually uploaded papers aren't tracked").wait_for()
        out["upload_untracked"] = True
        s.page.get_by_role("button", name="Back to library").click()
        # written answers
        s.page.get_by_role("combobox").nth(2).click(); s.page.get_by_role("option", name="Paper 4 Theory").click()
        s.page.get_by_role("button", name=go).first.click()
        s.page.get_by_role("button", name="Test Mode").click()
        s.page.get_by_label("Your answer to question 1").fill("v = d/t")
        s.page.get_by_role("button", name="Submit quiz").click()
        s.page.get_by_text("Mark-by-mark breakdown").wait_for(timeout=30000)
        out["structured_score"] = s.page.locator(".u2-banner__big").inner_text()
        out["structured_text"] = [s.page.get_by_text(t).count() for t in ("What a full-mark answer looks like", "Needed: units")]
        out["errors2"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
