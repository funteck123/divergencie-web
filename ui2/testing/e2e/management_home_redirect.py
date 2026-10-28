"""The bare /v2/management address (a bookmark, a typed address) lands a signed-in management user on Accounts, the management home. It used to be a 404."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session, MGMT
import portals_journey as P

bad = []
user = dict(MGMT, Status="Active", Username="admin")
with Session(user=user, state={}, width=1280, height=900) as s:
    s.on(r"^/api/", P.handler_for(user, "management"))
    s.goto("/v2/management"); s.page.wait_for_timeout(2500)
    path = s.page.evaluate("location.pathname")
    if path != "/v2/management/accounts": bad.append(f"landed on {path}, expected /v2/management/accounts")
    if s.page.get_by_role("heading", name="Accounts").count() == 0 and "404" in s.page.locator("body").inner_text(): bad.append("page shows a 404")
print("problems:", len(bad))
for b in bad: print(" ", b)
sys.exit(1 if bad else 0)
