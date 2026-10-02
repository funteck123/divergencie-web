import re, sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV

TODAY = datetime.date.today()
def d(n): return (TODAY + datetime.timedelta(days=n)).isoformat()

def mk_items():
    base = {"ServiceID": "SVC-1", "ServiceName": "Cambridge IGCSE 0625 Physics", "ServiceType": "Course", "ServiceGroup": ["Student", "Teacher"], "Time": "17:00", "Timezone": "Asia/Kolkata", "Duration": 1.5, "Facilitator": "Test Teacher", "OccuranceID": "O1"}
    return [{**base, "ScheduleID": "S1", "Date": d(1)}, {**base, "ScheduleID": "S2", "Date": d(2)}, {**base, "ScheduleID": "S3", "Date": d(-3)},
            {"ScheduleID": "P1", "ServiceID": "SVC-1", "ServiceName": "Trial Physics", "ServiceType": "Trial", "ServiceGroup": ["Student"], "Date": d(4), "Time": "10:00", "Timezone": "Asia/Kolkata", "Duration": 1, "Facilitator": "Ms T", "OccuranceID": None}]

def handler(method, path, body, st):
    if path.startswith("/api/schedule/reschedule-requests"):
        if method == "GET": return 200, {"rescheduleRequests": st["requests"]}
        st["requests"] = [r for r in st["requests"] if r["RescheduleRequestID"] != body["requestId"]]
        return 200, {"rescheduleRequest": {"RescheduleRequestID": body["requestId"]}}
    if path.startswith("/api/schedule/admin-image"): return 200, {}
    if path.startswith("/api/schedule"):
        if method == "GET": return 200, {"scheduleItems": st["items"], "openPoolSlotIds": ["P1"]}
        if method == "PATCH":
            it = next(i for i in st["items"] if i["ScheduleID"] == body["scheduleId"]); it["RescheduledDate"] = body["rescheduledDate"]; it["RescheduledTime"] = body["rescheduledTime"]; return 200, {"scheduleItem": it}
        if method == "POST":
            it = {"ScheduleID": "P2", **{k: v for k, v in body.items()}, "ServiceName": "Trial Physics", "ServiceGroup": ["Student"], "Date": body["date"], "Time": body["time"], "OccuranceID": None, "Timezone": "Asia/Kolkata"}; st["items"].append(it); return 200, {"scheduleItem": it}
    if path.startswith("/api/attendance"):
        if method == "GET" and "scheduleItemId" in path:
            sid = path.split("scheduleItemId=")[1]
            return 200, {"roster": [{"userId": "STU-1001", "name": "Leo Tan", "userType": "Student"}], "attendanceItems": [a for a in st["att"] if a["ScheduleItemID"] == sid]}
        if method == "GET": return 200, {"attendanceItems": st["att"]}
        if method == "PATCH":
            a = next(x for x in st["att"] if x["AttendanceID"] == body["attendanceId"]); a["Status"] = body.get("status", a["Status"]); a["LoggedDuration"] = body.get("loggedDuration", a["LoggedDuration"]); a["AcceptedForBilling"] = True; return 200, {}
    return None

def main():
    out = {}
    att = [{"AttendanceID": "A1", "ScheduleItemID": "S3", "UserID": "STU-1001", "Status": "Present", "LoggedDuration": 1.5, "LoggedBy": "STU-1001", "AcceptedForBilling": True},
           {"AttendanceID": "A2", "ScheduleItemID": "S3", "UserID": "STU-1001", "Status": "Absent", "LoggedDuration": 0, "LoggedBy": "TCH-0001", "AcceptedForBilling": False}]
    reqs = [{"RescheduleRequestID": "R1", "ScheduleItemID": "S1", "RequesterName": "Leo Tan", "RequestedDate": d(5), "RequestedTime": "18:00", "Slot": mk_items()[0]}]
    enroll = [{"EnrolmentID": "E1", "UserID": "STU-1001", "ServiceID": "SVC-1"}]
    with Session(state={"users": A.mk_users(), "services": SV.mk_services(), "items": mk_items(), "att": att, "requests": reqs, "enrollments": enroll}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
        s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
        s.on(r"^/api/(schedule|attendance)", handler)
        s.goto("/v2/management/schedule")
        s.page.get_by_text("Attendance Conflicts (1)").wait_for(timeout=60000)
        out["pending_requests_card"] = s.page.get_by_text("Pending Reschedule Requests (1)").count()
        out["agenda_days"] = s.page.locator(".u2-agenda__day").count()   # future only: S1, S2
        # resolve the conflict
        s.page.get_by_role("button", name="Resolve").click()
        s.page.get_by_role("button", name="Mark correct").click()
        s.page.wait_for_timeout(500)
        s.page.keyboard.press("Escape")
        # approve request from the card
        s.page.get_by_role("button", name="Approve").first.click(); s.page.get_by_text("Reschedule approved.").wait_for()
        # list view: reschedule S2 directly
        s.page.get_by_role("button", name="List").nth(1).click()
        s.page.get_by_role("table").nth(0).wait_for()
        row = s.page.locator("tbody tr").filter(has_text="Cambridge IGCSE 0625 Physics").nth(1)
        row.get_by_role("button", name="Reschedule").click()
        s.page.get_by_label("New date").fill(d(9)); s.page.get_by_label("New time").fill("19:00")
        row.get_by_role("button", name="Save").click(); s.page.get_by_text("Session moved.").wait_for()
        # offer a slot
        s.page.get_by_label("Service", exact=True).click(); s.page.get_by_role("option", name=re.compile("Cambridge")).first.click()
        s.page.get_by_label("Date", exact=True).fill(d(12)); s.page.get_by_label("Time", exact=True).fill("11:00")
        s.page.get_by_role("button", name="Offer slot").click(); s.page.get_by_text("Slot offered.").wait_for()
        # calendar view + image view
        s.page.get_by_role("button", name="Calendar").last.click(); out["calendar_title"] = s.page.locator(".u2-cal__title").count()
        s.page.get_by_role("button", name="Weekly Schedule Image").click(); out["image_link"] = s.page.get_by_role("link", name="Download PNG").get_attribute("href")
        out["hscroll"] = s.hscroll()
        out["calls"] = [(m, p, {k: v for k, v in (b or {}).items()}) for m, p, b in s.calls]
        out["errors"] = [e for e in s.errors if "admin-image" not in e][:4]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
