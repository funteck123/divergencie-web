import re, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A

def mk_services():
    return [
        {"ServiceID": "SVC-1", "Name": "Cambridge IGCSE 0625 Physics", "Type": "Course", "Group": ["Student", "Teacher"], "Board": "Cambridge", "Course": "IGCSE", "SubjectCode": "0625", "SubjectName": "Physics",
         "StartDate": "2026-01-01", "EndDate": "2026-12-31", "Links": [], "RecordingsLink": "https://r",
         "OptionalComponents": [{"ComponentID": "C1", "ComponentName": "", "Batches": [
            {"BatchID": "B1", "BatchName": "B14", "StartDate": "2026-02-01", "EndDate": "2026-11-30",
             "Rates": [{"RateID": "R1", "Currency": "INR", "Rate": 5000, "Description": "B14 INR", "BillingType": "Monthly", "Group": ""}, {"RateID": "R2", "Currency": "SAR", "Rate": 250, "Description": "", "BillingType": "Monthly", "Group": ""}],
             "OccuranceList": [{"OccuranceID": "O1", "Day": "Tuesday", "Time": "17:00", "Duration": 1.5, "Facilitator": "Test Teacher", "FacilitatorUserID": "TCH-0001", "Timezone": "Asia/Kolkata"}]},
            {"BatchID": "B2", "BatchName": "B15", "StartDate": "2026-03-01", "EndDate": "",
             "Rates": [{"RateID": "R3", "Currency": "INR", "Rate": 5500, "Description": "", "BillingType": "Monthly", "Group": ""}], "OccuranceList": []}]}]},
        {"ServiceID": "SVC-2", "Name": "DC Staff - PM", "Type": "Staff", "Group": ["Staff"], "Role": "PM", "Department": "IT", "Links": [], "StartDate": "", "EndDate": "",
         "Rates": [{"RateID": "R9", "Currency": "INR", "Rate": 300, "Description": "", "BillingType": "Hourly", "Group": ""}],
         "OccuranceList": [{"OccuranceID": "O9", "Day": "Monday", "Time": "10:00", "Duration": 2, "Facilitator": "", "FacilitatorUserID": "", "Timezone": "Asia/Kolkata"}]},
    ]

def handler(method, path, body, st):
    if not path.startswith("/api/services"):
        return None
    if method == "GET": return 200, {"services": st["services"]}
    if method in ("PATCH", "POST"):
        sid = body.get("serviceId") or "SVC-NEW"
        rec = {"ServiceID": sid, **{k: v for k, v in body.items() if k != "serviceId"}}
        return 200, {"service": rec}
    if method == "DELETE":
        return 409, {"error": "Service is referenced by an enrollment and cannot be deleted."}

def main():
    out = {}
    with Session(state={"users": A.mk_users(), "services": mk_services()}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", handler)
        s.goto("/v2/management/services")
        s.page.get_by_role("tab", name=re.compile("^Student")).wait_for(timeout=60000)
        out["groups_with_counts"] = s.page.get_by_role("tab").all_inner_texts()
        s.page.get_by_role("button", name=re.compile("^Course")).click()
        s.page.get_by_role("button", name=re.compile("^Cambridge")).click()
        s.page.get_by_role("button", name=re.compile("^IGCSE")).click()
        s.page.get_by_role("button", name=re.compile("^Physics")).click()
        out["service_line"] = s.page.get_by_text("Cambridge IGCSE 0625 Physics").count()
        s.page.get_by_role("button", name=re.compile("Show 2 batches")).click()
        out["batch_rows"] = s.page.locator(".u2-svcline__batch").count()
        s.page.screenshot(path="snapshots/v2-services-tree.png")
        # edit: save unchanged -> body must keep ids and batch dates
        s.page.get_by_role("button", name="Edit").first.click()
        s.page.get_by_role("button", name="Save changes").click()
        s.page.get_by_text(re.compile("^Saved")).wait_for()
        patch = next(c for c in s.calls if c[0] == "PATCH")[2]
        b = patch["components"][0]["batches"][0]
        out["patch_keeps"] = [patch["serviceId"], patch["components"][0]["componentId"], b["batchId"], b["startDate"], b["endDate"], b["rates"][1]["rateId"], b["occurrences"][0]["facilitatorUserId"], patch["components"][0]["batches"][1]["batchId"]]
        # role based create
        s.page.get_by_role("button", name="New service").click()
        s.page.get_by_label("Student", exact=True).uncheck()
        s.page.get_by_label("Staff", exact=True).check()
        out["role_fields_visible"] = s.page.get_by_label("Role (job title)").count()
        s.page.get_by_label("Role (job title)").fill("Coordinator")
        out["suggested_name"] = s.page.get_by_label("Service name").input_value()
        s.page.get_by_label("Rate", exact=True).first.fill("400")
        s.page.get_by_role("button", name="Create service").click()
        s.page.get_by_text(re.compile("^Created")).wait_for()
        post = next(c for c in s.calls if c[0] == "POST")[2]
        out["post_keys"] = sorted(post.keys())
        # table view + delete refused
        s.page.get_by_role("button", name="Table").click()
        s.page.wait_for_timeout(300)
        out["table_rows"] = s.page.locator("tbody tr").count()
        s.page.locator("tbody tr").first.get_by_role("button", name="Delete").click()
        s.page.get_by_role("button", name="Delete service").click()
        s.page.get_by_text(re.compile("referenced by an enrollment")).wait_for()
        out["delete_error_shown"] = True
        out["hscroll"] = s.hscroll()
        out["errors"] = [e for e in s.errors if "409" not in e][:4]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
