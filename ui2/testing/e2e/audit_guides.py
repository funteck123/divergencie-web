import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A

def audit_handler(method, path, body, st):
    if not path.startswith("/api/auditlog"): return None
    from urllib.parse import urlparse, parse_qs
    q = parse_qs(urlparse(path).query); limit = int(q["limit"][0]); off = int(q["offset"][0])
    rows = [e for e in st["audit"] if not q.get("entityType") or e["EntityType"] == q["entityType"][0]]
    return 200, {"entries": rows[off:off + limit], "total": len(rows)}

def guides_handler(method, path, body, st):
    if path.startswith("/api/resource-toggles"):
        if method == "PATCH": st["toggles"].update(body)
        return 200, {"toggles": st["toggles"]}
    if path.startswith("/api/mcq-config"):
        if method == "PATCH": st["mcq"] = body["url"]
        return 200, {"url": st["mcq"]}
    if not path.startswith("/api/guides"): return None
    g = st["guides"]
    if method == "GET": return 200, {"guides": g}
    if method == "POST":
        n = {"GuideID": f"G{len(g)+1}", "Name": body["name"], "Url": body["url"], "UserTypes": body["userTypes"]}; g.append(n); return 200, {"guide": n}
    if method == "PATCH":
        x = next(i for i in g if i["GuideID"] == body["guideId"]); x.update(Name=body["name"], Url=body["url"], UserTypes=body["userTypes"]); return 200, {"guide": x}
    if method == "DELETE":
        st["guides"] = [i for i in g if i["GuideID"] != body["guideId"]]; return 200, {}

def main():
    out = {}
    audit = [{"AuditID": f"A{i}", "Timestamp": "2026-10-01T10:00:00Z", "ActorUserID": "MGT-0001", "Action": "edit", "EntityType": ["Service", "User", "Invoice"][i % 3], "EntityID": f"X-{i}", "Summary": f"Did thing {i}"} for i in range(130)]
    st = {"users": A.mk_users(), "audit": audit, "toggles": {"recordings": True, "syllabus": False}, "mcq": "https://old.trycloudflare.com", "guides": [{"GuideID": "G1", "Name": "Handbook", "Url": "https://h.example", "UserTypes": ["Student"]}]}
    with Session(state=st) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/auditlog", audit_handler)
        s.on(r"^/api/(guides|resource-toggles|mcq-config)", guides_handler)
        s.goto("/v2/management/audit-log")
        s.page.get_by_role("table").wait_for(timeout=60000)
        out["first_page_rows"] = s.page.locator("tbody tr").count()
        out["range_text"] = s.page.get_by_text(re.compile("^1–50 of 130")).count()
        s.page.get_by_role("button", name="Next", exact=True).click(); s.page.get_by_text(re.compile("^51–100 of 130")).wait_for()
        s.page.get_by_label("Rows per page").select_option("100"); s.page.get_by_text(re.compile("^1–100 of 130")).wait_for()
        s.page.get_by_label("Entity type").click(); s.page.get_by_role("option", name="Invoice").click()
        s.page.get_by_text(re.compile("of 43$")).wait_for()
        out["filtered_total_text"] = s.page.get_by_text(re.compile("of 43$")).count()
        s.goto("/v2/management/guides")
        s.page.get_by_text("Handbook").wait_for(timeout=60000)
        # The switch updates after a tick (optimistic update), so assert the end state instead of check()'s instant one.
        from playwright.sync_api import expect
        s.page.get_by_label("Syllabus", exact=True).click(); expect(s.page.get_by_label("Syllabus", exact=True)).to_be_checked()
        s.page.wait_for_timeout(500)
        s.page.get_by_label("Extraction service tunnel URL").fill("https://new.trycloudflare.com")
        s.page.get_by_role("button", name="Save", exact=True).click(); s.page.get_by_text("Saved.").wait_for()
        s.page.get_by_label("Button name").first.fill("Parent Guide"); s.page.get_by_label("URL", exact=True).first.fill("https://p.example")
        s.page.get_by_label("Parent", exact=True).first.check()
        s.page.get_by_role("button", name="Add Guide").click(); s.page.get_by_text("Added Parent Guide.").wait_for()
        s.page.get_by_role("button", name="Delete").first.click(); s.page.get_by_role("button", name="Yes, delete").click(); s.page.get_by_text("Guide deleted.").wait_for()
        out["calls"] = [(m, p.split("?")[0], b) for m, p, b in s.calls]
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
