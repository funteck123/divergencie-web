"""TKT-0356: on a phone the quiz bar is fixed to the bottom of the screen. After scrolling to the end, the LAST question (all of it,
options included) must sit clear above the bar. A fixed 120px guess left Q17 of a 17-question paper under the bar, so a student
submitted 16 answers."""
import base64, io, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
from PIL import Image
buf = io.BytesIO(); Image.new("RGB", (700, 420), (230, 235, 245)).save(buf, "PNG")
IMG = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
stu = {"UserID": "STU-2", "UserType": "Student", "Name": "S", "UiPreference": "next"}
library = {"CIE": {"Physics": {"Paper 2 MCQ": [{"qpId": "qp1", "msId": "ms1", "title": "Energy Work Power"}]}}}
qs = [{"questionNumber": str(i), "image": IMG, "optionLetters": list("ABCD"), "correctAnswer": "A"} for i in range(1, 18)]
def h(m, p, b, st):
    if p.startswith("/api/mcq/library"): return 200, library
    if p.startswith("/api/mcq/subject-meta"): return 200, {}
    if p.startswith("/api/mcq/paper-titles"): return 200, {"titles": {"qp1": "Energy Work Power"}, "subjects": {}}
    if p.startswith("/api/mcq/yearly-library"): return 200, {}
    if p.startswith("/api/mcq/fetch-and-digitize"): return 200, {"questions": qs}
    if p.startswith("/api/mcq/progress"): return 200, {"attempts": []}
    if p.startswith("/api/mcq/leaderboard"): return 200, {"overall": [], "bySubject": {}, "byChapter": {}, "byPaper": {}}

def main():
    out = {}
    for w, hgt in ((390, 844), (360, 640)):
        with Session(user=stu, state={}, width=w, height=hgt) as s:
            s.on(r"^/api/mcq", h); s.goto("/v2/question-solver")
            s.page.get_by_role("button", name=re.compile("Digitize|Fetch|Load|Start", re.I)).first.click()
            s.page.get_by_role("button", name="Test Mode").click()
            s.page.get_by_role("button", name="Submit quiz").wait_for()
            s.page.wait_for_timeout(600)
            for _ in range(3):  # lazy images change the page height as they load, so scroll to the end until it stops moving
                s.page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)"); s.page.wait_for_timeout(500)
            r = s.page.evaluate("""() => { const last = document.getElementById('u2-q-17'); const bar = document.querySelector('.u2-qbar'); const l = last.getBoundingClientRect(); const b = bar.getBoundingClientRect(); return {lastBottom: Math.round(l.bottom), barTop: Math.round(b.top), barH: Math.round(b.height), vh: innerHeight}; }""")
            out[w] = r
            assert r["lastBottom"] <= r["barTop"] + 1, (w, "the last question is under the bar", r)
            assert r["barH"] <= r["vh"] * 0.4, (w, "the fixed bar takes more than 40% of the screen", r)
    for k, v in out.items(): print(k, v)


if __name__ == "__main__":
    main()
