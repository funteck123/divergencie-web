"""TKT-0429, level 1 (23 Nov 2026): Billing and Accounts after the layout move. Fake data only. Checks that every control is still there and where it moved."""
import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV, billing_journey as B

def box(loc): b = loc.first.bounding_box(); return {"x": round(b["x"]), "y": round(b["y"]), "w": round(b["width"]), "h": round(b["height"])}

def main():
    out = {}
    enroll = [{"EnrolmentID": f"E{i}", "UserID": f"STU-{1001 + i}", "ServiceID": "SVC-1", "BatchID": "B1", "RateID": "R1"} for i in range(3)]  # more than one row, so the Filter bar shows
    state = {"users": A.mk_users(), "services": SV.mk_services(), "invoices": B.mk_invoices(), "paychecks": B.mk_paychecks(), "enrollments": enroll}
    with Session(state=state, width=1280, height=900) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
        s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
        s.on(r"^/api/(invoices|paychecks|payment-details)", B.handler)
        s.page.add_init_script("try { if (!sessionStorage.getItem('l1')) { sessionStorage.setItem('l1', '1'); localStorage.removeItem('u2-bill-hint-seen'); localStorage.removeItem('u2.groupDefault:invoices'); } } catch (e) {}")  # cleared once, on the first load only
        s.goto("/v2/management/billing"); s.page.get_by_role("table").wait_for(timeout=170000); s.page.wait_for_timeout(1500)
        s.page.add_style_tag(content="nextjs-portal { display: none !important; }")
        tab = box(s.page.get_by_role("tab", name="Paychecks")); views = box(s.page.get_by_role("button", name="By person")); search = box(s.page.get_by_label("Search Student"))
        flt = box(s.page.get_by_role("button", name=re.compile("^Filter"))); grp = box(s.page.get_by_label("Group by")); rf = box(s.page.get_by_role("button", name=re.compile("Range filters")))
        out["views_on_tabs_line"] = abs(views["y"] - tab["y"]) <= 6
        out["filter_and_group_on_search_line"] = abs(flt["y"] - search["y"]) <= 6 and abs(grp["y"] - search["y"]) <= 6 and abs(rf["y"] - search["y"]) <= 6
        out["make_default_buttons"] = s.page.get_by_role("button", name=re.compile("Make default|Default view")).count()
        out["six_views_present"] = [s.page.get_by_role("button", name=n).count() for n in ("Table", "By person", "By batch", "By month", "By due date", "By status")]
        out["table_top_y"] = box(s.page.locator("table"))["y"]
        out["hint_first_visit_open"] = s.page.locator("details.u2-bill-hint").evaluate("e => e.open")
        s.page.screenshot(path="snapshots/level1-billing-first.png")
        out["page_hscroll"] = s.hscroll()
        # second visit, after the few seconds the note stays open: the hint is folded
        s.page.wait_for_timeout(3500)
        s.goto("/v2/management/billing"); s.page.get_by_role("table").wait_for(timeout=60000); s.page.wait_for_timeout(800)
        out["hint_second_visit_open"] = s.page.locator("details.u2-bill-hint").evaluate("e => e.open")
        out["table_top_y_second_visit"] = box(s.page.locator("table"))["y"]
        s.page.get_by_text("How a bill moves").click(); out["hint_opens_on_click"] = s.page.locator("details.u2-bill-hint").evaluate("e => e.open")
        s.page.get_by_text("How a bill moves").click()
        s.page.screenshot(path="snapshots/level1-billing-second.png")
        # one Make default keeps the view and the grouping
        s.page.get_by_label("Group by").select_option(label="Status"); s.page.wait_for_timeout(300)
        s.page.get_by_role("button", name="Make default").click(); s.page.wait_for_timeout(300)
        out["saved_group"] = s.page.evaluate("localStorage.getItem('u2.groupDefault:invoices')")
        s.goto("/v2/management/billing"); s.page.get_by_role("table").wait_for(timeout=60000); s.page.wait_for_timeout(800)
        out["group_after_reload"] = s.page.get_by_label("Group by").input_value()
        # By status lanes still work
        s.page.get_by_role("button", name="By status").click(); s.page.wait_for_timeout(300)
        out["lanes"] = s.page.locator(".u2-lane").count()
        # row actions untouched (grouping off again: rows in a closed group are not drawn)
        s.page.get_by_role("button", name="Table").click(); s.page.wait_for_timeout(300)
        s.page.evaluate("localStorage.removeItem('u2.groupDefault:invoices')"); s.page.get_by_label("Group by").select_option(label="None"); s.page.wait_for_timeout(300)
        out["row_lead_buttons"] = sorted({b for b in [t.strip() for t in s.page.locator("tbody button").all_inner_texts()] if b in ("Send", "Unsend", "Mark paid")})
        # ---- Accounts
        s.goto("/v2/management/accounts"); s.page.get_by_role("table").wait_for(timeout=170000); s.page.wait_for_timeout(1500)
        tabs = s.page.get_by_role("tab"); out["account_tabs"] = tabs.count()
        t = [box(tabs.nth(i)) for i in range(tabs.count())]; out["account_tab_lines"] = sorted({round(x["y"] / 10) for x in t})
        out["account_tabs_inside_screen"] = all(x["x"] + x["w"] <= 1280 for x in t)
        out["group_titles"] = s.page.locator(".u2-tabgroup__title").all_inner_texts()
        out["pending_tab_names"] = [n for n in tabs.all_inner_texts() if re.search("Trial|interview", n, re.I)]
        new = box(s.page.get_by_role("button", name="New account")); fl = box(s.page.get_by_role("button", name=re.compile("^Filter")))
        out["new_account_on_filter_line"] = abs(new["y"] - fl["y"]) <= 6 and new["x"] > fl["x"]
        out["new_account_height"] = new["h"]
        s.page.get_by_role("button", name="New account").click(); out["create_sheet_opens"] = s.page.get_by_role("dialog").count() >= 1; s.page.keyboard.press("Escape")
        s.page.screenshot(path="snapshots/level1-accounts.png")
        # Enrollments: Enroll a Student still on the Filter line
        s.goto("/v2/management/enrollments"); s.page.get_by_role("table").wait_for(timeout=170000)
        en = box(s.page.get_by_role("button", name=re.compile("^Enroll a"))); ef = box(s.page.get_by_role("button", name=re.compile("^Filter")))
        out["enroll_on_filter_line"] = abs(en["y"] - ef["y"]) <= 6
        out["errors"] = [e for e in s.errors if "resource-toggles" not in e][:3]
    print(json.dumps(out, indent=1))
    assert out["views_on_tabs_line"], "the views are not on the tabs line"
    assert out["filter_and_group_on_search_line"], "Filter, Group by and Range filters are not on the search line"
    assert out["make_default_buttons"] == 1, "there should be one Make default: %s" % out["make_default_buttons"]
    assert out["six_views_present"] == [1] * 6, out["six_views_present"]
    assert out["hint_first_visit_open"] is True and out["hint_second_visit_open"] is False and out["hint_opens_on_click"] is True
    assert out["table_top_y_second_visit"] <= out["table_top_y"] - 30, "the table did not move up when the note folded (measured: 422 open, 380 folded)"
    assert out["saved_group"] == "status" and out["group_after_reload"].lower().startswith("status"), (out["saved_group"], out["group_after_reload"])
    assert out["lanes"] == 4 and out["row_lead_buttons"], out["row_lead_buttons"]
    assert out["account_tabs"] == 10 and out["account_tabs_inside_screen"] and len(out["account_tab_lines"]) == 2, out
    assert out["group_titles"] == ["People", "Waiting to convert"] and len(out["pending_tab_names"]) == 4, out
    assert out["new_account_on_filter_line"] and out["create_sheet_opens"] and out["enroll_on_filter_line"], out
    assert not out["errors"], out["errors"]
    print("JOURNEY OK")
if __name__ == "__main__": main()
