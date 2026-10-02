import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV, billing_journey as B

def main():
    out = {}
    enroll = [{"EnrolmentID": "E1", "UserID": "STU-1001", "ServiceID": "SVC-1", "BatchID": "B1", "RateID": "R1"}]
    users = A.mk_users()
    with Session(state={"users": users, "services": SV.mk_services(), "invoices": B.mk_invoices(), "paychecks": B.mk_paychecks(), "enrollments": enroll}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
        s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
        s.on(r"^/api/(invoices|paychecks|payment-details)", B.handler)
        s.goto("/v2/management/billing?section=actions")
        s.page.get_by_role("button", name="Generate drafts for this month").wait_for(timeout=60000)
        # rebuild
        s.page.get_by_label("Leo Tan Wei Ming (Student)", exact=True).check()
        s.page.get_by_label("Test Teacher (Teacher)").check()
        s.page.get_by_role("button", name=re.compile("^Rebuild 2 selected")).click()
        s.page.get_by_role("button", name="Yes, rebuild").click()
        s.page.get_by_text(re.compile("^Rebuilt: 2 invoice line item\\(s\\) rebuilt for 1 student\\(s\\), ")).wait_for()
        # manual invoice
        s.page.get_by_label("Student", exact=True).click()
        s.page.get_by_role("option", name="Leo Tan Wei Ming", exact=True).click()
        s.page.get_by_label(re.compile("Amount for")).fill("750")
        s.page.get_by_role("button", name="Create draft(s)").click()
        s.page.get_by_text(re.compile("Created 1 draft invoice line item for Leo Tan Wei Ming")).wait_for()
        # manual paycheck
        s.page.get_by_label("Staff", exact=True).click()
        s.page.get_by_role("option", name="Test Teacher").click()
        s.page.get_by_label("Service", exact=True).click()
        s.page.get_by_role("option", name="DC Staff - PM").click()
        s.page.get_by_label("Amount", exact=True).fill("1200")
        s.page.get_by_role("button", name="Create draft", exact=True).click()
        s.page.get_by_text("Created draft for Test Teacher.").wait_for()
        out["calls"] = [(m, p, {k: v for k, v in (b or {}).items() if k in ("action", "onlyStudentIds", "onlyStaffIds", "rebuild", "lineItems", "studentId", "staffId", "serviceId", "amount")}) for m, p, b in s.calls]
        out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
