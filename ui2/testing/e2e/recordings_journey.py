"""TKT-0358: the student Recording Library, laid out like a course: one course at a time, one chapter open at a time, Previous and Next lesson.
Fake data (harness); the YouTube player is replaced by a stub page so nothing leaves the machine."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import portals_journey as P

USER = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
def rec(i, title, subj, code, comp, chno, ch, date, mins, batch=""):
    return {"RecordingID": f"vid{i:08d}", "YouTubeId": f"vid{i:08d}", "Title": title, "Level": "A Level", "Subject": subj, "SubjectCode": code, "Component": comp, "ChapterNo": chno, "ChapterName": ch, "Date": date, "Batch": batch, "DurationMin": mins}
PURE, STATS = "Pure Mathematics 1", "Probability and Statistics 1"
RECS = [
    rec(1, "Quadratics 3", "Mathematics", "9709", PURE, 1, "Quadratics", "2023-03-06", 33.3, "B8"),
    rec(2, "Quadratics 4", "Mathematics", "9709", PURE, 1, "Quadratics", "2023-03-13", 70.3, "B8"),
    rec(3, "Functions 1", "Mathematics", "9709", PURE, 2, "Functions", "2023-03-19", 99.0, "B8"),
    rec(4, "Representation of data 2", "Mathematics", "9709", STATS, 1, "Representation of data", "2023-03-16", 71.8),
    rec(5, "Physical quantities and units 1", "Physics", "9702", "", 1, "Physical quantities and units", "2022-11-15", 62.0),
    rec(6, "Waves Practice 2", "Physics", "9702", "", 7, "Waves", "2023-02-24", 45.5),
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
            pill = s.page.get_by_role("link", name="Recording Library"); pill.wait_for(timeout=60000)
            r["pill_href"] = pill.get_attribute("href")
        s.goto("/v2/recordings")
        s.page.get_by_role("heading", name="Recording Library").wait_for(timeout=60000)
        if not recs:
            r["empty_state"] = s.page.get_by_text("No recordings yet").count(); r["no_iframe"] = s.page.locator("iframe").count() == 0
            s.page.screenshot(path=f"snapshots/v2-recordings-empty-{width}.png"); r["errors"] = s.errors; out[label] = r; return
        s.page.locator("iframe").wait_for()
        items = lambda: s.page.locator(".u2-rec__item").count()
        src = lambda: s.page.locator("iframe").get_attribute("src")
        r["course_buttons"] = s.page.locator("[aria-label=Course] button").all_inner_texts()
        r["no_all_subjects_button"] = s.page.get_by_role("button", name="All subjects").count() == 0
        r["first_course_items"] = items()              # Probability and Statistics 1 has one recording
        r["first_course_chapters"] = s.page.locator(".u2-rec__chapter").all_inner_texts()
        # choose the Pure Mathematics 1 course: only its chapters show, one chapter open
        s.page.get_by_role("button", name=re.compile("Pure Mathematics 1")).click(); s.page.wait_for_timeout(300)
        r["pure_chapters"] = s.page.locator(".u2-rec__chapter").all_inner_texts()
        r["pure_open_chapters"] = s.page.locator(".u2-rec__grouphead[aria-expanded=true]").count()
        r["pure_items_visible"] = items()              # only the open chapter's lessons (Quadratics: 2)
        r["pure_first_title"] = s.page.locator(".u2-rec__title").inner_text()
        r["prev_disabled_at_first"] = s.page.get_by_role("button", name="Previous lesson").is_disabled()
        r["lesson_counter"] = s.page.locator(".u2-rec__sub").inner_text()
        # opening another chapter closes the first one
        s.page.get_by_role("button", name=re.compile("Chapter 2")).click(); s.page.wait_for_timeout(200)
        r["after_open_ch2_open_count"] = s.page.locator(".u2-rec__grouphead[aria-expanded=true]").count()
        r["after_open_ch2_items"] = items()
        # next lesson walks across the chapter
        s.page.locator(".u2-rec__item").first.click(); s.page.wait_for_timeout(200)
        r["clicked_title"] = s.page.locator(".u2-rec__title").inner_text(); r["src_has_vid3"] = "vid00000003" in src()
        s.page.get_by_role("button", name="Previous lesson").click(); s.page.wait_for_timeout(200)
        r["prev_goes_to"] = s.page.locator(".u2-rec__title").inner_text()
        s.page.get_by_role("button", name="Next lesson").click(); s.page.wait_for_timeout(200)
        r["next_goes_to"] = s.page.locator(".u2-rec__title").inner_text()
        r["next_disabled_at_last"] = s.page.get_by_role("button", name="Next lesson").is_disabled()
        r["url_has_v_and_course"] = "v=vid00000003" in s.page.url and "course=" in s.page.url
        # search inside the course opens the matching chapters
        s.page.get_by_label("Search this course").fill("quad"); s.page.wait_for_timeout(300)
        r["search_items"] = items(); s.page.get_by_label("Search this course").fill("zzzz"); s.page.wait_for_timeout(300)
        r["no_match_state"] = s.page.get_by_text("No recordings match").count()
        s.page.get_by_role("button", name="Clear search").click(); s.page.wait_for_timeout(300)
        # physics course (no component)
        s.page.get_by_role("button", name="A Level Physics 9702", exact=True).click(); s.page.wait_for_timeout(300)
        r["physics_chapters"] = s.page.locator(".u2-rec__chapter").all_inner_texts()
        r["hscroll"] = s.hscroll(); r["errors"] = s.errors
        s.page.screenshot(path=f"snapshots/v2-recordings-course-{width}.png")
        out[label] = r

def main():
    out = {}
    run(1280, RECS, out, "desktop"); run(390, RECS, out, "phone"); run(1280, [], out, "empty")
    print(json.dumps(out, indent=1, ensure_ascii=False))
if __name__ == "__main__": main()
