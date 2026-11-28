"""TKT-0456: on a touch screen the header buttons, the tabs, the chips, the search box, Group by, Filter and New account are all one height. All data is fake (harness).
Run: U2_BASE=https://www.divergencie.co.uk python3 ui2/testing/e2e/touch_heights_journey.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A

JS = """() => {
  const pick = [...document.querySelectorAll('header button, header a[class*=btn], nav a, main button, main select, main input:not([type=checkbox]):not([type=radio])')]
    .filter((e) => !e.closest('.u2-cards, .u2-table, table') && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().top < 640 && !e.className.toString().includes('shotfab'));
  return pick.map((e) => [(e.textContent || e.getAttribute('aria-label') || e.placeholder || e.tagName).trim().slice(0, 22), e.tagName, Math.round(e.getBoundingClientRect().height)]);
}"""

def run(width, touch):
    with Session(state={"users": A.mk_users()}, width=width, height=840, touch=touch) as s:
        s.on(r"^/api/users", A.users_handler)
        s.goto("/v2/management/accounts")
        s.page.get_by_role("button", name="New account").wait_for(timeout=60000)
        s.page.wait_for_timeout(800)
        rows = s.page.evaluate(JS)
        s.page.screenshot(path=f"snapshots/tkt0456-{width}{'-touch' if touch else ''}.png")
        return rows, s.hscroll(), s.errors[:3]

if __name__ == "__main__":
    ok = True
    for width, touch in ((411, True), (360, True), (1280, False)):
        rows, hs, errs = run(width, touch)
        heights = sorted({r[2] for r in rows})
        print(f"{width} touch={touch}: {len(rows)} controls, heights {heights}, page sideways scroll {hs}, errors {errs}")
        for r in rows: print("    ", r)
        ok = ok and len(heights) == 1 and not errs and (width == 360 or not hs)
    print("JOURNEY", "PASS" if ok else "FAIL"); sys.exit(0 if ok else 1)
