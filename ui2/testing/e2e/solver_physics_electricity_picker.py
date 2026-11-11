import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

# TKT-0416: IGCSE Physics numbers Electric Circuits and Digital Electronics both Ch4.3. The chapter picker must show one chapter, Electricity,
# holding every electricity worksheet, and leave the magnetism chapters (4.1, 4.5) as they are. Fake library, fake student, no real data.
def main():
    out = {}
    stu = {"UserID": "STU-36", "UserType": "Student", "Name": "Test Student", "UiPreference": "next"}
    THEORY = "Paper 4: Theory (Extended)"
    titles = [
        "Ch4.1 Simple Phenomena of Magnetism (Theory) Worksheet 1", "Ch4.2 Electrical Quantities (Theory) Worksheet 1", "Ch4.3 Electric Circuits (Theory) Worksheet 1",
        "Ch4.3 Digital Electronics (Theory) Worksheet 1", "Ch4.4 Dangers of Electricity (Theory) Worksheet 1", "Ch4.5 Electromagnetic Effects (Theory) Worksheet 1",
    ]
    ws = [{"qpId": f"q{i}", "msId": f"m{i}", "title": f"CAIE IGCSE Physics {t}"} for i, t in enumerate(titles)]
    library = {"IGCSE": {"Physics": {THEORY: ws}}}
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, library
        if p.startswith("/api/mcq/yearly-library"): return 200, {}
        if p.startswith("/api/mcq/subject-meta"): return 200, {"IGCSE": {"Physics": {}}}
        if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {}, "subjects": {}}
    with Session(user=stu, state={}) as s:
        s.on(r"^/api/mcq", h)
        s.goto("/v2/question-solver")
        s.page.get_by_label("Chapter").wait_for(timeout=120000)
        s.page.get_by_label("Chapter").click()
        out["chapter_options"] = [o.inner_text() for o in s.page.get_by_role("option").all()]
        s.page.get_by_role("option", name=re.compile("Ch 4: Electricity")).click()
        s.page.get_by_label("Paper", exact=True).click()
        out["papers_in_electricity"] = [o.inner_text() for o in s.page.get_by_role("option").all()]
        s.page.keyboard.press("Escape")
        out["errors"] = s.errors[:3]
        out["hscroll"] = s.hscroll()
    for k, v in out.items(): print(k, v)
    ch = out["chapter_options"]
    assert sum("Electricity" in c and c.startswith("Ch 4:") for c in ch) == 1, ch
    assert not any("Digital" in c for c in ch), ch
    assert any("4.1" in c for c in ch) and any("4.5" in c for c in ch), ch
    p = out["papers_in_electricity"]
    assert len(p) == 4 and any("Digital Electronics" in x for x in p) and any("Electric Circuits" in x for x in p), p
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
