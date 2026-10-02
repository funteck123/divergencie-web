import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV

def enr_handler(method, path, body, st):
    if path.startswith("/api/services/rates") and method == "POST":
        svc = next(s for s in st["services"] if s["ServiceID"] == body["serviceId"])
        batch = svc["OptionalComponents"][0]["Batches"][0]
        rate = {"RateID": "R-NEW", "Currency": body["currency"], "Rate": float(body["rate"]), "Description": body.get("description", ""), "BillingType": body["billingType"], "Group": ""}
        batch["Rates"].append(rate)
        return 200, {"rate": rate, "service": svc}
    if not path.startswith("/api/enrollments"):
        return None
    es = st["enrollments"]
    if method == "GET": return 200, {"enrollments": es}
    if method == "POST":
        if body["serviceId"] == "SVC-2":
            return 409, {"error": "Not open to this group."}
        e = {"EnrolmentID": f"ENR-{len(es)+1}", "UserID": body["userId"], "ServiceID": body["serviceId"], "BatchID": body["batchId"], "RateID": body["rateId"], "Currency": "INR", "StartDate": body["startDate"], "EndDate": body["endDate"]}
        es.append(e); return 200, {"enrollment": e}
    if method == "PATCH":
        e = next(x for x in es if x["EnrolmentID"] == body["enrolmentId"]); e.update({"BatchID": body["batchId"], "RateID": body["rateId"], "StartDate": body["startDate"], "EndDate": body["endDate"]}); return 200, {"enrollment": e}
    if method == "DELETE":
        st["enrollments"] = [x for x in es if x["EnrolmentID"] != body["enrolmentId"]]; return 200, {}

def main():
    out = {}
    services = SV.mk_services()
    # a second student-open service so the form can enroll in two
    services.append({"ServiceID": "SVC-3", "Name": "Cambridge IGCSE 0580 Maths", "Type": "Course", "Group": ["Student"], "Board": "Cambridge", "Course": "IGCSE", "SubjectCode": "0580", "SubjectName": "Maths",
        "OptionalComponents": [{"ComponentID": "C3", "Batches": [{"BatchID": "B3", "BatchName": "B1", "Rates": [{"RateID": "R30", "Currency": "INR", "Rate": 4000, "Group": ""}], "OccuranceList": []}]}]})
    with Session(state={"users": A.mk_users(), "services": services, "enrollments": []}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" and p.startswith("/api/services") and "rates" not in p else None)
        s.on(r"^/api/(services/rates|enrollments)", enr_handler)
        s.goto("/v2/management/enrollments")
        s.page.get_by_role("button", name=re.compile("^Enroll a Student")).wait_for(timeout=60000)
        s.page.get_by_role("button", name=re.compile("^Enroll a Student")).click()
        s.page.get_by_label("Student", exact=True).click()
        s.page.get_by_role("option", name="Zara Malik").first.click()
        s.page.get_by_label("Service", exact=True).first.click()
        s.page.get_by_role("option", name="Cambridge IGCSE 0625 Physics").click()
        s.page.get_by_label("Batch", exact=True).wait_for()
        out["batch_picker_shown"] = s.page.get_by_label("Batch", exact=True).count()
        # custom rate
        s.page.get_by_role("button", name="+ New rate for this service").click()
        s.page.get_by_label("Amount").fill("4200")
        s.page.get_by_role("button", name="Add rate", exact=True).click()
        s.page.wait_for_timeout(500)
        out["rate_selected"] = "4200" in s.page.get_by_label("Rate", exact=True).inner_text()
        s.page.get_by_role("button", name="+ Add another service").click()
        s.page.get_by_label("Service", exact=True).nth(1).click()
        s.page.get_by_role("option", name="Cambridge IGCSE 0580 Maths").click()
        s.page.get_by_label("Rate", exact=True).nth(1).click()
        s.page.get_by_role("option", name=re.compile("INR 4000")).click()
        s.page.get_by_label("Start date").fill("2026-10-01")
        s.page.get_by_role("button", name=re.compile("^Enroll into 2 services")).click()
        s.page.get_by_text(re.compile("^Enrolled")).wait_for()
        out["rows_after_enroll"] = s.page.locator("tbody tr").count()
        # edit
        s.page.locator("tbody tr").first.get_by_role("button", name="Edit").click()
        s.page.get_by_label("End date").fill("2026-12-01")
        s.page.get_by_role("button", name="Save", exact=True).click()
        s.page.get_by_text("Enrollment saved.").wait_for()
        # delete
        s.page.locator("tbody tr").first.get_by_role("button", name="Delete").click()
        s.page.get_by_role("button", name="Yes, remove").click()
        s.page.get_by_text("Enrollment removed.").wait_for()
        out["rows_after_delete"] = s.page.locator("tbody tr").count()
        out["calls"] = [(m, p, {k: v for k, v in (b or {}).items() if k in ("serviceId", "batchId", "rateId", "startDate", "endDate", "currency", "rate", "enrolmentId")}) for m, p, b in s.calls]
        out["hscroll"] = s.hscroll(); out["errors"] = s.errors[:4]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
