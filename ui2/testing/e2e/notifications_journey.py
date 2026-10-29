"""TKT-0206: the Notifications tab lists what waits for Management and sends nothing."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def handler(method, path, body, st):
    if method != "GET": return None
    if path.startswith("/api/leads"):
        return 200, {"leads": [
            {"LeadID": "L1", "Name": "Ana Inquiry", "Email": "a@x.co", "Country": "Malaysia", "Notes": "Wants IGCSE Physics", "Status": "new", "CreatedAt": "2026-10-20T10:00:00Z"},
            {"LeadID": "L2", "Name": "Done Lead", "Email": "d@x.co", "Status": "contacted", "CreatedAt": "2026-10-01T10:00:00Z"}]}
    if path.startswith("/api/regforms"):
        return 200, {"regForms": [
            {"RegFormID": "R1", "Name": "Ben Applicant", "RequestedType": "Trial", "Status": "Pending", "CreatedAt": "2026-10-25T10:00:00Z"},
            {"RegFormID": "R2", "Name": "Cy Approved", "RequestedType": "Trial", "Status": "Approved", "CreatedAt": "2026-10-02T10:00:00Z"}]}
    if path.startswith("/api/schedule/requests"):
        return 200, {"pendingTrials": [{"TrialID": "TR1", "ServiceID": "S1", "RequesterName": "Di Trial"}], "pendingInterviews": []}
    if path.startswith("/api/schedule/reschedule-requests"):
        return 200, {"rescheduleRequests": [{"RescheduleRequestID": "RR1", "ScheduleItemID": "X", "RequesterName": "Eve Resched", "RequestedDate": "2026-11-01", "RequestedTime": "10:00"}]}
    if path.startswith("/api/tickets"):
        return 200, {"tickets": [
            {"TicketID": "TKT-9001", "SenderUserID": "U1", "Message": "The page does not open", "CreatedAt": "2026-10-27T10:00:00Z"},
            {"TicketID": "TKT-9002", "SenderUserID": "U1", "Message": "Answered already", "CreatedAt": "2026-10-26T10:00:00Z", "Replies": [{"At": "x", "By": "M", "ByType": "Management", "Text": "ok"}]},
            {"TicketID": "TKT-9003", "SenderUserID": "U1", "Message": "Closed one", "CreatedAt": "2026-10-24T10:00:00Z", "ClosedAt": "2026-10-25T10:00:00Z"}]}
    return None

def main():
    out = {}
    with Session(state={}) as s:
        s.on(r"^/api/", handler)
        s.goto("/v2/management/notifications")
        s.page.get_by_role("heading", name="Notifications").first.wait_for()
        s.page.get_by_text("Ana Inquiry").first.wait_for()
        out["tab_present"] = s.page.get_by_role("link", name="Notifications").count() + s.page.get_by_role("button", name="Notifications").count()
        chips = s.page.get_by_role("list", name="Waiting by type").get_by_role("listitem")
        out["chips"] = [c.inner_text().replace("\n", " ") for c in chips.all()]
        out["rows"] = s.page.get_by_role("table", name="Waiting for Management").get_by_role("row").count() - 1 if s.page.get_by_role("table", name="Waiting for Management").count() else "cards"
        body = s.page.inner_text("body")
        out["shown"] = {n: (n in body) for n in ["Ana Inquiry", "Ben Applicant", "Di Trial", "Eve Resched", "TKT-9001"]}
        out["hidden"] = {n: (n in body) for n in ["Done Lead", "Cy Approved", "TKT-9002", "TKT-9003"]}
        s.page.screenshot(path="snapshots/v2-notifications.png")
        out["hscroll"] = s.hscroll(); out["errors"] = s.errors[:3]
        out["calls"] = [(m, p) for m, p, b in s.calls]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
