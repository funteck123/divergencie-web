import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ["U2_WIDTH"] = "390"
from harness import Session
from accounts_journey import mk_users, users_handler

def main():
    out = {}
    with Session(state={"users": mk_users()}, width=390) as s:
        s.on(r"^/api/users", users_handler)
        s.goto("/v2/management/accounts")
        s.page.get_by_role("list", name=re.compile("accounts", re.I)).first.wait_for(timeout=60000)
        card = s.page.locator(".u2-acctcard").first
        out["card_buttons"] = [b.inner_text() for b in card.get_by_role("button").all()]
        out["report_in_bar"] = s.page.locator("header").get_by_role("button", name="Report issue").count()
        s.page.locator("header").get_by_role("button", name="Report issue").click()
        out["report_dialog"] = s.page.get_by_label("What went wrong?").count()
        s.page.keyboard.press("Escape")
        card.get_by_role("button", name="Delete").click()
        out["delete_dialog"] = s.page.get_by_role("dialog").count()
        out["hscroll"] = s.hscroll()
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
