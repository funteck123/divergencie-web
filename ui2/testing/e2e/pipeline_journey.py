import re, sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV

TODAY = datetime.date.today()
def d(n): return (TODAY + datetime.timedelta(days=n)).isoformat()

def mk_state():
    users = [{"UserID": "MGT-0001", "UserType": "Management", "Name": "Test Admin", "Status": "Active", "Username": "admin"},
             {"UserID": "TRL-1", "UserType": "TrialAcc", "Name": "Trial Kid", "Status": "Active", "Username": "trl1"},
             {"UserID": "TRL-2", "UserType": "TrialAcc", "Name": "Done Kid", "Status": "Active", "Username": "trl2"},
             {"UserID": "INT-1", "UserType": "TeacherInterviewAcc", "Name": "Candidate One", "Status": "Active", "Username": "int1"},
             {"UserID": "INT-3", "UserType": "TeacherInterviewAcc", "Name": "Candidate Three", "Status": "Active", "Username": "int3"},
             {"UserID": "INT-2", "UserType": "StaffInterviewAcc", "Name": "Candidate Two", "Status": "Active", "Username": "int2"}]
    me = {"TRL-1": {"trialItems": [{"TrialID": "T1", "TrialAccID": "TRL-1", "ServiceID": "SVC-1", "Status": "Scheduled", "ScheduleItemID": "S1"}], "interviewItems": []},
          "TRL-2": {"trialItems": [{"TrialID": "T2", "TrialAccID": "TRL-2", "ServiceID": "SVC-1", "Status": "FeedbackSubmitted", "Feedback": "Great student"}], "interviewItems": []},
          "INT-1": {"trialItems": [], "interviewItems": [{"InterviewID": "I1", "InterviewAccID": "INT-1", "ServiceID": "SVC-2", "Status": "TaskSubmitted", "TaskSubmissionLink": "https://task"}]},
          "INT-3": {"trialItems": [], "interviewItems": [{"InterviewID": "I3", "InterviewAccID": "INT-3", "ServiceID": "SVC-2", "Status": "OfferSent", "OfferLetterLink": "https://old-offer", "TaskFeedback": "ok", "OfferSentAt": "2026-10-01T00:00:00Z"}]},
          "INT-2": {"trialItems": [], "interviewItems": [{"InterviewID": "I2", "InterviewAccID": "INT-2", "ServiceID": "SVC-2", "Status": "Scheduled"}]}}
    items = [{"ScheduleID": "S1", "ServiceID": "SVC-1", "ServiceName": "Physics", "Date": d(2), "Time": "17:00", "Timezone": "Asia/Kolkata", "Duration": 1, "Facilitator": "Ms T", "ServiceGroup": ["Student"]},
             {"ScheduleID": "OP1", "ServiceID": "SVC-1", "ServiceName": "Physics", "Date": d(3), "Time": "10:00", "Timezone": "Asia/Kolkata", "Duration": 1, "Facilitator": "Mr K", "ServiceGroup": ["Student"]}]
    pend = {"pendingTrials": [{"TrialID": "T9", "ServiceID": "SVC-1", "RequesterName": "New Trial Kid"}], "pendingInterviews": [{"InterviewID": "I9", "ServiceID": "SVC-2", "RequesterName": "New Applicant", "RequesterType": "StaffInterviewAcc"}]}
    regs = [{"RegFormID": "REG-1", "Name": "Applicant A", "RequestedType": "Trial", "Status": "Pending", "Email": "a@x.com", "WhatsAppNumber": "919800000000", "Subjects": "Physics"},
            {"RegFormID": "REG-2", "Name": "Applicant B", "RequestedType": "TeacherInterview", "Status": "Approved", "Username": "appb"}]
    return {"users": users, "me": me, "schedule": items, "pend": pend, "regs": regs, "auto": False, "services": SV.mk_services()}

def handler(method, path, body, st):
    if path.startswith("/api/me?userId="): return 200, st["me"][path.split("=")[1]]
    if path.startswith("/api/users") and method == "GET": return 200, {"users": st["users"]}
    if path.startswith("/api/services") and method == "GET": return 200, {"services": st["services"]}
    if path.startswith("/api/invoices"): return 200, {"invoices": []}
    if path.startswith("/api/leads"): return 200, {"leads": [{"LeadID": "L1", "Name": "Curious Parent", "Email": "p@x.com", "CreatedAt": "2026-09-30T00:00:00Z", "Country": "UK"}]}
    if path.startswith("/api/schedule/requests"):
        if method == "GET": return 200, st["pend"]
        return 200, {"trialItem": {}, "interviewItem": {}}
    if path.startswith("/api/schedule"):
        if method == "GET": return 200, {"scheduleItems": st["schedule"], "openPoolSlotIds": ["OP1"]}
        if method == "POST": return 200, {"scheduleItem": {"ScheduleID": "NEW1", **{k: v for k, v in body.items()}}}
    if path.startswith("/api/convert"): return 200, {"credentials": {"username": "newstu", "password": "Conv-Pass-1"}}
    if path.startswith("/api/trial-enroll") or path.startswith("/api/interview-offer") or path.startswith("/api/interview-task"): return 200, {}
    if path.startswith("/api/regforms"):
        if method == "GET": return 200, {"regForms": st["regs"]}
        r = next(x for x in st["regs"] if x["RegFormID"] == body["regFormId"]); r["Status"] = "Approved" if body["action"] == "approve" else "Rejected"
        return 200, {"regForm": r, "credentials": {"username": "appa", "password": "Reg-Pass-1"} if body["action"] == "approve" else None}
    if path.startswith("/api/register-settings"):
        if method == "PATCH": st["auto"] = body["autoApprove"]
        return 200, {"autoApprove": st["auto"]}

def main():
    out = {}
    with Session(state=mk_state()) as s:
        s.on(r"^/api/", handler)
        s.goto("/v2/management/applications")
        s.page.get_by_role("table").wait_for(timeout=60000)
        out["reg_rows"] = s.page.locator("tbody tr").count()
        s.page.get_by_role("button", name="Approve").click(); s.page.get_by_text("Approved Applicant A.").wait_for()
        out["issued_shown"] = s.page.get_by_text("appa / Reg-Pass-1").count()
        s.page.get_by_label(re.compile("Auto-approve")).click(); s.page.wait_for_function("document.querySelector('input[type=checkbox]').checked"); s.page.wait_for_timeout(300)
        s.goto("/v2/management/pipeline")
        s.page.get_by_role("heading", name="Trial Pipeline").wait_for(timeout=60000)
        s.page.get_by_text("Trial Kid", exact=True).wait_for(timeout=60000)
        out["trial_rows"] = s.page.get_by_role("table", name="Trial pipeline").locator("tbody tr").count()
        out["interview_rows"] = s.page.get_by_role("table", name="Interview pipeline").locator("tbody tr").count()  # 3 incl. the offer-sent one
        s.page.get_by_role("button", name="Copy Trial Message").click(); s.page.get_by_text("Trial message copied.").wait_for()
        clip = s.page.evaluate("navigator.clipboard.readText()")
        out["trial_msg"] = [clip.startswith("Hello Trial Kid ✨"), "*Physics Trial Class*" in clip or "Trial Class*" in clip, "Duration: 1 Hour" in clip]
        s.page.get_by_role("button", name="Add Service").click(); s.page.get_by_text("Service added.").wait_for()
        s.page.get_by_role("button", name=re.compile("^Convert")).first.click(); s.page.wait_for_timeout(500)
        s.page.get_by_role("button", name="Decide…").click()
        s.page.get_by_label("Offer letter link").fill("https://offer"); s.page.get_by_label("Feedback on task").fill("Strong")
        s.page.get_by_role("button", name="Send offer").click(); s.page.get_by_text("Offer sent.").wait_for()
        s.page.get_by_role("button", name="Send Task").click(); s.page.get_by_text("Task sent.").wait_for()
        s.page.get_by_role("button", name="Offer…").click()
        s.page.get_by_role("button", name="Edit", exact=True).click(); s.page.get_by_label("Offer letter link").fill("https://new-offer")
        s.page.get_by_role("button", name="Save", exact=True).click(); s.page.get_by_text("Offer updated.").wait_for()
        s.page.get_by_role("button", name="Offer…").click()
        s.page.get_by_role("button", name="Unsend", exact=True).click(); s.page.get_by_text("Offer taken back.").wait_for()
        # lanes
        s.page.get_by_role("button", name="By step").first.click()
        out["lane_regions"] = s.page.get_by_role("region", name="Scheduled").count()
        # pending: approve with existing slot, create+approve for interview
        s.page.get_by_label("Open slot").first.click(); s.page.get_by_role("option", name=re.compile("at 10:00")).click()
        s.page.get_by_role("button", name="Approve", exact=True).first.click(); s.page.get_by_text("Approved.").first.wait_for()
        s.page.get_by_role("button", name="+ New slot instead").first.click()
        s.page.get_by_label("Date").first.fill(d(6)); s.page.get_by_label("Time").first.fill("12:00")
        s.page.get_by_role("button", name="Create & Approve").click(); s.page.get_by_text("Slot created and approved.").wait_for()
        out["calls"] = [(m, p.split("?")[0], b) for m, p, b in s.calls]
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
