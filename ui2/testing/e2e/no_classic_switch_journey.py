import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import portals_journey as P

# 17 Nov 2026: the old UI is discontinued. The new top bar must not offer a way back to it, on a desktop or in the phone menu.
# (The crash screen still has its own recovery button; that is covered by error_boundary.py.)
def check(kind, utype, width):
    user = {"UserID": "STU-1" if kind == "student" else "PAR-1", "UserType": utype, "Name": "Test " + utype, "UiPreference": "next"}
    os.environ["U2_WIDTH"] = str(width)
    with Session(user=user, state={}, width=width, height=800) as s:
        s.on(r"^/api/", P.handler_for(user, kind)); s.goto("/v2/" + kind)
        s.page.get_by_role("heading", name="My Info").first.wait_for(timeout=120000)
        header = s.page.locator("header").first
        assert header.get_by_role("button", name=re.compile("classic", re.I)).count() == 0, "a Classic button is in the top bar"
        assert header.get_by_role("link", name=re.compile("classic", re.I)).count() == 0, "a Classic link is in the top bar"
        if width < 640:
            header.get_by_role("button", name="Menu").click(); s.page.wait_for_timeout(400)
            items = [i.inner_text().strip() for i in s.page.get_by_role("menuitem").all()]
            assert not any("lassic" in i for i in items), items
            assert "Sign out" in items, items
        else:
            assert header.get_by_role("button", name="Sign out").count() == 1
        assert not s.errors, s.errors[:2]
        return "ok"

def main():
    for kind, utype in (("student", "Student"), ("parent", "Parent")):
        for w in (1280, 360):
            print(kind, w, check(kind, utype, w))
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
