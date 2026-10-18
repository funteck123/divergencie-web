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
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
