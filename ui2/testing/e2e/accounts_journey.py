import re
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session, MGMT

NAMES = ["Zara Malik", "Leo Tan Wei Ming", "Priya Nair Sundaram", "Omar Haddad", "Mei Lin Chen", "Sam Okafor", "Ananya Krishnamurthy", "Hassan Al Mansouri"]

def mk_users():
    users = [dict(MGMT, Status="Active", Username="admin")]
    for i in range(240):
        n = NAMES[i % 8] + ("" if i < 8 else f" {i}")
        users.append({"UserID": f"STU-{1000+i}", "UserType": "Student", "Name": n, "Status": "Inactive" if i % 9 == 0 else "Active",
            "Username": f"stu{i}", "Course": ["IGCSE", "A Level"][i % 2], "Batch": f"B{8 + i % 7}", "Timezone": ["Asia/Kolkata", "Asia/Riyadh", "Europe/London"][i % 3],
            "Currency": ["INR", "SAR", "GBP"][i % 3], "WhatsAppNumber": f"9198765{i:05d}", "ParentWhatsAppNumber": f"+4477{i:08d}",
            "ParentEmail": f"parent.of.{n.split()[0].lower()}{i}@example.com", "Email": f"{n.split()[0].lower()}.student{i}@example.com",
            "School": "International School of Somewhere Very Long Name", "Location": "Kuala Lumpur, Malaysia", "Notes": "x" if i % 4 == 0 else "",
            "TimesheetURL": "https://example.com/ts" if i % 3 == 0 else "", "ProgressTrackerURL": "https://example.com/pt" if i % 5 == 0 else "",
            "GroupSent": i % 2 == 0, "GCRSent": i % 3 == 0, "ScheduleSent": i % 4 == 0})
    users.append({"UserID": "TCH-0001", "UserType": "Teacher", "Name": "Test Teacher", "Status": "Active", "Username": "tch1", "Role": "Teacher", "Department": "Teacher", "PassportNumber": "P123", "Batch": "B8", "Timezone": "Asia/Kolkata", "Currency": "INR"})
    return users

def users_handler(method, path, body, st):
    if not path.startswith("/api/users"):
        return None
    if method == "GET":
        return 200, {"users": st["users"]}
    if method == "PATCH":
        u = next(x for x in st["users"] if x["UserID"] == body["userId"])
        if "status" in body: u["Status"] = body["status"]
        out = {"user": {k: v for k, v in u.items() if k not in ("Username", "Password")}}
        if body.get("resetPassword"): out["credentials"] = {"username": u["Username"], "password": "Fake-Pass-123"}
        return 200, out

def main():
    results = {}
    with Session(state={"users": mk_users()}) as s:
        s.on(r"^/api/users", users_handler)
        s.on(r"^/api/impersonate", lambda m, p, b, st: (200, {"user": {"UserID": b["userId"], "UserType": "Student", "Name": "x"}, "impersonatorUserId": "MGT-0001"}))
        s.goto("/v2/management/accounts")
        s.page.get_by_role("table").wait_for(timeout=60000)
        results["rows"] = s.page.locator("tbody tr").count()
        results["hscroll_1280"] = s.hscroll()
        results["table_overflow_1280"] = s.page.evaluate("(()=>{const w=document.querySelector('.u2-table__wrap');return w.scrollWidth-w.clientWidth})()")
        results["one_line_rows"] = s.page.evaluate("[...document.querySelectorAll('tbody tr')].slice(0,30).every(r=>r.getBoundingClientRect().height<=37)")
        results["headers"] = s.page.locator("thead th").all_inner_texts()
        s.page.screenshot(path="snapshots/v2-accounts-1280.png")
        # sort
        s.page.get_by_role("button", name="Course").click()
        results["sorted_course_first"] = s.page.locator("tbody tr").first.locator("td").nth(3).inner_text()
        # search
        s.page.get_by_label("Search Student Accounts").fill("hassan")
        s.page.wait_for_function("document.querySelectorAll('tbody tr').length < 240", timeout=15000)
        results["search_rows"] = s.page.locator("tbody tr").count()
        results["url_q"] = "q=hassan" in s.page.url
        s.page.get_by_label("Search Student Accounts").fill("")
        # deactivate (optimistic)
        row = s.page.locator("tbody tr", has_text="STU-1001")
        row = s.page.locator("tbody tr", has_text="STU-1001")
        row.get_by_role("button", name=re.compile("More actions")).click()
        s.page.get_by_role("menuitem", name="Deactivate").click()
        s.page.wait_for_timeout(500)
        results["status_after"] = s.page.locator("tbody tr", has_text="STU-1001").locator("td").nth(2).inner_text()
        # reset password
        # more than 200 rows: only the rows near the top are in the page, so find this one the way a person would
        s.page.get_by_label("Search Student Accounts").fill("STU-1002")
        row = s.page.locator("tbody tr", has_text="STU-1002")
        row.get_by_role("button", name=re.compile("More actions")).click()
        s.page.get_by_role("menuitem", name="Reset password").click()
        s.page.get_by_role("button", name="Reset password").last.click()
        s.page.get_by_text("Fake-Pass-123").first.wait_for()
        results["issued_shown"] = s.page.get_by_text("Fake-Pass-123").count()
        # group switch + teacher
        s.page.get_by_role("tab", name=re.compile("^Teachers")).click()
        s.page.wait_for_timeout(300)
        results["teacher_rows"] = s.page.locator("tbody tr").count()
        results["url_type"] = "type=teachers" in s.page.url
        # phone
        s.page.set_viewport_size({"width": 390, "height": 800})
        s.page.get_by_role("tab", name=re.compile("^Students")).click()
        s.page.wait_for_timeout(500)
        results["cards_390"] = s.page.locator(".u2-cards__item").count()
        results["hscroll_390"] = s.hscroll()
        s.page.screenshot(path="snapshots/v2-accounts-390.png")
        results["calls"] = [(m, p, b) for m, p, b in s.calls]
        results["errors"] = s.errors[:5]
    for k, v in results.items(): print(k, v)

if __name__ == "__main__":
    main()
