"""TKT-0432, 0433, 0434 on a 360 px phone: the Generate tab note opens on a tap, the Amount box sits under the service name at full width,
buttons in one row share one height, and the invoice sheet does not scroll sideways. Fake data only."""
import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("U2_WIDTH", "360")
from harness import Session
import accounts_journey as A, services_journey as SV, billing_journey as B

def heights(page, scope):
    return page.evaluate("""(sel) => [...document.querySelectorAll(sel + ' button, ' + sel + ' a')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map(e => ({t: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 16), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width)}))""", scope)

def main():
    out = {}
    enroll = [{"EnrolmentID": "E1", "UserID": "STU-1001", "ServiceID": "SVC-1", "BatchID": "B1", "RateID": "R1"}]
    with Session(state={"users": A.mk_users(), "services": SV.mk_services(), "invoices": B.mk_invoices(), "paychecks": B.mk_paychecks(), "enrollments": enroll}, width=360, height=780, touch=True) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
        s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
        s.on(r"^/api/(invoices|paychecks|payment-details)", B.handler)
        s.goto("/v2/management/billing"); s.page.locator(".u2-card").first.wait_for(timeout=170000); s.page.wait_for_timeout(1500)
        s.page.add_style_tag(content="nextjs-portal { display: none !important; }")
        out["coarse_pointer"] = s.page.evaluate("matchMedia('(pointer: coarse)').matches")
        out["page_hscroll"] = s.hscroll()
        out["first_card_buttons"] = heights(s.page, ".u2-card:first-of-type")
        row_h = {}
        for i in range(min(4, s.page.locator(".u2-card").count())):
            row_h[i] = sorted({b["h"] for b in heights(s.page, f".u2-card:nth-of-type({i + 1})")})
        out["card_button_height_sets"] = row_h
        s.page.screenshot(path="snapshots/billing-phone-list.png")
        s.page.get_by_role("button", name=re.compile("^Open STU-1002")).first.click(); s.page.wait_for_timeout(1000)
        dlg = s.page.get_by_role("dialog").first
        out["sheet"] = dlg.evaluate("e => ({sw: e.scrollWidth, cw: e.clientWidth, over: e.scrollWidth > e.clientWidth + 1})")
        out["sheet_wide_children"] = dlg.evaluate("e => [...e.querySelectorAll('*')].filter(c => !c.closest('.u2-scrollx') && c.getBoundingClientRect().right > e.getBoundingClientRect().right + 1).slice(0, 6).map(c => c.tagName + '.' + String(c.className).slice(0, 30) + ' right=' + Math.round(c.getBoundingClientRect().right) + ' text=' + (c.innerText || '').slice(0, 20).replace(/\\n/g, ' '))")
        out["subjects_scroll_box"] = dlg.evaluate("e => { const b = e.querySelector('.u2-scrollx'); return b ? {scrollW: b.scrollWidth, clientW: b.clientWidth, scrolls: b.scrollWidth > b.clientWidth} : null; }")
        out["sheet_button_heights"] = sorted({b["h"] for b in heights(s.page, "[role=dialog]")})
        s.page.screenshot(path="snapshots/billing-phone-sheet.png"); s.page.keyboard.press("Escape"); s.page.wait_for_timeout(400)
        s.page.get_by_role("tab", name="Generate and create").click(); s.page.wait_for_timeout(600)
        summ = s.page.get_by_text("How amounts are calculated"); out["note_summary_count"] = summ.count()
        before = s.page.locator("details.u2-note p").is_visible(); summ.first.click(); s.page.wait_for_timeout(300)
        out["note_opens_on_tap"] = {"before": before, "after": s.page.locator("details.u2-note p").is_visible()}
        s.page.get_by_text("Select Student").first.click(); s.page.get_by_role("option", name="Leo Tan Wei Ming").first.click(); s.page.wait_for_timeout(700)
        amt = s.page.get_by_label(re.compile("^Amount for")).first
        if amt.count():
            box = amt.bounding_box(); chk = s.page.locator(".u2-svcrow").first.locator("label, input[type=checkbox]").first.bounding_box()
            out["amount_box"] = {"w": round(box["width"]), "h": round(box["height"]), "x": round(box["x"]), "y": round(box["y"]), "checkbox_bottom": round(chk["y"] + chk["height"]), "stacked_below": box["y"] >= chk["y"] + chk["height"] - 2}
        s.page.screenshot(path="snapshots/billing-phone-generate.png")
        out["errors"] = s.errors[:3]
    print(json.dumps(out, indent=1))
    # the checks (TKT-0432, 0433, 0434)
    assert out["coarse_pointer"], "this journey must run on a touch screen"
    assert out["page_hscroll"] == 0, "the page scrolls sideways"
    assert not out["sheet"]["over"] and out["sheet_wide_children"] == [], "the invoice sheet is wider than the phone: %s" % out["sheet_wide_children"]
    assert out["subjects_scroll_box"] and out["subjects_scroll_box"]["scrolls"], "the Subjects table should scroll inside its own box"
    assert len(out["sheet_button_heights"]) == 1, "buttons in the sheet differ in height: %s" % out["sheet_button_heights"]
    first = out["first_card_buttons"][:3]
    assert len({b["h"] for b in first}) == 1, "Send and the menu buttons in a card differ in height: %s" % first
    assert out["note_opens_on_tap"] == {"before": False, "after": True}, out["note_opens_on_tap"]
    ab = out["amount_box"]; assert ab and ab["stacked_below"] and ab["w"] >= 250, "the Amount box is cramped: %s" % ab
    assert not out["errors"], out["errors"]
    print("JOURNEY OK")
    return out
if __name__ == "__main__": main()
