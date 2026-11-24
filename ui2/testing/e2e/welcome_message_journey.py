"""TKT-0435, row action (24 Nov 2026): "Copy welcome message" in an account's menu asks whether the password goes in.
No: the text is copied with no password and nothing is reset. Yes: the password is reset first and the new one is in the copied text. Fake data only."""
import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A

def main():
    out = {}
    with Session(state={"users": A.mk_users()}) as s:
        s.on(r"^/api/users", A.users_handler)
        s.goto("/v2/management/accounts"); s.page.locator("table").first.wait_for(timeout=120000); s.page.wait_for_timeout(1500)
        s.page.add_style_tag(content="nextjs-portal { display: none !important; }")
        s.page.get_by_label("Search Student Accounts").fill("STU-1002"); s.page.wait_for_timeout(500)
        row = s.page.locator("tbody tr", has_text="STU-1002")
        def open_dialog():
            row.get_by_role("button", name=re.compile("More actions")).click(); s.page.get_by_role("menuitem", name="Copy welcome message").click()
            s.page.get_by_role("dialog").get_by_text("Put the password in the message").wait_for()
        open_dialog()
        out["dialog_text"] = s.page.get_by_role("dialog").inner_text().replace("\n", " | ")[:260]
        s.page.get_by_role("button", name="No password").click(); s.page.get_by_role("dialog").wait_for(state="hidden", timeout=10000)
        msg1 = s.page.evaluate("navigator.clipboard.readText()")
        out["no_pw_has_username"] = "Username:" in msg1; out["no_pw_has_password_value"] = "Fake-Pass-123" in msg1; out["no_pw_line"] = [l for l in msg1.splitlines() if l.startswith("Password")]
        out["reset_calls_after_no"] = len([1 for m, p, b in s.calls if m == "PATCH" and isinstance(b, dict) and (b.get("resetPassword") or (b.get("fields") or {}).get("resetPassword"))])
        open_dialog()
        s.page.get_by_role("button", name="Yes, reset and include").click(); s.page.get_by_role("dialog").wait_for(state="hidden", timeout=10000)
        msg2 = s.page.evaluate("navigator.clipboard.readText()")
        out["yes_has_new_password"] = "Password: Fake-Pass-123" in msg2
        out["reset_calls_after_yes"] = len([1 for m, p, b in s.calls if m == "PATCH" and "resetPassword" in json.dumps(b)])
        out["credentials_box_shows"] = s.page.get_by_text("Fake-Pass-123").count() >= 1
        s.page.screenshot(path="snapshots/welcome-dialog-after.png")
        open_dialog(); s.page.screenshot(path="snapshots/welcome-dialog.png")
        out["errors"] = s.errors[:3]
    print(json.dumps(out, indent=1))
    assert out["no_pw_has_username"] and not out["no_pw_has_password_value"] and out["reset_calls_after_no"] == 0, out
    assert out["yes_has_new_password"] and out["reset_calls_after_yes"] == 1 and out["credentials_box_shows"], out
    assert not out["errors"], out["errors"]
    print("JOURNEY OK")
if __name__ == "__main__": main()
