"""TKT-0445: a teacher checks a student's self-marked paper. The API is mocked; the screens are the real ones."""
import re, sys, os, json, base64, io
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def picture(text, w=760, h=200):
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (w, h), "white"); d = ImageDraw.Draw(im)
    for i, line in enumerate(text.split("|")): d.text((16, 16 + i * 26), line, fill="black")
    b = io.BytesIO(); im.save(b, "PNG"); return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()
QP = picture("1  A car travels 120 m in 8.0 s.|(a) Calculate its average speed.  [2]|(b) State the unit of speed.  [1]")
MS = picture("1 (a) speed = distance / time  (M1)|    = 120 / 8.0 = 15 m/s  (A1)|(b) m/s  (B1)")

def main():
    out = {}
    teacher = {"UserID": "TCH-1", "UserType": "Teacher", "Name": "Atiqa", "UiPreference": "next"}
    student = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    library = {"CIE": {"Physics": {"Paper 4 Theory": [{"qpId": "qp4", "msId": "ms4", "title": "1 Motion Q"}]}}}
    item = {"attemptId": "A1", "accountId": "STU-1", "accountName": "Sam", "subject": "CIE Physics", "chapter": "1", "paperId": "qp4", "createdAt": "2026-11-25T10:00:00Z", "questions": 2, "awarded": 6, "available": 7, "check": None}
    responses = [
        {"question_number": "1", "student_answer": "speed = 120 / 8 = 15", "marks_awarded": 2, "marks_available": 3, "remark": "Self-marked by the student. Note: forgot the unit"},
        {"question_number": "2", "student_answer": "", "marks_awarded": 4, "marks_available": 4, "remark": "Self-marked by the student."},
    ]
    state = {"saved": []}
    def h(m, p, b, st):
        if p.startswith("/api/mcq/self-marked"): return 200, {"items": [item]}
        if p.startswith("/api/mcq/teacher-check"):
            state["saved"].append(b); return 200, {"saved": len(b["rows"])}
        if p.startswith("/api/mcq/question-responses"): return 200, {"responses": responses}
        if p.startswith("/api/mcq/question-image"): return 200, {"image": MS if "kind=ms" in p else QP}
        if p.startswith("/api/mcq/library"): return 200, library
        if p.startswith("/api/mcq/subject-meta"): return 200, {}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {"qp4": "1 Motion Q"}, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": []}
    # a student never sees the button
    with Session(user=student, state={}) as s:
        s.on(r"^/api/mcq", h); s.goto("/v2/question-solver")
        s.page.get_by_role("button", name=re.compile("Fetch this paper|Load|Start", re.I)).first.wait_for(timeout=90000)
        out["student_sees_button"] = s.page.get_by_role("button", name="Check self-marked papers").count()
    with Session(user=teacher, state={}, width=1280, height=900) as s:
        pg = s.page
        s.on(r"^/api/mcq", h); s.goto("/v2/question-solver")
        pg.get_by_role("button", name="Check self-marked papers").click()
        pg.get_by_text("Not checked").wait_for(timeout=30000)
        out["list_row"] = pg.get_by_role("row").nth(1).inner_text().replace("\n", " | ")
        pg.screenshot(path="snapshots/teacher-check-list.png")
        pg.get_by_role("button", name="Check", exact=True).click()
        pg.get_by_role("article", name="Question 1").wait_for(); pg.wait_for_timeout(600)
        out["pictures"] = [pg.get_by_role("img", name="Question 1", exact=True).count(), pg.get_by_role("img", name="Answer 1", exact=True).count()]
        out["student_note_shown"] = pg.get_by_text("Comment: forgot the unit").count()
        out["banner_start"] = pg.locator(".u2-banner").inner_text().replace("\n", " ")
        q1 = pg.get_by_role("article", name="Question 1")
        q1.get_by_label("Your marks").fill("3"); q1.get_by_label("Comment for the student").fill("The unit was given in the question.")
        pg.wait_for_timeout(300); out["banner_after_change"] = pg.locator(".u2-banner").inner_text().replace("\n", " ")
        pg.screenshot(path="snapshots/teacher-check-detail.png")
        # a mark above the total blocks saving and names the question
        q1.get_by_label("Your marks").fill("9"); pg.get_by_role("button", name="Save my check").click()
        out["bad_mark_message"] = pg.get_by_text("You cannot give more marks than the question is worth.").count()
        out["saved_when_bad"] = len(state["saved"])
        q1.get_by_label("Your marks").fill("3"); pg.get_by_role("button", name="Save my check").click()
        pg.get_by_text("Your check is saved").wait_for(timeout=30000)
        out["saved_body"] = state["saved"][-1]
        out["errors"] = [e for e in s.errors][:3]
    for k, v in out.items(): print(k, v)
    assert out["student_sees_button"] == 0, out
    assert out["pictures"] == [1, 1] and out["student_note_shown"] == 1, out
    assert "Student 6 / 7" in out["banner_start"] and "6 / 7" in out["banner_start"] and "7 / 7" in out["banner_after_change"], out
    assert out["bad_mark_message"] >= 1 and out["saved_when_bad"] == 0, out
    assert out["saved_body"] == {"attemptId": "A1", "rows": [{"questionNumber": "1", "marksAwarded": 3, "marksAvailable": 3, "comment": "The unit was given in the question."}, {"questionNumber": "2", "marksAwarded": 4, "marksAvailable": 4, "comment": ""}]}, out
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
