import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def main():
    out = {}
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    # a reply of the wrong shape makes the page throw while rendering
    bad = {"user": {**stu}, "enrollments": 5, "services": 5, "scheduleItems": 5, "attendanceItems": 5, "rescheduleRequests": 5, "invoices": 5, "guides": 5}
    def h(m, p, b, st):
        if p.startswith("/api/me/ui-preference"):
            bad["user"]["UiPreference"] = "classic"  # what the server now answers
            return 200, {"ok": True}
        if p.startswith("/api/me"): return 200, bad
    with Session(user=stu, state={}) as s:
        s.on(r"^/api/", h)
        s.goto("/v2/student")
        s.page.get_by_role("heading", name="This page hit a problem").wait_for(timeout=30000)
        out["boundary"] = True
        out["buttons"] = [s.page.get_by_role("button", name=n).count() for n in ("Try again", "Use the classic UI")]
        s.page.get_by_role("button", name="Use the classic UI").click()
        s.page.wait_for_url("**/dashboard/student**", timeout=30000)
        out["went_to"] = s.page.url.split("3111")[1].split("?")[0]
        out["pref_saved"] = [(m, p, b) for m, p, b in s.calls if "ui-preference" in p]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
