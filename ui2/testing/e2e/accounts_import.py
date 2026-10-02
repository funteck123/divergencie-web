import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, accounts_phase2 as P

ENTRY = "Student Name    Import Kid\nWhatsApp Number    +919822222222\nGender    Female\nSubjects    Physics\nWho referred you? (Referrer Name)    Hassan Al Mansouri\nHow did you hear about us?    Referral"

def main():
    out = {}
    with Session(state={"users": A.mk_users()}) as s:
        s.on(r"^/api/users", P.handler)
        s.goto("/v2/management/accounts")
        s.page.get_by_role("table").wait_for(timeout=60000)
        s.page.get_by_role("button", name="New account").click()
        s.page.get_by_role("button", name=re.compile("Import from form")).click()
        s.page.get_by_label("Pasted form entry").fill(ENTRY)
        s.page.wait_for_timeout(500)
        out["preview_has_link"] = s.page.get_by_text(re.compile("linked to STU-\\d+ Hassan Al Mansouri")).count()
        out["create_radio"] = s.page.get_by_label("Create a new account").is_checked()
        s.page.get_by_role("button", name="Create account from form").click()
        s.page.get_by_text("Gen-Pass-1").first.wait_for()
        out["issued"] = s.page.get_by_text("Gen-Pass-1").count()
        out["post"] = [c for c in s.calls if c[0] == "POST"]
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

main()
