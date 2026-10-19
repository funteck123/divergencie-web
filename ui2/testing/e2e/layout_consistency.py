"""Global layout rules, measured on every page at 1280 and 390 wide (not guessed):
  1. the page title and the page content start at the same left edge (the shell gutter);
  2. nothing makes the page scroll sideways;
  3. buttons, inputs, selects, cards and pictures share one corner radius (checkboxes and radio buttons are native and exempt);
  4. the page title is 10 to 16 px above the content under it (the Solver and Syllabus pages had 2 px)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session, MGMT
import portals_journey as P

MGMT_ROUTES = ["applications", "pipeline", "accounts", "services", "schedule", "enrollments", "billing", "guides", "templates", "tickets", "audit-log"]
JS = """() => {
  const main = document.querySelector('main') || document.body;
  const h1 = main.querySelector('h1');
  const left = (e) => Math.round(e.getBoundingClientRect().left);
  const radii = {};
  for (const e of main.querySelectorAll('button, select, textarea, input:not([type=checkbox]):not([type=radio]), .u2-box, article, img')) {
    if (e.closest('[data-radix-popper-content-wrapper], .u2-qbar')) continue;
    const r = getComputedStyle(e).borderTopLeftRadius; if (r === '0px' && !e.getBoundingClientRect().width) continue;
    radii[r] = (radii[r] || 0) + 1;
  }
  const first = [...main.children].find((c) => c !== h1 && c.getBoundingClientRect().height > 0);
  const next = h1 ? [...(h1.parentElement ? h1.parentElement.children : [])].find((c) => c !== h1 && c.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_PRECEDING && c.getBoundingClientRect().height > 0) : null;
  const gap = h1 && next ? Math.round(next.getBoundingClientRect().top - h1.getBoundingClientRect().bottom) : null;
  return {gap, h1: h1 ? left(h1) : null, first: first ? left(first) : null, radii, hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth};
}"""

def jobs():
    for r in MGMT_ROUTES: yield f"/v2/management/{r}", MGMT, None
    for kind, utype, path in [("student", "Student", "/v2/student"), ("teacher", "Teacher", "/v2/teacher"), ("staff", "Staff", "/v2/staff"), ("parent", "Parent", "/v2/parent")]:
        user = {"UserID": {"student": "STU-1", "teacher": "T", "staff": "STF-1", "parent": "PAR-1"}[kind], "UserType": utype, "Name": f"Test {utype}", "UiPreference": "next"}
        yield path, user, P.handler_for(user, kind)
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Leo", "UiPreference": "next"}
    yield "/v2/question-solver", stu, None
    yield "/v2/syllabus", stu, None

def main():
    bad = []
    for width in (1280, 390):
        for path, user, h in jobs():
            with Session(user=user, state={}, width=width, height=900) as s:
                if h: s.on(r"^/api/", h)
                s.goto(path); s.page.wait_for_timeout(1200)
                m = s.page.evaluate(JS)
                line = f"{width} {path} title@{m['h1']} first@{m['first']} gap={m['gap']} radii={m['radii']} hscroll={m['hscroll']}"
                print(line)
                if m["hscroll"] > 0: bad.append(("sideways scroll", line))
                if m["h1"] is not None and m["first"] is not None and m["h1"] != m["first"]: bad.append(("title and content on different edges", line))
                if m["gap"] is not None and not 10 <= m["gap"] <= 16: bad.append(("title is too close to, or too far from, its content", line))
                if set(m["radii"]) - {"6px"}: bad.append(("more than one corner radius", line))
    for b in bad: print("PROBLEM", *b)
    assert not bad, f"{len(bad)} layout problems"

if __name__ == "__main__":
    main()
