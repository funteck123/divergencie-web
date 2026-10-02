import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session

def main():
    out = {}
    student = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    me = {"user": {**student, "Timezone": "Asia/Kolkata"}, "enrollments": [], "services": [], "scheduleItems": [], "attendanceItems": [], "rescheduleRequests": [], "invoices": [], "guides": []}
    def h(m, p, b, st):
        if p.startswith("/api/login"):
            return (401, {"error": "Invalid username or password."}) if b["password"] == "bad" else (200, {"user": student})
        if p.startswith("/api/me"): return 200, me
        if p.startswith("/api/resource-toggles"): return 200, {"toggles": {}}
    with Session(anon=True, state={}) as s:
        s.on(r"^/api/", h)
        s.goto("/v2/login")
        s.page.get_by_label("Username").fill(" sam "); s.page.get_by_label("Password").fill("bad")
        s.page.get_by_role("button", name="Portal Login").click(); s.page.get_by_text("Invalid username or password.").wait_for()
        out["stayed_on_login"] = "/v2/login" in s.page.url
        s.page.get_by_label("Password").fill("good"); s.page.get_by_role("button", name="Portal Login").click()
        s.page.wait_for_url("**/v2/student", timeout=60000)
        out["landed"] = s.page.url.split("/v2")[1]
        out["login_calls"] = [(m, p, b) for m, p, b in s.calls]
    def hr(m, p, b, st): return (200, {"ok": True}) if p.startswith("/api/register") else None
    with Session(anon=True, state={}) as s:
        s.on(r"^/api/register", hr)
        s.goto("/v2/register")
        s.page.get_by_label("Student first name *").fill("Sam"); s.page.get_by_label("Student last name *").fill("Lee")
        s.page.get_by_label(re.compile("^WhatsApp Number")).fill("+44 7000 000000"); s.page.get_by_label("Your email *").fill("s@x.com")
        s.page.get_by_label(re.compile("^Parent's Contact Number")).fill("+44 7111 111111")
        s.page.get_by_role("button", name="Submit application").click()
        out["needs_studying"] = s.page.get_by_text(re.compile("at least one option")).count()
        s.page.get_by_label("IB", exact=True).check(); s.page.get_by_label("Referral", exact=True).check()
        s.page.get_by_role("button", name="Submit application").click(); s.page.get_by_text("Application submitted").wait_for()
        out["register_calls"] = [(m, p) for m, p, b in s.calls]
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
