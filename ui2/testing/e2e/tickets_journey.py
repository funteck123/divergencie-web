import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A

def handler(method, path, body, st):
    if path.startswith("/api/admin/service-uptime"): return 200, {"results": [{"name": "Question Solver", "up": True}, {"name": "Syllabus", "up": False, "reason": "timeout"}], "checkedAt": "2026-10-02T10:00:00Z"}
    if not path.startswith("/api/tickets"): return None
    ts = st["tickets"]
    if method == "GET": return 200, {"tickets": ts}
    t = next(x for x in ts if x["TicketID"] == body["ticketId"]); a = body["action"]
    if a == "close": t["ClosedAt"] = "2026-10-02T09:00:00Z"; t["CloseMessage"] = body.get("closeMessage", "")
    if a == "reopen": t["ClosedAt"] = ""; t["CloseMessage"] = ""
    if a == "hold": t["OnHold"] = True; t["OnHoldReason"] = body.get("holdReason", "")
    if a == "unhold": t["OnHold"] = False
    if a == "edit": t["Message"] = body["message"]
    if a == "note": t.setdefault("Notes", []).append({"By": "MGT-0001", "At": "2026-10-02T09:30:00Z", "Text": body["noteText"]})
    return 200, {"ticket": t}

def main():
    out = {}
    tickets = [{"TicketID": f"TKT-{i}", "SenderUserID": "STU-1001", "Message": f"Help number {i}\nmore detail", "CreatedAt": f"2026-10-0{i}T08:00:00Z"} for i in range(1, 4)]
    with Session(state={"users": A.mk_users(), "tickets": tickets}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/(tickets|admin/service-uptime)", handler)
        s.goto("/v2/management/tickets")
        s.page.get_by_role("table").wait_for(timeout=60000)
        out["open_rows"] = s.page.locator("tbody tr").count()
        out["badge"] = s.page.get_by_text("3 open").count()
        s.page.get_by_role("button", name="Check Uptime").click(); s.page.get_by_text("DOWN").wait_for()
        out["uptime"] = [s.page.get_by_text("UP", exact=True).count(), s.page.get_by_text("DOWN").count()]
        # quick close with note
        s.page.get_by_role("button", name="Close TKT-3").click(); s.page.get_by_label("Resolution note (optional)").fill("Fixed it"); s.page.get_by_role("button", name="Confirm Close").click()
        s.page.get_by_text("Closed TKT-3.").wait_for(); out["rows_after_close"] = s.page.locator("tbody tr").count()
        # thread: note, hold, edit
        s.page.get_by_role("button", name="Open").first.click()
        s.page.get_by_label("Add a note").fill("Called parent"); s.page.get_by_role("button", name="Add note").click(); s.page.get_by_text("Note added.").wait_for()
        s.page.get_by_role("button", name="Hold", exact=True).click(); s.page.get_by_label(re.compile("Why is this on hold")).fill("waiting for reply"); s.page.get_by_role("button", name="Confirm Hold").click(); s.page.get_by_text("Put on hold.").wait_for()
        s.page.get_by_role("button", name="Edit", exact=True).click(); s.page.get_by_label("Message").fill("Edited text"); s.page.get_by_role("button", name="Save", exact=True).click(); s.page.get_by_text("Message saved.").wait_for()
        s.page.keyboard.press("Escape")
        s.page.get_by_label("Show closed").check(); s.page.wait_for_timeout(300)
        out["rows_with_closed"] = s.page.locator("tbody tr").count()
        out["calls"] = [(m, p, b) for m, p, b in s.calls]
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
