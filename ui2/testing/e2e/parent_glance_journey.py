import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import portals_journey as P

# TKT-0421 and TKT-0422 (ux-review of 14-15 Nov 2026, persona: a parent on a 360 px phone). Fake parent, fake child, fake data.
#  - the parent dashboard opens with "At a glance": next class and what is still to pay, before My Info; See invoice jumps to the invoices
#  - on a phone a calendar day cell shows the class time, not a cut-off "1…"; on a desktop the chip keeps its full text
def check(width):
    user = {"UserID": "PAR-1", "UserType": "Parent", "Name": "Test Parent", "UiPreference": "next"}
    os.environ["U2_WIDTH"] = str(width)
    with Session(user=user, state={}, width=width, height=740) as s:
        s.on(r"^/api/", P.handler_for(user, "parent")); s.goto("/v2/parent")
        s.page.get_by_role("heading", name="My Info").first.wait_for(timeout=120000); s.page.wait_for_timeout(1000)
        heads = [h.inner_text() for h in s.page.locator("h2").all()]
        assert heads[0].startswith("At a glance"), heads[:3]
        glance = s.page.locator("section", has=s.page.get_by_role("heading", name=re.compile("At a glance"))).inner_text()
        assert re.search(r"Mon \d{1,2} \w{3}, 17:00 IST", glance) or re.search(r"\w{3} \d{1,2} \w{3}, 17:00 IST", glance), glance
        assert "INR 5000.00 (1 invoice)" in glance, glance
        s.page.get_by_role("link", name="See invoice").click(); s.page.wait_for_timeout(500)
        top = s.page.evaluate("document.querySelector('[id^=invoices-]').getBoundingClientRect().top")
        assert -2 <= top < 740 - 100, top
        chip = s.page.locator("button.u2-chip", has_text="17:00").first
        shown = chip.inner_text().strip(); aria = chip.get_attribute("aria-label")
        assert aria.startswith("17:00 IST Cambridge IGCSE 0625 Physics"), aria
        if width <= 480:
            assert shown == "17:00", shown
            assert not s.page.evaluate("(() => { const b = [...document.querySelectorAll('button.u2-chip')].find(x => /17:00/.test(x.innerText)); return b.scrollWidth > b.clientWidth + 1; })()"), "time is cut off"
        else:
            assert shown.startswith("17:00 IST Cambridge"), shown
        assert not s.errors, s.errors[:2]
        return {"first_card": heads[0], "chip": shown, "invoice_top": round(top)}

def main():
    for w in (360, 1280):
        print(w, check(w))
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
