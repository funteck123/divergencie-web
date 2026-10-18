"""Tickets, Audit Log and Guides on a phone: one card per row, and a card's action button is on screen without scrolling sideways."""
import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, tickets_journey as T, audit_guides as AG, portals_journey as P

def main():
    out = {}
    audit = [{"AuditID": f"A{i}", "Timestamp": "2026-10-01T10:00:00Z", "ActorUserID": "MGT-0001", "Action": "edit", "EntityType": "Service", "EntityID": f"X-{i}", "Summary": f"Changed the rate of service X-{i}"} for i in range(60)]
    tickets = [{"TicketID": f"TKT-{i}", "SenderUserID": "STU-1001", "Message": f"Help number {i}\nmore detail", "CreatedAt": f"2026-10-0{i}T08:00:00Z"} for i in range(1, 4)]
    st = {"users": A.mk_users(), "audit": audit, "tickets": tickets}
    with Session(state=st, width=390, height=900) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/auditlog", AG.audit_handler)
        s.on(r"^/api/(tickets|admin/service-uptime)", T.handler)
        s.goto("/v2/management/tickets"); s.page.get_by_text("Help number 3").first.wait_for(timeout=60000)
        out["tickets_table_rows"] = s.page.locator("tbody tr").count()
        close = s.page.get_by_role("button", name="Close TKT-3")
        out["close_on_screen"] = close.count() == 1 and close.bounding_box()["x"] >= 0 and close.bounding_box()["x"] + close.bounding_box()["width"] <= 390
        out["page_scrolls_sideways"] = s.page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        s.goto("/v2/management/audit-log"); s.page.get_by_text("Changed the rate of service X-0", exact=False).first.wait_for(timeout=60000)
        out["audit_table_rows"] = s.page.locator("tbody tr").count()
        out["audit_summary_visible"] = s.page.get_by_text("Changed the rate of service X-1", exact=True).first.is_visible()
        out["audit_scrolls_sideways"] = s.page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        # boxes side by side on desktop stack on a phone: the tunnel URL field of the Guides page keeps a usable width
        s.on(r"^/api/(guides|resource-toggles|mcq-config)", AG.guides_handler)
        st["toggles"] = {"recordings": True}; st["mcq"] = "https://x.trycloudflare.com"; st["guides"] = []
        s.goto("/v2/management/guides"); s.page.get_by_label("Extraction service tunnel URL").wait_for(timeout=60000)
        out["tunnel_field_width"] = round(s.page.get_by_label("Extraction service tunnel URL").bounding_box()["width"])
        out["guides_scrolls_sideways"] = s.page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        out["errors"] = s.errors[:3]
    # the student portal: no table is left on the page, and the invoice buttons are on screen without sideways scrolling
    user = {"UserID": "STU-1", "UserType": "Student", "Name": "Test Student", "UiPreference": "next"}
    with Session(user=user, state={}, width=390, height=900) as s:
        s.on(r"^/api/", P.handler_for(user, "student")); s.goto("/v2/student"); s.page.get_by_role("heading", name="My Invoices").wait_for(timeout=60000)
        s.page.wait_for_timeout(1200)
        out["student_tables_left"] = s.page.locator(".u2-table__wrap").count()
        pay = s.page.get_by_role("button", name=re.compile("Mark as paid|Pay online")).first
        box = pay.bounding_box() if pay.count() else None
        out["student_pay_on_screen"] = bool(box) and box["x"] >= 0 and box["x"] + box["width"] <= 390
        out["student_service_visible"] = s.page.get_by_text("Cambridge IGCSE 0625 Physics").first.is_visible()
        out["student_scrolls_sideways"] = s.page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
        out["errors"] += s.errors[:3]
    print(json.dumps(out))
    ok = out["tickets_table_rows"] == 0 and out["close_on_screen"] and not out["page_scrolls_sideways"] and out["audit_table_rows"] == 0 and out["audit_summary_visible"] and not out["audit_scrolls_sideways"] and out["tunnel_field_width"] >= 200 and not out["guides_scrolls_sideways"] and out["student_tables_left"] == 0 and out["student_pay_on_screen"] and out["student_service_visible"] and not out["student_scrolls_sideways"] and not out["errors"]
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
