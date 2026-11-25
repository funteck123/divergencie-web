"""TKT-0453: the library shows from the copy kept in the browser while (or even if) the service is slow or down."""
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    state = {"down": False, "library_calls": 0}
    library = {"CIE": {"Physics": {"Paper 2 MCQ": [{"qpId": "qp1", "msId": "ms1", "title": "1 Motion Q"}]}}}
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"):
            state["library_calls"] += 1
            return (502, {"error": "Question Solver did not answer properly"}) if state["down"] else (200, library)
        if p.startswith("/api/mcq/subject-meta"): return (502, {"error": "down"}) if state["down"] else (200, {})
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {"qp1": "1 Motion Q"}, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": []}
    with Session(user=stu, state={}) as s:
        pg = s.page; s.on(r"^/api/mcq", h)
        s.goto("/v2/question-solver")
        pg.get_by_role("button", name=re.compile("Fetch this paper|Load|Start", re.I)).first.wait_for(timeout=90000)
        out["first_visit_saved_copy"] = pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('u2.solver.bundle.v1.'))")
        state["down"] = True
        pg.reload(wait_until="domcontentloaded")
        pg.get_by_role("button", name=re.compile("Fetch this paper|Load|Start", re.I)).first.wait_for(timeout=90000)
        out["picker_with_service_down"] = pg.get_by_role("combobox").count() >= 3
        pg.wait_for_timeout(1500)
        out["errors"] = [e for e in s.errors if "502" not in e and "down" not in e][:3]
        pg.screenshot(path="snapshots/library-from-saved-copy.png")
    for k, v in out.items(): print(k, v)
    assert out["first_visit_saved_copy"] == ["u2.solver.bundle.v1.STU-1"] and out["picker_with_service_down"], out
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
