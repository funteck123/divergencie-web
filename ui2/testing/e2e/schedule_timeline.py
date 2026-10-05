import os, re, sys, datetime
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV
import schedule_journey as SJ

DAY = (datetime.date.today() + datetime.timedelta(days=2)).isoformat()

def item(i, who, time, dur, tz="Asia/Kolkata"):
    return {"ScheduleID": i, "ServiceID": "SVC-1", "ServiceName": f"Class {i}", "ServiceType": "Course", "ServiceGroup": ["Student"], "Date": DAY, "Time": time, "Timezone": tz, "Duration": dur, "Facilitator": who, "OccuranceID": "OCC-" + i}

def main():
    out = {}
    items = [item("T1", "Amy Teacher", "16:00", 1.5), item("T2", "Amy Teacher", "17:00", 1), item("T3", "Bo Teacher", "16:30", 1), item("T4", "Cy Teacher", "14:00", 1, "Asia/Riyadh")]
    enroll = [{"EnrolmentID": "E1", "UserID": "STU-1001", "ServiceID": "SVC-1"}]
    with Session(state={"users": A.mk_users(), "services": SV.mk_services(), "items": items, "att": [], "requests": [], "enrollments": enroll}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
        s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
        s.on(r"^/api/(schedule|attendance)", SJ.handler)
        s.goto("/v2/management/schedule?view=timeline")
        s.page.get_by_role("button", name="Instructor timeline").wait_for(timeout=60000)
        s.page.get_by_label("Day").fill(DAY)
        s.page.get_by_role("table", name=re.compile("Instructor timeline")).wait_for()
        out["rows"] = s.page.locator(".u2-tl__row:not(.u2-tl__row--head)").count()
        out["conflict_bars"] = s.page.locator(".u2-tl__bar[data-conflict=true]").count()
        out["ok_bars"] = s.page.locator(".u2-tl__bar[data-conflict=false]").count()
        out["riyadh_bar_time"] = s.page.locator(".u2-tl__bar", has_text="Class T4").inner_text()
        out["resolve_buttons"] = s.page.get_by_role("button", name="Resolve").count()
        s.page.get_by_role("button", name="Resolve").first.click()
        out["reschedule_form"] = s.page.get_by_label("New date").count()
        s.page.get_by_label("New date").first.fill(DAY); s.page.screenshot(path="snapshots/v2-timeline.png", full_page=True)
        s.page.get_by_role("button", name="Next day →").click()
        out["next_day"] = s.page.get_by_text("No sessions on this day.").count()
        # weekly image of one account
        s.page.get_by_role("button", name="Weekly Schedule Image").click()
        s.page.get_by_label("Show the schedule of").click()
        s.page.get_by_role("option", name=re.compile(r"STU-1002\)")).click()
        out["image_src"] = s.page.locator(".u2-imagebox img").get_attribute("src")
        out["download"] = s.page.get_by_role("link", name="Download PNG").get_attribute("href")
        out["errors"] = [e for e in s.errors if "schedule/image" not in e][:3]
        out["hscroll"] = s.hscroll()
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
