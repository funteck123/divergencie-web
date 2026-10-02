import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV

def mk_invoices():
    li = lambda amt: [{"ServiceID": "SVC-1", "BatchID": "B1", "ScheduledHours": 8, "AttendedHours": 8, "Amount": amt, "Currency": "SAR"}]
    base = {"StudentID": "STU-1001", "Year": 2026, "Month": 10, "Currency": "SAR", "Amount": 1000, "INRAmount": 25000, "INRDue": 25000, "StudentPaidFlag": False, "LineItems": li(1000)}
    return [
        {**base, "InvoiceID": "INV-D", "Status": "Draft"},
        {**base, "InvoiceID": "INV-S", "StudentID": "STU-1002", "Status": "Sent", "SentAt": "2026-10-01T00:00:00Z"},
        {**base, "InvoiceID": "INV-N", "StudentID": "STU-1003", "Status": "Sent", "StudentPaidFlag": True, "PaidAt": "2026-10-02T00:00:00Z", "PaymentProofPath": "x.png"},
        {**base, "InvoiceID": "INV-X", "StudentID": "STU-1004", "Month": 9, "Status": "Sent", "StudentPaidFlag": True, "INRDue": 0, "PaidAt": "2026-09-20T00:00:00Z", "DiscountPercent": 10, "CouponCode": "WELCOME5"},
        {**base, "InvoiceID": "INV-D2", "Month": 9, "Status": "Draft"},  # same student+month as nobody else? STU-1001 Sep, not a duplicate
        {**base, "InvoiceID": "INV-DUP", "Status": "Draft"},  # duplicate of INV-D (same student, same month)
    ]

def mk_paychecks():
    return [{"PaycheckID": "PAY-1", "StaffID": "TCH-0001", "Year": 2026, "Month": 10, "Currency": "INR", "Amount": 9000, "INRAmount": 9000, "INRDue": 9000, "Status": "Draft", "StaffReceivedFlag": False,
             "LineItems": [{"ServiceID": "SVC-2", "ScheduledHours": 10, "AttendedHours": 9, "Amount": 9000, "Currency": "INR"}]}]

def handler(method, path, body, st):
    if path.startswith("/api/payment-details"):
        return 200, {"options": [{"key": "upi", "label": "UPI", "text": "Pay by UPI: x@bank"}, {"key": "bank", "label": "Bank transfer", "text": ""}]}
    kind = "invoices" if path.startswith("/api/invoices") else "paychecks" if path.startswith("/api/paychecks") else None
    if kind is None: return None
    if "/pdf" in path or "/proof" in path: return 200, {}
    idkey = "InvoiceID" if kind == "invoices" else "PaycheckID"
    bodykey = "invoiceId" if kind == "invoices" else "paycheckId"
    rows = st[kind]
    if method == "GET": return 200, {kind: rows}
    if method == "PATCH":
        r = next(x for x in rows if x[idkey] == body[bodykey])
        if "lineItemIndex" in body:
            li = r["LineItems"][body["lineItemIndex"]]; li["Amount"] = float(body["amount"]); li["ScheduledHours"] = body["scheduledHours"]; li["AttendedHours"] = body["attendedHours"]
        for k2 in ("status",): 
            if k2 in body: r["Status"] = body[k2]
        if "inrDue" in body: r["INRDue"] = float(body["inrDue"])
        if "discountPercent" in body: r["DiscountPercent"] = float(body["discountPercent"]); r["CouponCode"] = body["couponCode"]
        return 200, {("invoice" if kind == "invoices" else "paycheck"): r}
    if method == "DELETE":
        st[kind] = [x for x in rows if x[idkey] != body[bodykey]]; return 200, {}
    if method == "POST":
        if body.get("action") == "generate": return 200, {"created": [1, 2], "skipped": [{"studentId": "STU-1", "serviceId": "SVC-9"}] if kind == "invoices" else []}
        if body.get("action") == "manual" and kind == "invoices": return 200, {"invoices": [{**mk_invoices()[0], "InvoiceID": "INV-M", "StudentID": body["studentId"]}]}

def main():
    out = {}
    users = A.mk_users()
    enroll = [{"EnrolmentID": "E1", "UserID": "STU-1001", "ServiceID": "SVC-1", "BatchID": "B1", "RateID": "R1"}]
    with Session(state={"users": users, "services": SV.mk_services(), "invoices": mk_invoices(), "paychecks": mk_paychecks(), "enrollments": enroll}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
        s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
        s.on(r"^/api/(invoices|paychecks|payment-details)", handler)
        s.goto("/v2/management/billing")
        s.page.get_by_role("table").wait_for(timeout=60000)
        out["rows"] = s.page.locator("tbody tr").count()
        out["dup_warning"] = s.page.get_by_text(re.compile("more than one invoice")).count()
        out["dup_badges"] = s.page.get_by_text("⚠ dup?").count()
        out["hscroll"] = s.hscroll()
        s.page.screenshot(path="snapshots/v2-billing-table.png")
        # status filter
        s.page.get_by_label("Status").click(); s.page.get_by_role("option", name="Needs approval").click()
        s.page.wait_for_timeout(300)
        out["needs_approval_rows"] = s.page.locator("tbody tr").count()
        # approve partial
        s.page.get_by_role("button", name="Mark paid").click()
        s.page.get_by_role("button", name="Partial…").click()
        s.page.get_by_label("INR still due").fill("1500")
        s.page.get_by_role("button", name="Confirm").click()
        s.page.get_by_text("Payment recorded.").wait_for()
        # clear filter, send the draft
        s.page.get_by_role("button", name="Clear").click()
        s.page.wait_for_timeout(300)
        s.page.locator("tbody tr", has_text="STU-1001").first  # presence
        row = s.page.locator("tbody tr").filter(has=s.page.get_by_role("button", name="Send", exact=True)).first
        row.get_by_role("button", name="Send", exact=True).click()
        s.page.get_by_text("Sent.").first.wait_for()
        # modes
        s.page.get_by_role("button", name="By person").click()
        out["person_groups"] = s.page.locator(".u2-group").count()
        s.page.get_by_role("button", name="By status").click()
        out["lane_cards"] = {l: s.page.get_by_role("region", name=l).locator(".u2-card").count() for l in ["Draft", "Sent, unpaid", "Needs approval", "Settled"]}
        s.page.get_by_role("button", name="By due date").click()
        out["overdue_badges"] = s.page.get_by_text("Overdue").count()
        s.page.get_by_role("button", name="Table").click()
        # sheet: discount + line item + reminder copy
        s.page.locator("tbody tr", has_text="Test").first
        s.page.get_by_role("button", name=re.compile("^Open STU-1002")).click()
        s.page.get_by_label("Discount %", exact=True).fill("10"); s.page.get_by_label("Coupon code").fill("SAVE10")
        s.page.get_by_role("button", name="Save discount").click()
        s.page.get_by_text("Discount saved.").wait_for()
        s.page.get_by_role("button", name="Edit", exact=True).click()
        s.page.get_by_label("Amount", exact=True).fill("900")
        s.page.get_by_role("button", name="Save", exact=True).click()
        s.page.get_by_text("Subject saved.").wait_for()
        s.page.get_by_role("button", name=re.compile("^Copy")).click()
        s.page.get_by_role("menuitem", name="Copy reminder: UPI").click()
        s.page.get_by_text("Reminder copied (UPI).").wait_for()
        clip = s.page.evaluate("navigator.clipboard.readText()")
        out["clipboard_head"] = clip.split("\n")[0][:40]
        out["clipboard_has_pay"] = "Pay by UPI" in clip and "Total due:" in clip and "/api/invoices/pdf?invoiceId=INV-S" in clip
        s.page.keyboard.press("Escape")
        # paychecks tab
        s.page.get_by_role("tab", name="Paychecks").click()
        s.page.get_by_role("table").wait_for()
        out["paycheck_rows"] = s.page.locator("tbody tr").count()
        # monthly actions
        s.page.get_by_role("tab", name="Generate and create").click()
        s.page.get_by_role("button", name="Generate drafts for this month").click()
        s.page.get_by_text(re.compile("^Generated 2 invoices, 2 paychecks")).wait_for()
        out["skipped_listed"] = s.page.get_by_text(re.compile("Show skipped items")).count()
        out["calls"] = [(m, p, {k: v for k, v in (b or {}).items() if k in ("invoiceId", "paycheckId", "status", "inrDue", "discountPercent", "couponCode", "amount", "action", "year", "month", "lineItemIndex")}) for m, p, b in s.calls]
        out["errors"] = s.errors[:4]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
