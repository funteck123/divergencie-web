import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    lst = [{"filename": "phys.json", "subject": "Physics", "level": "IGCSE", "code": "0625", "cycle": "2026"}, {"filename": "bio.json", "subject": "Biology", "level": "A Level", "code": "9700", "cycle": "2026"}]
    syl = {"pageCount": 40, "sectionGuessed": True, "overviewImageMissing": True, "tree": [
        {"code": "1", "title": "Motion", "depth": 0, "content": "[Core]\n• speed\n• velocity", "children": [{"code": "1.1", "title": "Speed", "depth": 1, "content": "• distance over time"}]},
        {"code": "2", "title": "Forces", "depth": 0, "content": ""}]}
    comps = [{"account_id": "STU-1", "subject": "phys.json", "node_key": "0.0", "node_label": "Speed", "completed_at": "2026-10-01T10:00:00Z"}, {"account_id": "X", "subject": "phys.json", "node_key": "0.1", "node_label": "Speed", "completed_at": "2026-10-01T11:00:00Z"}]
    lb = {"overall": [{"accountId": "X", "name": "Xan", "topicsCompleted": 3}, {"accountId": "STU-1", "name": "Sam", "topicsCompleted": 1}], "bySubject": {"phys.json": [{"accountId": "STU-1", "name": "Sam", "topicsCompleted": 1}]}, "byChapter": {}}
    def h(m, p, b, st):
        if p.startswith("/api/syllabus/syllabi/phys.json"): return 200, syl
        if p.startswith("/api/syllabus/syllabi"): return 200, lst
        if p.startswith("/api/syllabus/topic-complete"): return 200, {"ok": True}
        if p.startswith("/api/syllabus/progress/all"): return 200, {"completions": comps}
        if p.startswith("/api/syllabus/progress"): return 200, {"completions": comps[:1]}
        if p.startswith("/api/syllabus/leaderboard"): return 200, lb
    with Session(user=stu, state={}) as s:
        s.on(r"^/api/syllabus", h)
        s.goto("/v2/syllabus")
        s.page.get_by_role("button", name=re.compile("Biology")).wait_for(timeout=60000)
        s.page.get_by_label("Filter subjects").fill("phy")
        out["filtered"] = s.page.get_by_role("button", name=re.compile("Biology")).count()
        s.page.get_by_role("button", name=re.compile("Physics")).click()
        s.page.get_by_text("best guess").wait_for()
        out["meta"] = s.page.get_by_text(re.compile("40 pages")).count()
        s.page.get_by_role("button", name=re.compile("^▶?\\s*1\\s*Motion")).click()
        s.page.get_by_text("View extracted text").first.click()
        out["bullets"] = s.page.get_by_text("velocity").count()
        grp = s.page.get_by_role("group", name="Tags for Motion")
        grp.locator("label", has_text="Completed").click()
        grp.locator("label", has_text="Revise").click()
        s.page.wait_for_timeout(300)
        out["post"] = [(b["subject"], b["nodeKey"], b["completed"], b["accountName"]) for m, p, b in s.calls if m == "POST" and "topic-complete" in p]
        out["stored"] = s.page.evaluate("() => localStorage.getItem('syllabusDigitizerTags')")
        s.page.get_by_role("group", name="Tags for Motion").locator("label", has_text="Completed").click()
        s.page.wait_for_timeout(300)
        out["untick"] = [b["completed"] for m, p, b in s.calls if m == "POST" and "topic-complete" in p]
        with s.page.expect_download() as d:
            s.page.get_by_role("button", name="Export tagged topics").click()
        out["download"] = d.value.suggested_filename
        txt = open(d.value.path()).read()
        out["export_has"] = ["Revise" in txt, "Motion" in txt, "Completed" in txt]
        s.page.get_by_role("button", name="view raw JSON").click()
        out["raw"] = s.page.get_by_label("Raw JSON").count()
        s.page.get_by_role("button", name=re.compile("My progress")).click()
        s.page.get_by_text("Completed topics").first.wait_for()
        out["rows"] = s.page.get_by_role("row").count()
        out["chart"] = s.page.locator("svg[role=img]").count()
        out["you"] = s.page.get_by_text("(you)").count()
        out["errors"] = s.errors[:3]
        out["hscroll"] = s.hscroll()
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
