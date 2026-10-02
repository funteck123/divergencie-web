import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A

def handler(method, path, body, st):
    if not path.startswith("/api/users"):
        return None
    users = st["users"]
    if method == "GET":
        return 200, {"users": users}
    if method == "PATCH":
        u = next(x for x in users if x["UserID"] == body["userId"])
        if "name" in body: u["Name"] = body["name"]
        if "status" in body: u["Status"] = body["status"]
        return 200, {"user": {k: v for k, v in u.items() if k not in ("Username", "Password")}}
    if method == "POST":
        new = {"UserID": "STU-9999", "UserType": body["userType"], "Name": body["name"], "Status": "Active"}
        users.append(new)
        return 200, {"user": new, "credentials": {"username": "newstu", "password": "Gen-Pass-1"}}
    if method == "DELETE":
        if body["userId"] == "STU-1003" and not body["force"]:
            return 409, {"error": "Account has enrollments and invoices. Delete refused."}
        st["users"] = [x for x in users if x["UserID"] != body["userId"]]
        return 200, {"backupId": "BK-1"} if body["force"] else {}

def main():
    out = {}
    with Session(state={"users": A.mk_users()}) as s:
        s.on(r"^/api/users", handler)
        s.goto("/v2/management/accounts?q=STU-100")
        s.page.get_by_role("table").wait_for(timeout=60000)
        # edit
        s.page.locator("tbody tr", has_text="STU-1000").get_by_role("button", name=re.compile("^Edit")).click()
        s.page.get_by_label("Name", exact=True).fill("Zara Malik Edited")
        s.page.get_by_role("button", name="Save").click()
        s.page.get_by_text("Saved Zara Malik Edited").wait_for()
        out["edit_url_cleared"] = "edit=" not in s.page.url
        # create
        s.page.get_by_role("button", name="New account").click()
        s.page.get_by_label("Name", exact=True).fill("Brand New Kid")
        s.page.get_by_role("button", name="Create account", exact=True).click()
        s.page.get_by_text("Gen-Pass-1").first.wait_for()
        out["create_issued"] = s.page.get_by_text("Gen-Pass-1").count()
        # delete blocked -> force typed
        s.page.locator("tbody tr", has_text="STU-1003").get_by_role("button", name=re.compile("More actions")).click()
        s.page.get_by_role("menuitem", name="Delete").click()
        s.page.get_by_role("button", name="Delete", exact=True).click()
        s.page.get_by_text("Delete refused").wait_for()
        s.page.get_by_role("button", name="Force delete (cascade)").click()
        btn = s.page.get_by_role("button", name="Force delete", exact=True)
        out["force_disabled_before_typing"] = btn.get_attribute("aria-disabled")
        s.page.get_by_label(re.compile("Type .* to confirm")).fill(next(u["Name"] for u in s.state["users"] if u["UserID"] == "STU-1003"))
        btn.click()
        s.page.wait_for_timeout(600)
        out["row_gone"] = s.page.locator("tbody tr", has_text="STU-1003").count() == 0
        # bulk deactivate 2
        s.page.locator("tbody tr", has_text="STU-1004").get_by_role("checkbox").check()
        s.page.locator("tbody tr", has_text="STU-1005").get_by_role("checkbox").check()
        out["bulk_label"] = s.page.get_by_text("2 selected").count()
        s.page.get_by_role("button", name="Deactivate", exact=True).click()
        s.page.get_by_text(re.compile("Deactivate: 2 of 2 done")).wait_for()
        # bulk delete typed
        s.page.get_by_role("button", name="Delete", exact=True).click()
        d = s.page.get_by_role("button", name="Delete 2 accounts")
        out["bulk_delete_disabled"] = d.get_attribute("aria-disabled")
        s.page.get_by_label(re.compile("Type .* to confirm")).fill("DELETE 2")
        d.click()
        s.page.wait_for_timeout(800)
        out["bulk_rows_gone"] = s.page.locator("tbody tr", has_text="STU-1004").count() + s.page.locator("tbody tr", has_text="STU-1005").count()
        s.page.screenshot(path="snapshots/v2-accounts-phase2.png")
        out["calls"] = [(m, p, b) for m, p, b in s.calls]
        # the delete refusal above is a deliberate 409, which the browser logs as a console error
        out["errors"] = [e for e in s.errors if "status of 409" not in e][:5]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
