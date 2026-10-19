"""Tickets, Audit Log, Guides, the student portal and the Solver picker on a phone: one card per row, and a card's action button is on screen without scrolling sideways."""
import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, tickets_journey as T, audit_guides as AG, portals_journey as P, solver_phone_last_question as SQ

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
    # the Solver picker: long paper and component names are cut with an ellipsis, so every select stays one height
    long_title = "CAIE A Level Maths Ch3.1 Algebra - Binomial Negative & Fractional (P3) Worksheet 1"
    lib = {"A Levels": {"Mathematics": {"Paper 1: Pure Mathematics 1": [{"qpId": "qp1", "msId": "ms1", "title": long_title}]}}}
    with Session(user=SQ.stu, state={}, width=390, height=900) as s:
        s.on(r"^/api/mcq", lambda m, p, b, st: (200, lib) if p.startswith("/api/mcq/library") else SQ.h(m, p, b, st)); s.goto("/v2/question-solver")
        s.page.get_by_role("button", name="Fetch this paper and start").wait_for(timeout=60000); s.page.wait_for_timeout(800)
        out["solver_select_heights"] = s.page.evaluate("[...document.querySelectorAll('.u2-combo__trigger')].map((e) => Math.round(e.getBoundingClientRect().height))")
        out["solver_scrolls_sideways"] = s.page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || document.body.scrollWidth > document.body.clientWidth + 1 || [...document.querySelectorAll('main *')].some((e) => e.getBoundingClientRect().right > window.innerWidth + 1)")
        out["errors"] += s.errors[:3]
    # the Solver progress chart: every label of the drawing sits inside it (the last date label used to be cut by the right edge)
    att = [{"id": f"a{i}", "account_id": "STU-2", "subject": "CIE Physics", "chapter": "1", "paper_id": "qp1", "mode": "test", "score": 10 + i, "total_questions": 17, "time_taken_seconds": 600, "submitted_at": f"2026-10-{10 + i:02d}T10:00:00Z"} for i in range(4)]
    with Session(user=SQ.stu, state={}, width=390, height=900) as s:
        s.on(r"^/api/mcq", lambda m, p, b, st: (200, {"attempts": att}) if p.startswith("/api/mcq/progress") else SQ.h(m, p, b, st)); s.goto("/v2/question-solver")
        s.page.get_by_role("button", name=re.compile("progress", re.I)).first.click(); s.page.wait_for_timeout(1500)
        out["chart_labels_outside"] = s.page.evaluate("""() => { const svg = document.querySelector('figure.u2-chart svg'); if (!svg) return -1; const vb = svg.viewBox.baseVal; return [...svg.querySelectorAll('text')].filter((t) => { const b = t.getBBox(); return b.x < -0.5 || b.x + b.width > vb.width + 0.5; }).length; }""")
        out["errors"] += s.errors[:3]
    print(json.dumps(out))
    ok = out["tickets_table_rows"] == 0 and out["close_on_screen"] and not out["page_scrolls_sideways"] and out["audit_table_rows"] == 0 and out["audit_summary_visible"] and not out["audit_scrolls_sideways"] and out["tunnel_field_width"] >= 200 and not out["guides_scrolls_sideways"] and out["student_tables_left"] == 0 and out["student_pay_on_screen"] and out["student_service_visible"] and not out["student_scrolls_sideways"] and len(set(out["solver_select_heights"])) == 1 and out["solver_select_heights"] and not out["solver_scrolls_sideways"] and out["chart_labels_outside"] == 0 and not out["errors"]
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
