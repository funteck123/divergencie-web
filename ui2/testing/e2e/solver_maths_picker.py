import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def main():
    out = {}
    stu = {"UserID": "STU-36", "UserType": "Student", "Name": "Riddhi", "UiPreference": "next"}
    P1 = "Paper 1: Pure Mathematics 1"; P2 = "Paper 2: Pure Mathematics 2"
    ws = lambda ch, name, n, i: {"qpId": f"q{i}", "msId": f"m{i}", "title": f"CAIE A Level Maths Ch{ch} {name} (P1) Worksheet {n}"}
    library = {"A Levels": {"Mathematics": {P1: [ws("1.2", "Functions", 2, 1), ws("1.1", "Quadratics", 1, 2), ws("1.2", "Functions", 1, 3)], P2: []}}}
    yp = lambda comp, v, i: {"board": "A Levels", "subject": "Mathematics", "component": comp, "year": 2022, "session": "May/June", "variant": v, "paperId": f"9709_s22_{v}", "title": f"CAIE A Levels Mathematics May/June 2022 Paper {v}"}
    yearly = {"A Levels": {"Mathematics": {P1: [yp(P1, "11", 1), yp(P1, "12", 2)], P2: [yp(P2, "21", 3)]}}}
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, library
        if p.startswith("/api/mcq/yearly-library"): return 200, yearly
        if p.startswith("/api/mcq/subject-meta"): return 200, {"A Levels": {"Mathematics": {}}}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {}, "subjects": {}}
    with Session(user=stu, state={}) as s:
        s.on(r"^/api/mcq", h)
        s.goto("/v2/question-solver")
        s.page.get_by_label("Paper Type").wait_for(timeout=60000)
        out["type_dropdown_shown"] = s.page.get_by_label("Paper Type").count()
        # component Paper 2 has no topical worksheets: the choice is still there and says why
        s.page.get_by_label("Component").click(); s.page.get_by_role("option", name=P2).click()
        out["p2_type_dropdown_still_shown"] = s.page.get_by_label("Paper Type").count()
        out["p2_auto_switched_to_yearly"] = s.page.get_by_label("Year").count()   # only yearly exists, so it opens on Yearly
        s.page.get_by_label("Paper Type").click(); s.page.get_by_role("option", name="Topical worksheets").click()
        out["p2_empty_note"] = s.page.get_by_text(re.compile("No topical worksheets for this paper yet")).count()
        s.page.get_by_label("Paper Type").click(); s.page.get_by_role("option", name="Yearly past papers").click()
        out["p2_yearly_papers_listed"] = s.page.get_by_label("Year").count()
        # topical Paper 1: chapters listed once each, worksheets narrow to the chapter
        s.page.get_by_label("Component").click(); s.page.get_by_role("option", name=P1).click()
        s.page.get_by_label("Paper Type").click(); s.page.get_by_role("option", name="Topical worksheets").click()
        s.page.get_by_label("Chapter").click()
        opts = [o.inner_text() for o in s.page.get_by_role("option").all()]
        out["chapter_options"] = opts
        s.page.get_by_role("option", name=re.compile("Ch 1.2: Functions")).click()
        s.page.get_by_label("Paper", exact=True).click()
        out["papers_after_chapter"] = [o.inner_text() for o in s.page.get_by_role("option").all()]
        s.page.keyboard.press("Escape")
        out["errors"] = s.errors[:3]
        out["hscroll"] = s.hscroll()
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
