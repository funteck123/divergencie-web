"""23 Nov 2026: Management has no My tickets in the bar and, on a phone, only Report issue and Sign out (one height, one row); other roles keep My tickets;
the admin pages have no grey backgrounds. Fake data only."""
import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV, billing_journey as B, portals_journey as P

GREY = """() => { const grey = c => { const m = c.match(/rgba?\\(([\\d.]+), ([\\d.]+), ([\\d.]+)(?:, ([\\d.]+))?\\)/); if (!m) return false; const [r, g, b] = [+m[1], +m[2], +m[3]]; const a = m[4] === undefined ? 1 : +m[4]; if (a < 0.5) return false; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx < 252 && mx > 150 && (mx - mn) < 8; };
  let n = 0; const ex = []; for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue; const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none') continue; if (grey(s.backgroundColor)) { n++; if (ex.length < 3) ex.push(e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' ' + s.backgroundColor); } } return {n, ex}; }"""
BAR = """() => { const h = document.querySelector('header'); const bs = [...h.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0).map(b => { const r = b.getBoundingClientRect(); return {t: b.innerText.trim().replace(/\\s+/g, ' '), y: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width)}; }); return {buttons: bs, hOverflow: h.scrollWidth > h.clientWidth + 1}; }"""
EMPTY = {k: [] for k in ["users", "services", "enrollments", "scheduleItems", "slots", "invoices", "paychecks", "tickets", "regForms", "leads", "guides", "auditlog", "options"]}

def main():
    out = {}
    state = {"users": A.mk_users(), "services": SV.mk_services(), "invoices": B.mk_invoices(), "paychecks": B.mk_paychecks(), "enrollments": [{"EnrolmentID": f"E{i}", "UserID": f"STU-{1001 + i}", "ServiceID": "SVC-1", "BatchID": "B1", "RateID": "R1"} for i in range(3)]}
    def mgmt(width, touch):
        s = Session(state=dict(state), width=width, height=800, touch=touch)
        return s
    for width, touch, tag in ((1280, False, "mgmt_desktop"), (360, True, "mgmt_phone")):
        with mgmt(width, touch) as s:
            s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
            s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
            s.on(r"^/api/(invoices|paychecks|payment-details)", B.handler)
            s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
            s.goto("/v2/management/billing"); s.page.get_by_role("heading", name="Billing").first.wait_for(timeout=120000); s.page.wait_for_timeout(4000)
            s.page.add_style_tag(content="nextjs-portal { display: none !important; }")
            out[tag] = s.page.evaluate(BAR); out[tag]["my_tickets_anywhere"] = s.page.get_by_text("My tickets").count()
            out[tag]["menu_button"] = s.page.get_by_role("button", name=re.compile("^Menu")).count()
            if tag == "mgmt_desktop":
                out["grey_billing"] = s.page.evaluate(GREY)
                s.goto("/v2/management/accounts"); s.page.locator("table").first.wait_for(timeout=60000); s.page.wait_for_timeout(1200); out["grey_accounts"] = s.page.evaluate(GREY)
                s.page.screenshot(path="snapshots/admin-white-accounts.png"); s.goto("/v2/management/billing"); s.page.locator("table").first.wait_for(timeout=60000); s.page.wait_for_timeout(1200); s.page.screenshot(path="snapshots/admin-white-billing.png")
            else:
                s.page.screenshot(path="snapshots/admin-bar-phone.png", clip={"x": 0, "y": 0, "width": 360, "height": 140})
            out[tag]["errors"] = [e for e in s.errors if "resource-toggles" not in e][:2]
    STU = {"UserID": "STU-1", "UserType": "Student", "Name": "Test Student", "UiPreference": "next"}
    for width, touch, tag in ((1280, False, "student_desktop"), (360, True, "student_phone")):
        with Session(user=STU, state={}, width=width, height=800, touch=touch) as s:
            s.on(r"^/api/", P.handler_for(STU, "student")); s.goto("/v2/student"); s.page.locator("header").first.wait_for(timeout=170000); s.page.wait_for_timeout(1500)
            out[tag] = s.page.evaluate(BAR); out[tag]["grey"] = s.page.evaluate(GREY)["n"]
            if tag == "student_phone": s.page.get_by_role("button", name=re.compile("^Menu")).click(); out[tag]["menu_has_my_tickets"] = s.page.get_by_role("menuitem", name="My tickets").count()
            else: out[tag]["my_tickets_button"] = s.page.get_by_role("button", name="My tickets").count()
    print(json.dumps(out, indent=1))
    ph = out["mgmt_phone"]; names = [b["t"] for b in ph["buttons"]]
    assert names == ["Report issue", "Sign out"], names
    assert len({b["h"] for b in ph["buttons"]}) == 1 and len({b["y"] for b in ph["buttons"]}) == 1, ph["buttons"]
    assert ph["menu_button"] == 0 and ph["my_tickets_anywhere"] == 0 and not ph["hOverflow"]
    d = out["mgmt_desktop"]; assert [b["t"] for b in d["buttons"]] == ["Report an Issue", "Sign out"] and d["my_tickets_anywhere"] == 0, d["buttons"]
    assert out["grey_billing"]["n"] == 0 and out["grey_accounts"]["n"] == 0, (out["grey_billing"], out["grey_accounts"])
    assert out["student_desktop"].get("my_tickets_button") == 1 and out["student_phone"].get("menu_has_my_tickets") == 1
    assert out["student_desktop"]["grey"] > 0, "the student pages must keep their grey: the white scope is for the admin portal only"
    for k in ("mgmt_desktop", "mgmt_phone"): assert not out[k]["errors"], out[k]["errors"]
    print("JOURNEY OK")
if __name__ == "__main__": main()
