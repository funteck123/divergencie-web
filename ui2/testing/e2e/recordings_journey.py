"""TKT-0358: the student Recording Library. Fake data (harness); the YouTube player is replaced by a stub page so nothing leaves the machine."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import portals_journey as P

USER = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
def rec(i, title, subj, code, chno, ch, date, mins, batch=""):
    return {"RecordingID": f"vid{i:08d}", "YouTubeId": f"vid{i:08d}", "Title": title, "Level": "A Level", "Subject": subj, "SubjectCode": code, "ChapterNo": chno, "ChapterName": ch, "Date": date, "Batch": batch, "DurationMin": mins}
RECS = [
    rec(1, "Pure Mathematics 1: Quadratics 3", "Mathematics", "9709", 1, "Quadratics", "2023-03-06", 33.3, "B8"),
    rec(2, "Pure Mathematics 1: Quadratics 4", "Mathematics", "9709", 1, "Quadratics", "2023-03-13", 70.3, "B8"),
    rec(3, "Pure Mathematics 1: Functions 1", "Mathematics", "9709", 2, "Functions", "2023-03-19", 99.0, "B8"),
    rec(4, "Physical quantities and units 1", "Physics", "9702", 1, "Physical quantities and units", "2022-11-15", 62.0),
    rec(5, "Waves Practice 2", "Physics", "9702", 7, "Waves", "2023-02-24", 45.5),
]

def run(width, recs, out, label):
    base = P.handler_for(USER, "student")
    def h(method, path, body, st):
        if path.startswith("/api/recordings"): return 200, {"recordings": recs}
        return base(method, path, body, st)
    with Session(user=USER, state={}, width=width, height=900) as s:
        s.page.route(re.compile(r"https://www\.youtube-nocookie\.com/.*"), lambda r: r.fulfill(status=200, content_type="text/html", body="<html><body>player stub</body></html>"))
        s.on(r"^/api/", h)
        r = {}
        if width == 1280 and recs:
            s.goto("/v2/student")
            pill = s.page.get_by_role("link", name="Recording Library")
            pill.wait_for(timeout=60000)
            r["pill_href"] = pill.get_attribute("href")
        s.goto("/v2/recordings")
        s.page.get_by_role("heading", name="Recording Library").wait_for(timeout=60000)
        if not recs:
            r["empty_state"] = s.page.get_by_text("No recordings yet").count()
            r["no_iframe"] = s.page.locator("iframe").count() == 0
            s.page.screenshot(path=f"snapshots/v2-recordings-empty-{width}.png")
            r["errors"] = s.errors; out[label] = r; return
        s.page.locator("iframe").wait_for()
        r["group_headings"] = s.page.locator(".u2-rec__grouphead strong").all_inner_texts()
        r["items"] = s.page.locator(".u2-rec__item").count()
        r["subject_buttons"] = s.page.locator("[aria-label=Subject] button").all_inner_texts()
        src = lambda: s.page.locator("iframe").get_attribute("src")
        r["first_src"] = src()
        r["first_current"] = s.page.locator(".u2-rec__item[aria-current=true] .u2-rec__itemtitle").inner_text()
        r["title_h2"] = s.page.locator(".u2-rec__title").inner_text()
        box = s.page.locator(".u2-rec__frame").bounding_box(); r["frame_ratio"] = round(box["width"] / box["height"], 2)
        s.page.get_by_role("button", name=re.compile("Functions 1")).click()
        s.page.wait_for_timeout(200)
        r["after_click_src_changed"] = src() != r["first_src"] and src().endswith("rel=0&modestbranding=1") and "vid00000003" in src()
        r["after_click_title"] = s.page.locator(".u2-rec__title").inner_text()
        r["url_has_v"] = "v=vid00000003" in s.page.url
        r["one_current"] = s.page.locator(".u2-rec__item[aria-current=true]").count()
        s.page.get_by_role("button", name="Physics 9702").click(); s.page.wait_for_timeout(200)
        r["physics_items"] = s.page.locator(".u2-rec__item").count()
        r["physics_player_title"] = s.page.locator(".u2-rec__title").inner_text()
        s.page.get_by_label("Search recordings").fill("waves"); s.page.wait_for_timeout(300)
        r["search_items"] = s.page.locator(".u2-rec__item").count()
        s.page.get_by_label("Search recordings").fill("zzzz"); s.page.wait_for_timeout(300)
        r["no_match_state"] = s.page.get_by_text("No recordings match").count()
        s.page.get_by_role("button", name="Clear search").click(); s.page.wait_for_timeout(300)
        r["after_clear_items"] = s.page.locator(".u2-rec__item").count()
        r["hscroll"] = s.hscroll()
        r["errors"] = s.errors
        s.page.screenshot(path=f"snapshots/v2-recordings-{width}.png")
        out[label] = r

def main():
    out = {}
    run(1280, RECS, out, "desktop")
    run(390, RECS, out, "phone")
    run(1280, [], out, "empty")
    print(json.dumps(out, indent=1))
if __name__ == "__main__": main()
