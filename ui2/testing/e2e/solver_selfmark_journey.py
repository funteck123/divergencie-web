"""TKT-0442: end a written test, mark it yourself, and resume an unfinished or ended attempt after the page is closed."""
import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    library = {"CIE": {"Physics": {"Paper 4 Theory": [{"qpId": "qp4", "msId": "ms4", "title": "1 Motion Q"}]}}}
    graded = {"questionNumber": "1", "marksAwarded": 2, "marksAvailable": 3, "remark": "Close.", "studentAnswerVerbatim": "v = d/t"}
    fail = {"on": False}
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, library
        if p.startswith("/api/mcq/subject-meta"): return 200, {"CIE": {"Physics": {"mcqComponent": "Paper 2 MCQ"}}}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {"qp4": "1 Motion Q"}, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/digitize-structured"): return 200, {"questions": [{"questionNumber": "1", "image": IMG}, {"questionNumber": "2", "image": IMG}], "answers": [{"questionNumber": "1", "image": IMG}, {"questionNumber": "2", "image": IMG}]}
        if p.startswith("/api/mcq/grade-structured-question"): return (502, {"error": "Question Solver is busy"}) if fail["on"] else (200, {**graded, "jobId": "j1"})
        if p.startswith("/api/mcq/grade-structured-status"): return 200, {"status": "done", "result": graded}
        if p.startswith("/api/mcq/attempts"): return 200, {"attempt": {"id": "att9"}}
        if p.startswith("/api/mcq/mistakes"): return 200, {"ok": True}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": []}
        if p.startswith("/api/mcq/leaderboard"): return 200, {"overall": [], "bySubject": {}, "byChapter": {}, "byPaper": {}}
    with Session(user=stu, state={}) as s:
        pg = s.page
        pg.on("dialog", lambda d: d.accept())
        s.on(r"^/api/mcq", h)
        def open_paper():
            s.goto("/v2/question-solver")
            go = re.compile("Digitize|Fetch|Load|Start", re.I)
            pg.get_by_role("button", name=go).first.wait_for(timeout=60000)
            pg.get_by_role("combobox").nth(2).click(); pg.get_by_role("option", name="Paper 4 Theory").click()
            pg.get_by_role("button", name=go).first.click()
        # 1. answer, close the page without ending: the attempt resumes
        open_paper()
        pg.get_by_role("button", name="Test Mode").click()
        pg.get_by_label("Your answer to question 1").fill("v = d/t")
        pg.wait_for_timeout(500)
        open_paper()
        pg.get_by_role("button", name="Resume it").wait_for()
        out["resume_offer_after_close"] = pg.get_by_role("button", name="Resume it").count()
        pg.get_by_role("button", name="Resume it").click()
        out["answer_restored"] = pg.get_by_label("Your answer to question 1").input_value()
        # 2. end the exam: the choice screen
        pg.get_by_role("button", name="End exam").click()
        pg.get_by_role("button", name="Mark it myself").wait_for()
        out["ended_choices"] = [pg.get_by_role("button", name=n).count() for n in ("Submit for AI grading", "Mark it myself", "Back to the exam")]
        pg.screenshot(path="snapshots/selfmark-ended.png")
        # 3. close while ended: it comes back at the choice screen with the answer kept
        open_paper()
        pg.get_by_role("button", name="Resume it").click()
        pg.get_by_role("button", name="Mark it myself").wait_for()
        out["ended_restored"] = True
        # 4. AI grading fails: the save stays and can be resumed
        fail["on"] = True
        pg.get_by_role("button", name="Submit for AI grading").click()
        try: pg.get_by_role("alert").first.wait_for(timeout=15000)
        except Exception: print("PAGE TEXT:", pg.locator("main, body").first.inner_text()[:600]); print([ (m,p) for m,p,b in s.calls if "grade" in p]); raise
        out["ai_failed_alert"] = pg.get_by_role("alert").first.inner_text()[:80]
        open_paper()
        pg.get_by_role("button", name="Resume it").wait_for()
        out["resume_after_failed_ai"] = pg.get_by_role("button", name="Resume it").count()
        pg.get_by_role("button", name="Resume it").click()
        pg.get_by_role("button", name="Mark it myself").wait_for()
        # 5. mark it myself: the mark scheme is shown, bad marks block saving, the total follows
        pg.get_by_role("button", name="Mark it myself").click()
        out["scheme_images"] = pg.get_by_role("img", name=re.compile("^Mark scheme for question")).count()
        out["own_answer_shown"] = pg.get_by_text("v = d/t").count()
        save = pg.get_by_role("button", name="Save my marks")
        out["save_disabled_at_start"] = save.get_attribute("aria-disabled") or save.is_disabled()
        q1 = pg.get_by_role("article", name="Question 1"); q2 = pg.get_by_role("article", name="Question 2")
        q1.get_by_label("Marks you give").fill("5"); q1.get_by_label("Out of").fill("3")
        out["too_many_marks_error"] = pg.get_by_text("You cannot give more marks than the question is worth.").count()
        out["save_disabled_when_bad"] = save.get_attribute("aria-disabled") or save.is_disabled()
        q1.get_by_label("Marks you give").fill("2")
        q1.get_by_label("Note for yourself").fill("forgot the unit")
        q2.get_by_label("Marks you give").fill("4"); q2.get_by_label("Out of").fill("4")
        out["banner"] = pg.locator(".u2-banner__big").inner_text()
        pg.evaluate("window.scrollTo(0, 0)"); pg.screenshot(path="snapshots/selfmark-marking.png")
        # 6. close while marking: the typed marks come back
        pg.wait_for_timeout(400)
        open_paper()
        pg.get_by_role("button", name="Resume it").click()  # it comes back on the marking screen itself
        pg.get_by_role("button", name="Save my marks").wait_for()
        out["marks_restored"] = [pg.get_by_role("article", name="Question 1").get_by_label("Marks you give").input_value(), pg.get_by_role("article", name="Question 2").get_by_label("Out of").input_value()]
        # 7. save: results show the marks and the history rows carry the self-marked remark
        pg.get_by_role("button", name="Save my marks").click()
        pg.get_by_text("Your marks are saved to your progress history").wait_for(timeout=30000)
        out["results_banner"] = pg.locator(".u2-banner").inner_text().replace("\n", " | ")
        att = [b for m, p, b in s.calls if m == "POST" and p.startswith("/api/mcq/attempts")][-1]
        mis = [b for m, p, b in s.calls if m == "POST" and p.startswith("/api/mcq/mistakes")][-1]
        out["attempt_post"] = (att["mode"], att["score"], att["totalQuestions"])
        out["mistakes_post"] = [(r["questionNumber"], r["correct"], r["marksAwarded"], r["marksAvailable"], r["remark"]) for r in mis["results"]]
        # 8. saved: nothing left to resume
        open_paper()
        pg.get_by_role("button", name="Test Mode").wait_for(); pg.wait_for_timeout(500)
        out["resume_after_saved"] = pg.get_by_role("button", name="Resume it").count()
        out["errors"] = [e for e in s.errors if "502" not in e and "busy" not in e][:3]
    for k, v in out.items(): print(k, v)
    assert out["resume_offer_after_close"] == 1 and out["answer_restored"] == "v = d/t", out
    assert out["ended_choices"] == [1, 1, 1] and out["ended_restored"], out
    assert out["resume_after_failed_ai"] == 1, out
    assert out["scheme_images"] == 2 and out["own_answer_shown"] >= 1, out
    assert out["save_disabled_at_start"] and out["too_many_marks_error"] == 1 and out["save_disabled_when_bad"], out
    assert out["banner"] == "6 / 7", out
    assert out["marks_restored"] == ["2", "4"], out
    assert out["attempt_post"] == ("test", 1, 2), out
    assert out["mistakes_post"] == [("1", False, 2, 3, "Self-marked by the student. Note: forgot the unit"), ("2", True, 4, 4, "Self-marked by the student.")], out
    assert out["resume_after_saved"] == 0, out
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
