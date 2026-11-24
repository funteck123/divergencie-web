"""TKT-0447: DC Practice in the Question Solver. Library, paper list and questions come from the real /api/mcq proxy (read with the Management token);
only the signed-in person is mocked, and scores are never saved. Run against the live site: U2_BASE=https://www.divergencie.co.uk"""
import json, os, re, sys, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

cfg = json.load(open(os.path.expanduser("~/.dcp1/config.json"))); BASE = cfg["baseUrl"].rstrip("/")
def live(path, body=None):
    req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers={"Authorization": "Bearer " + cfg["token"], "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=120))

def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    cache = {}
    def h(m, p, b, st):
        if p.startswith("/api/mcq/fetch-and-digitize"):
            key = b.get("qpId"); cache.setdefault(key, live("/api/mcq/fetch-and-digitize", b)); return 200, cache[key]
        if m == "GET" and re.match(r"/api/mcq/(library|subject-meta|paper-titles|yearly-library)", p): return 200, live(p)
        if p.startswith("/api/mcq/attempts"): return 200, {"attempt": {"id": "att-test"}}
        if p.startswith("/api/mcq/mistakes"): return 200, {"ok": True} if m == "POST" else {"mistakes": []}
        if p.startswith("/api/mcq/progress"): return 200, {"attempts": []}
        if p.startswith("/api/mcq/leaderboard"): return 200, {"overall": [], "bySubject": {}, "byChapter": {}, "byPaper": {}}
    with Session(user=stu, state={}, width=1280, height=900) as s:
        pg = s.page; pg.on("dialog", lambda d: d.accept())
        s.on(r"^/api/mcq", h)
        s.goto("/v2/question-solver")
        pg.get_by_role("combobox").first.wait_for(timeout=90000)
        def pick(i, name):
            pg.get_by_role("combobox").nth(i).click(); pg.get_by_role("option", name=name, exact=True).click()
        pick(0, "IGCSE"); pick(1, "Mathematics"); pick(2, "DC Practice")
        pg.wait_for_timeout(500); pg.screenshot(path="snapshots/dc-practice-picker.png")
        out["component_boxes"] = [c.inner_text()[:40] for c in pg.get_by_role("combobox").all()]
        pg.get_by_role("button", name=re.compile("Fetch this paper|Load|Start", re.I)).first.click()
        pg.get_by_role("button", name="Test Mode").wait_for(timeout=60000)
        out["ready_line"] = pg.get_by_role("status").first.inner_text()
        pg.get_by_role("button", name="Practice Mode").click()
        pg.get_by_role("img", name="Question 1", exact=True).wait_for(); pg.wait_for_timeout(600); pg.screenshot(path="snapshots/dc-practice-practice-mode.png")
        out["practice_has_radios"] = pg.get_by_role("radio").count()
        pg.get_by_role("tab", name="Answer").first.click(); out["practice_answer"] = pg.get_by_text("Correct answer:").first.inner_text()
        pg.get_by_role("button", name="Done practicing").click()
        # test mode: answer the first three questions, submit, read the score
        pg.get_by_role("combobox").first.wait_for(); pick(0, "IGCSE"); pick(1, "Mathematics"); pick(2, "DC Practice")  # the picker starts again after practice
        pg.get_by_role("button", name=re.compile("Fetch this paper|Load|Start", re.I)).first.click()
        pg.get_by_role("button", name="Test Mode").click()
        paper = live("/api/mcq/fetch-and-digitize", {"qpId": "dc-alg-cs-e", "msId": "dc-alg-cs-e"})["questions"]
        for q in paper[:3]:
            pg.get_by_role("radiogroup", name=f"Answer for question {q['questionNumber']}", exact=True).locator("label", has_text=q["correctAnswer"]).click()
        pg.wait_for_timeout(500); pg.screenshot(path="snapshots/dc-practice-test-mode.png")
        pg.get_by_role("button", name="Submit quiz").click()
        pg.locator(".u2-banner__big").wait_for(timeout=30000)
        out["score_three_correct"] = pg.locator(".u2-banner__big").inner_text()
        pg.screenshot(path="snapshots/dc-practice-results.png")
        att = [b for m, p, b in s.calls if m == "POST" and p.startswith("/api/mcq/attempts")]
        out["attempt_post"] = [(a["subject"], a["paperId"], a["mode"], a.get("score"), a["totalQuestions"]) for a in att]
        out["errors"] = [e for e in s.errors][:3]
    for k, v in out.items(): print(k, v)
    assert out["practice_has_radios"] == 0 and out["score_three_correct"] == "3 / 30", out
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
