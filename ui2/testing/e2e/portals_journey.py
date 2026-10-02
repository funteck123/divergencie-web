import re, sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import services_journey as SV

TODAY = datetime.date.today()
def d(n): return (TODAY + datetime.timedelta(days=n)).isoformat()

SVC = SV.mk_services()
SLOT = {"ScheduleID": "S1", "ServiceID": "SVC-1", "ServiceName": "Cambridge IGCSE 0625 Physics", "ServiceGroup": ["Student"], "Date": d(1), "Time": "17:00", "Timezone": "Asia/Kolkata", "Duration": 1.5, "Facilitator": "Test Teacher", "OccuranceID": "O1"}
ENR = [{"EnrolmentID": "E1", "UserID": "U", "ServiceID": "SVC-1", "BatchID": "B1", "RateID": "R1"}]
INV = [{"InvoiceID": "INV-1", "StudentID": "STU-1", "Year": 2026, "Month": 10, "Status": "Sent", "Currency": "INR", "Amount": 5000, "INRAmount": 5000, "INRDue": 5000, "StudentPaidFlag": False, "SentAt": "2026-10-01T00:00:00Z", "LineItems": [{"ServiceID": "SVC-1", "BatchID": "B1", "AttendedHours": 6, "Amount": 5000, "Currency": "INR"}]},
       {"InvoiceID": "INV-D", "StudentID": "STU-1", "Year": 2026, "Month": 11, "Status": "Draft", "Currency": "INR", "Amount": 1, "INRAmount": 1, "INRDue": 1, "LineItems": []}]
PAY = [{"PaycheckID": "PAY-1", "StaffID": "T", "Year": 2026, "Month": 10, "Status": "Sent", "Currency": "INR", "Amount": 9000, "INRAmount": 9000, "INRDue": 9000, "StaffReceivedFlag": False, "LineItems": [{"ServiceID": "SVC-1", "BatchID": "B1", "AttendedHours": 9, "Amount": 9000, "Currency": "INR"}]}]
GUIDES = [{"GuideID": "G1", "Name": "Handbook", "Url": "https://h.example", "UserTypes": ["Student"]}]

def bundle(user, kind):
    b = {"user": {**user, "Timezone": "Asia/Kolkata", "Currency": "INR", "Email": "x@y.com"}, "enrollments": [{**ENR[0], "UserID": user["UserID"]}], "services": SVC, "scheduleItems": [SLOT], "attendanceItems": [], "rescheduleRequests": [], "guides": GUIDES}
    if kind == "student": b["invoices"] = INV
    elif kind in ("teacher", "staff", "ambassador"): b["paychecks"] = PAY
    elif kind == "parent":
        child = {"UserID": "STU-1", "UserType": "Student", "Name": "Leo Child", "Currency": "INR"}
        b["children"] = [{"student": child, "schedule": [SLOT], "attendance": [], "invoices": INV, "enrollments": [ENR[0]], "rescheduleRequests": []}]
    elif kind == "trial": b["invoices"] = INV; b["trialItems"] = [{"TrialID": "T1", "TrialAccID": user["UserID"], "ServiceID": "SVC-1", "Status": "Scheduled", "ScheduleItemID": "S1"}]
    elif kind == "interview": b["interviewItems"] = [{"InterviewID": "I1", "InterviewAccID": user["UserID"], "ServiceID": "SVC-2", "Status": "OfferSent", "OfferLetterLink": "https://offer"}, {"InterviewID": "I2", "InterviewAccID": user["UserID"], "ServiceID": "SVC-2", "Status": "Scheduled", "TaskSentAt": "2026-10-01"}]; b["trialItems"] = []
    return b

def handler_for(user, kind):
    def h(method, path, body, st):
        if path.startswith("/api/impersonate") and method == "DELETE": return 200, {"user": {"UserID": "MGT-0001", "UserType": "Management", "Name": "Test Admin"}}
        if path.startswith("/api/me"): return 200, bundle(user, kind)
        if path.startswith("/api/resource-toggles"): return 200, {"toggles": {"recordings": True, "syllabus": True, "worksheets": True, "gcr": True, "timesheet": True, "progressTracker": True}}
        if path.startswith("/api/syllabus-config"): return 200, {"url": "https://syl.example/"}
        if path.startswith("/api/schedule/image") or path.startswith("/api/invoices/pdf"): return 200, {}
        if path.startswith("/api/schedule?") or path == "/api/schedule": return 200, {"scheduleItems": [SLOT], "openPoolSlotIds": []}
        if path.startswith("/api/attendance") and method == "GET": return 200, {"roster": [{"userId": user["UserID"], "name": user["Name"], "userType": user["UserType"]}, {"userId": "STU-1", "name": "Leo Child", "userType": "Student"}], "attendanceItems": []}
        return 200, {}
    return h

def run(kind, utype, steps, path=None, imp=False):
    user = {"UserID": {"student": "STU-1", "teacher": "T", "staff": "STF-1", "parent": "PAR-1", "trial": "TRL-1", "interview": "INT-1", "ambassador": "AMB-1"}[kind], "UserType": utype, "Name": f"Test {kind}", "UiPreference": "next"}
    with Session(user=user, state={}) as s:
        s.on(r"^/api/", handler_for(user, kind))
        if imp: s.page.add_init_script("localStorage.setItem('dcp1_impersonator', JSON.stringify({userId: 'MGT-0001', name: 'Test Admin'}))")
        s.goto(path or f"/v2/{kind}")
        s.page.get_by_role("heading", name=re.compile("My Info|Guides|My Trial|My Interview|Resources|Timesheet", re.I)).first.wait_for(timeout=90000)
        res = steps(s)
        res["hscroll"] = s.hscroll(); res["errors"] = s.errors[:3]; res["calls"] = [(m, p, b if not isinstance(b, str) else "<form>") for m, p, b in s.calls]
        return res

def student(s):
    o = {}
    o["cards"] = s.page.locator("section.u2-box h2").all_inner_texts()
    s.page.get_by_role("button", name="Mark as paid").click()
    s.page.locator("input[type=file]").set_input_files({"name": "proof.png", "mimeType": "image/png", "buffer": b"\x89PNG\r\n"})
    s.page.get_by_role("button", name="Confirm payment").click(); s.page.wait_for_timeout(600)
    o["draft_hidden"] = s.page.get_by_text("INV-D").count() == 0
    s.page.get_by_role("button", name="List").click()
    s.page.get_by_role("button", name="Log…").click()
    o["attendance_panel"] = s.page.get_by_text("Leo Child").count()
    s.page.keyboard.press("Escape")
    s.page.get_by_role("button", name="Suggest reschedule").click()
    s.page.get_by_label("New date").fill("2026-12-01"); s.page.get_by_label("New time").fill("18:30")
    s.page.get_by_role("button", name="Send", exact=True).click(); s.page.get_by_text("Request sent.").wait_for()
    return o
def teacher(s):
    s.page.get_by_role("button", name="Mark as received").click(); s.page.wait_for_timeout(500)
    return {"cards": s.page.locator("section.u2-box h2").all_inner_texts()}
def staff(s):
    s.page.get_by_role("button", name="List").click()
    s.page.get_by_label("Show past").check()
    s.page.get_by_role("button", name="Log…").click()
    s.page.get_by_role("button", name="Log", exact=True).click(); s.page.get_by_text("Attendance logged.").wait_for()
    return {"resources": s.page.get_by_role("heading", name="Resources").count()}
def parent(s):
    o = {"cards": s.page.locator("section.u2-box h2").all_inner_texts()}
    s.page.get_by_role("button", name="Mark as paid").click()
    return o
def trial(s):
    s.page.get_by_label("Trial feedback").fill("Loved it"); s.page.get_by_role("button", name="Submit").click(); s.page.wait_for_timeout(500)
    s.page.get_by_label("Service", exact=True).click()
    return {"already_requested_disabled": s.page.get_by_role("option", name=re.compile("Physics")).get_attribute("aria-disabled")}
def interview(s):
    s.page.get_by_role("button", name="Accept offer").click(); s.page.wait_for_timeout(400)
    s.page.get_by_label("Task submission link").fill("https://my-task"); s.page.get_by_role("button", name="Submit").click(); s.page.wait_for_timeout(400)
    s.page.get_by_label("Resume (required, Google Drive link)").fill("https://drive.google.com/r"); s.page.get_by_role("button", name="Save").first.click(); s.page.wait_for_timeout(400)
    return {}

def ambassador(s):
    s.page.get_by_role("button", name="List").click(); s.page.get_by_label("Show past").check()
    s.page.get_by_role("button", name="Log…").click(); s.page.get_by_role("button", name="Log", exact=True).click(); s.page.get_by_text("Attendance logged.").wait_for()
    s.page.get_by_role("button", name="Mark as received").click(); s.page.wait_for_timeout(400)
    return {"no_image_tab": s.page.get_by_role("button", name="Schedule Image").count()}

def shell(s):
    o = {}
    s.page.get_by_role("button", name="Report an Issue").click()
    s.page.get_by_label("What went wrong?").fill("Page is slow"); s.page.get_by_label("Attachment URL (optional)").fill("https://shot")
    s.page.get_by_role("button", name="Send", exact=True).click(); s.page.get_by_text("Sent. Thanks, we'll take a look.").wait_for()
    s.page.get_by_role("button", name="Close").first.click()
    o["banner"] = s.page.get_by_text(re.compile("Viewing as")).count()
    s.page.get_by_role("button", name="Stop impersonating").click(); s.page.wait_for_url("**/dashboard/management**", timeout=30000)
    o["back_to"] = s.page.url.split("divergencie")[-1] if False else s.page.url.split(":3111")[1]
    return o

def resource(s):
    s.page.get_by_role("link", name="Timesheet").first.click(); s.page.get_by_role("link", name="Access Timesheet").wait_for()
    return {"href": s.page.get_by_role("link", name="Access Timesheet").get_attribute("href")}

def main():
    for kind, utype, fn in [("student", "Student", student), ("teacher", "Teacher", teacher), ("staff", "Staff", staff), ("parent", "Parent", parent), ("trial", "TrialAcc", trial), ("interview", "TeacherInterviewAcc", interview), ("ambassador", "Ambassador", ambassador)]:
        r = run(kind, utype, fn)
        print("==", kind)
        for k, v in r.items(): print(" ", k, v)
    r = run("student", "Student", shell, imp=True); print("== shell"); [print(" ", k, v) for k, v in r.items()]
    r = run("student", "Student", resource, path="/v2/resources/timesheet?link=https%3A%2F%2Fsheet.example%2Fx"); print("== resource"); [print(" ", k, v) for k, v in r.items()]

if __name__ == "__main__":
    main()
