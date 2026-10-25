"""TKT-0379: the Solved practical papers option in the Question Solver picker. All data is fake (harness)."""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

P2, P5 = "Paper 2 MCQ", "Paper 5: Planning, Analysis and Evaluation (A Level)"
LIBRARY = {"A Levels": {"Physics": {P2: [{"qpId": "qp1", "msId": "ms1", "title": "Ch1 Motion (MCQ) Worksheet 1"}], P5: []}}}
YEARLY = {"A Levels": {"Physics": {P5: [{"paperId": "y51", "year": 2024, "session": "May/June", "variant": "51", "title": "9702 s24 51"}]}}}
SOLVED = {"A Levels": {"Physics": {P5: [
    {"solvedId": "SOL-aaa", "title": "Paper 5 worked solutions, all variants 2010 to 2016", "kind": "Worked solutions", "pages": 243},
    {"solvedId": "SOL-bbb", "title": "Paper 5 mark schemes, all years (compiled)", "kind": "Mark schemes", "pages": 900},
]}}}


def handler(method, path, body, st):
    if path.startswith("/api/mcq/solved-library"): return 200, SOLVED
    if path.startswith("/api/mcq/yearly-library"): return 200, YEARLY
    if path.startswith("/api/mcq/library"): return 200, LIBRARY
    if path.startswith("/api/mcq/subject-meta"): return 200, {}
    if path.startswith("/api/mcq/paper-titles"): return 200, {"titles": {}, "subjects": {}}
    if path.startswith("/api/mcq/progress"): return 200, {"attempts": []}
    return None


def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    with Session(user=stu, state={}) as s:
        s.on(r"^/api/mcq", handler)
        s.goto("/v2/question-solver")
        s.page.get_by_text("Choose a paper from the library").wait_for(timeout=60000)
        page = s.page
        # the Physics component picker: Board, Subject, Component are the first three boxes
        page.get_by_role("combobox").nth(2).click(); page.get_by_role("option", name=re.compile("^Paper 5")).click()
        # this component has no topical worksheets: the picker must not open on an empty list, and must say which kinds exist
        type_box = page.get_by_role("combobox", name="Paper Type")
        out["opens_on"] = type_box.inner_text().split("\n")[0].strip()  # the box also holds a dropdown arrow
        type_box.click()
        out["type_options"] = [o.inner_text().strip() for o in page.get_by_role("option").all()]
        page.keyboard.press("Escape")
        assert out["opens_on"] == "Yearly past papers", f"a component with no topical worksheets should open on its yearly papers, got {out['opens_on']}"
        assert sorted(out["type_options"]) == ["Solved practical papers", "Topical worksheets", "Yearly past papers"], out["type_options"]  # the list is A to Z
        type_box.click(); page.get_by_role("option", name="Topical worksheets").click()
        out["topical_empty_note"] = page.get_by_role("status").filter(has_text="No topical worksheets").inner_text()
        assert "Yearly past papers and Solved practical papers" in out["topical_empty_note"], out["topical_empty_note"]
        # switch to Solved: the documents are listed with their kind and size, and the button opens a PDF instead of starting a quiz
        type_box.click(); page.get_by_role("option", name="Solved practical papers").click()
        out["button"] = page.get_by_role("button", name="Open solved paper").inner_text()
        page.get_by_role("combobox", name="Paper", exact=True).click()
        out["solved_options"] = [o.inner_text().strip() for o in page.get_by_role("option").all()]
        assert any("Worked solutions" in o and "243 pages" in o for o in out["solved_options"]), out["solved_options"]
        page.get_by_role("option", name=re.compile("worked solutions")).click()
        os.makedirs("snapshots", exist_ok=True); page.screenshot(path="snapshots/v2-solver-solved-picker.png")
        out["hint"] = page.get_by_text("Opens as a PDF in a new tab").count()
        assert out["hint"] == 1
        with page.expect_popup() as pop:
            page.get_by_role("button", name="Open solved paper").click()
        out["popup_url"] = pop.value.url
        assert out["popup_url"].endswith("/api/mcq/solved-pdf?id=SOL-aaa"), out["popup_url"]
        pop.value.close()
        out["no_quiz_started"] = page.get_by_role("button", name="Test Mode").count() == 0
        assert out["no_quiz_started"], "a solved paper must not start a quiz"
        # a component that does have topical worksheets still opens on them
        page.get_by_role("combobox").nth(2).click(); page.get_by_role("option", name=P2).click()
        out["type_on_mcq_component"] = page.get_by_role("combobox", name="Paper Type").inner_text().split("\n")[0].strip()
        assert out["type_on_mcq_component"] == "Topical worksheets", out["type_on_mcq_component"]
        out["errors"] = s.errors[:3]
        out["hscroll"] = s.hscroll()
    for k, v in out.items(): print(k, v)


if __name__ == "__main__":
    main()
