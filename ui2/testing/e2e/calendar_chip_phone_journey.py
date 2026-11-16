import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import portals_journey as P

# TKT-0422 (ux-review of 14-16 Nov 2026, persona: a parent on a 360 px phone). Fake parent, fake child, fake data.
# On a phone a calendar day cell shows the class time, not a cut-off "1…", with padding around it; on a desktop the chip keeps its full text.
def check(width):
    user = {"UserID": "PAR-1", "UserType": "Parent", "Name": "Test Parent", "UiPreference": "next"}
    os.environ["U2_WIDTH"] = str(width)
    with Session(user=user, state={}, width=width, height=740) as s:
        s.on(r"^/api/", P.handler_for(user, "parent")); s.goto("/v2/parent")
        s.page.get_by_role("heading", name="My Info").first.wait_for(timeout=120000); s.page.wait_for_timeout(1000)
        chip = s.page.locator("button.u2-chip", has_text="17:00").first
        shown = chip.inner_text().strip(); aria = chip.get_attribute("aria-label")
        assert aria.startswith("17:00 IST Cambridge IGCSE 0625 Physics"), aria
        m = s.page.evaluate("""(() => { const b = [...document.querySelectorAll('button.u2-chip')].find(x => /17:00/.test(x.innerText)); const cs = getComputedStyle(b);
            return {clipped: b.scrollWidth > b.clientWidth + 1, h: Math.round(b.getBoundingClientRect().height), padV: parseFloat(cs.paddingTop), padH: parseFloat(cs.paddingLeft), w: Math.round(b.getBoundingClientRect().width)}; })()""")
        if width <= 480:
            assert shown == "17:00", shown
            assert not m["clipped"], "the time is cut off: %s" % m
            assert m["padV"] >= 6 and m["padH"] >= 2, m
        else:
            assert shown.startswith("17:00 IST Cambridge"), shown
        assert not s.errors, s.errors[:2]
        return {"chip": shown, **m, "hscroll": s.hscroll()}

def main():
    for w in (360, 1280):
        print(w, check(w))
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
