"""TKT-0237: question search in the Question Solver picker. Fake API only. Run with U2_BASE and optionally U2_WIDTH=390."""
import re, sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

def hit(n, **o):
    return {"qpId": f"qp{n}", "msId": f"ms{n}", "board": "IGCSE", "subject": "Mathematics", "component": "Paper 2: Non-calculator (Extended)", "title": f"CAIE IGCSE Maths Ch1 Bounds Worksheet {n}", "questionNumber": str(n), "structured": False, "snippet": f"Calculate the upper bound for the area of shape {n}, correct to 1 decimal place.", **o}

def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    library = {"IGCSE": {"Mathematics": {"Paper 2: Non-calculator (Extended)": [{"qpId": "qp1", "msId": "ms1", "title": "CAIE IGCSE Maths Ch1 Bounds Worksheet 1"}]}}}
    qs = [{"questionNumber": "1", "image": IMG, "optionLetters": list("ABCD"), "correctAnswer": "A"}]
    st = {"searches": [], "fail": False}
    def h(m, p, b, state):
        if p.startswith("/api/mcq/search"):
            q = re.search(r"q=([^&]*)", p).group(1)
            st["searches"].append(q)
            if st["fail"]: return 503, {"error": "down"}
            if q == "nothingfound": return 200, {"total": 0, "results": []}
            if q == "upper%20bound": return 200, {"total": 3, "results": [hit(1), hit(2), hit(3, msId=None)]}
            return 200, {"total": 1, "results": [hit(9)]}
        if p.startswith("/api/mcq/library"): return 200, library
        if p.startswith("/api/mcq/subject-meta"): return 200, {}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {}, "subjects": {}}
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/fetch-and-digitize"): return 200, {"questions": qs}
    with Session(user=stu, state={}) as s:
        s.on(r"^/api/mcq", h)
        s.goto("/v2/question-solver")
        box = s.page.get_by_label("Search questions")
        box.wait_for(timeout=60000)
        # one letter asks nothing; typing quickly sends ONE request for the final text
        box.fill("u"); s.page.wait_for_timeout(700)
        out["one_letter_requests"] = len(st["searches"]); assert out["one_letter_requests"] == 0
        box.press_sequentially("pper bound", delay=40)
        s.page.locator(".u2-hit").first.wait_for()
        out["requests_for_fast_typing"] = list(st["searches"]); assert st["searches"] == ["upper%20bound"], st["searches"]
        out["hits"] = s.page.locator(".u2-hit").count(); assert out["hits"] == 3
        first = s.page.locator(".u2-hit").first
        out["first_hit_text"] = first.inner_text().replace("\n", " | ")
        assert "Question 1" in out["first_hit_text"] and "upper bound for the area" in out["first_hit_text"]
        # the hit without a mark scheme cannot be opened
        out["no_ms_button_disabled"] = s.page.locator(".u2-hit").nth(2).get_by_role("button", name="Open paper").is_disabled(); assert out["no_ms_button_disabled"]
        out["ms_button_enabled"] = first.get_by_role("button", name="Open paper").is_enabled(); assert out["ms_button_enabled"]
        # layout facts straight from the DOM
        out["hscroll"] = s.hscroll(); assert out["hscroll"] == 0, s.overflow_culprits()
        rows = s.page.locator(".u2-hit").evaluate_all("els => els.map(e => { const r = e.getBoundingClientRect(); const b = e.querySelector('button').getBoundingClientRect(); return [Math.round(r.right - b.right), Math.round(b.height)]; })")
        out["button_right_gap_and_height"] = rows; assert len({tuple(r) for r in rows}) == 1, rows
        # opening a hit loads that paper and leaves the search stage
        calls0 = len([c for c in s.calls if "fetch-and-digitize" in c[1]])
        first.get_by_role("button", name="Open paper").click()
        s.page.get_by_role("button", name="Test Mode").wait_for()
        sent = [c for c in s.calls if "fetch-and-digitize" in c[1]][calls0:]
        out["opened_with"] = sent[0][2] if sent else None; assert out["opened_with"] == {"qpId": "qp1", "msId": "ms1"}, out["opened_with"]
        # back to the picker for the other states
        s.goto("/v2/question-solver")
        box = s.page.get_by_label("Search questions"); box.wait_for(timeout=60000)
        box.fill("nothingfound")
        s.page.get_by_text("No question has all of those words").wait_for()
        out["empty_state"] = True
        st["fail"] = True
        box.fill("anything else")
        s.page.get_by_role("alert").filter(has_text="Search is unavailable").wait_for()
        out["error_state"] = True
        box.fill("")
        s.page.wait_for_timeout(500)
        out["cleared"] = s.page.locator(".u2-hit").count() == 0 and s.page.get_by_role("alert").filter(has_text="Search is unavailable").count() == 0
        assert out["cleared"]
        out["console_errors"] = [e for e in s.errors if "503" not in e]; assert not out["console_errors"], out["console_errors"]
    print(json.dumps(out, indent=1))

if __name__ == "__main__":
    main()
