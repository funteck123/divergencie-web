"""A signed-in person who is not Management must never see Management pages (the screenshot case: after "Log in as" a student,
a Management tab that was already open kept showing the Management menu and "Management only" errors)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session, MGMT

def landed(user, path):
    with Session(user=user, state={}) as s:
        s.page.goto(os.environ.get("U2_BASE", "http://localhost:3111") + path, wait_until="networkidle")
        s.page.wait_for_timeout(1500)
        return s.page.url.split("//", 1)[1].split("/", 1)[1], s.page.get_by_role("link", name="Accounts").count() + s.page.get_by_role("button", name="Accounts").count()

def main():
    out = {}
    for name, user in [("student", {"UserID": "STU-1", "UserType": "Student", "Name": "Leo", "UiPreference": "next"}), ("teacher", {"UserID": "T", "UserType": "Teacher", "Name": "T", "UiPreference": "next"}), ("parent", {"UserID": "PAR-1", "UserType": "Parent", "Name": "P", "UiPreference": "next"})]:
        url, menu = landed(user, "/v2/management/accounts")
        out[f"{name}_url"] = url; out[f"{name}_sees_management_menu"] = menu
        assert "management" not in url and menu == 0, (name, url, menu)
    url, menu = landed(MGMT, "/v2/management/accounts")
    out["management_url"] = url; out["management_sees_menu"] = menu
    assert "management/accounts" in url and menu > 0
    # a broken server reply must show a message, never crash the page (Sentry showed "x is not iterable" and "_.find is not a function")
    for name, utype, path in [("teacher", "Teacher", "/v2/teacher"), ("parent", "Parent", "/v2/parent"), ("student", "Student", "/v2/student")]:
        user = {"UserID": "U1", "UserType": utype, "Name": "U", "UiPreference": "next"}
        with Session(user=user, state={}) as s:
            s.on(r"^/api/me", lambda m, p, b, st: (200, {}))
            s.goto(path); s.page.wait_for_timeout(1500)
            out[f"{name}_empty_me_message"] = s.page.get_by_role("alert").count() > 0
            out[f"{name}_empty_me_errors"] = [e for e in s.errors if not e.startswith("console:")][:2]
            assert out[f"{name}_empty_me_message"] and not out[f"{name}_empty_me_errors"], (name, out)
    with Session(user={"UserID": "STU-1", "UserType": "Student", "Name": "L", "UiPreference": "next"}, state={}) as s:
        s.on(r"^/api/syllabus/syllabi$", lambda m, p, b, st: (200, {"error": "busy"}))
        s.goto("/v2/syllabus"); s.page.wait_for_timeout(1500)
        out["syllabus_object_reply_errors"] = [e for e in s.errors if not e.startswith("console:")][:2]
        assert not out["syllabus_object_reply_errors"], out
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
