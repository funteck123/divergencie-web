"""TKT-0354: Management exports one account's attendance month by month (menu -> sheet -> CSV download)."""
import datetime, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session, MGMT

def d(n): return (datetime.date.today() + datetime.timedelta(days=n)).isoformat()

USERS = [dict(MGMT, Status="Active", Username="admin"),
         {"UserID": "STU-1", "UserType": "Student", "Name": "Leo Tan", "Status": "Active", "Username": "leo", "Course": "IGCSE", "Batch": "B8"},
         {"UserID": "PAR-1", "UserType": "Parent", "Name": "A Parent", "Status": "Active", "Username": "par", "StudentIDs": ["STU-1"]}]
def slot(i, date, extra=None): return {"ScheduleID": f"S{i}", "ServiceID": "SVC-1", "ServiceName": "Physics, Extended", "Date": date, "Time": "17:00", "Duration": 1, "Timezone": "Asia/Kolkata", **(extra or {})}
SCHED = [slot(1, d(-70)), slot(2, d(-63)), slot(3, d(-40)), slot(4, d(-5)), slot(5, d(9))]
ATT = [{"AttendanceID": "A1", "ScheduleItemID": "S1", "UserID": "STU-1", "Status": "Present", "LoggedDuration": 1.5, "LoggedBy": "STU-1", "AcceptedForBilling": True},
       {"AttendanceID": "A2", "ScheduleItemID": "S2", "UserID": "STU-1", "Status": "Absent", "LoggedDuration": 0, "LoggedBy": "TCH-1", "TopicName": "=SUM(1,1)"},
       {"AttendanceID": "A3", "ScheduleItemID": "S4", "UserID": "STU-1", "Status": "Late", "LoggedDuration": 1, "LoggedBy": "STU-1"}]
ENR = [{"EnrolmentID": "E1", "UserID": "STU-1", "ServiceID": "SVC-1", "BatchID": "B1", "StartDate": d(-100), "EndDate": ""}]

def handler(method, path, body, st):
    if path.startswith("/api/users") and method == "GET": return 200, {"users": USERS}
    if path.startswith("/api/schedule") and "image" not in path: return 200, {"scheduleItems": SCHED, "openPoolSlotIds": []}
    if path.startswith("/api/attendance") and method == "GET": return 200, {"attendanceItems": ATT}
    if path.startswith("/api/enrollments") and method == "GET": return 200, {"enrollments": ENR}

def main():
    out = {}
    with Session(state={}) as s:
        s.on(r"^/api/", handler)
        s.goto("/v2/management/accounts")
        s.page.get_by_role("table").wait_for(timeout=60000)
        # parents have no attendance: no menu entry
        s.page.get_by_role("button", name="More actions for Leo Tan").click()
        out["menu_has_export"] = s.page.get_by_role("menuitem", name="Export attendance").count()
        s.page.get_by_role("menuitem", name="Export attendance").click()
        dlg = s.page.get_by_role("dialog")
        dlg.get_by_text("Attendance of Leo Tan").wait_for()
        table = dlg.get_by_role("table")
        table.wait_for()
        out["month_rows"] = [r.inner_text().replace("\t", " | ").replace("\n", " ") for r in table.locator("tbody tr").all()]
        out["selects"] = dlg.locator("select").count()
        s.page.screenshot(path="snapshots/v2-attendance-export.png")
        with s.page.expect_download() as dl:
            dlg.get_by_role("button", name="Download every session (CSV)").click()
        path = dl.value.path(); csv = open(path, encoding="utf-8-sig").read()
        out["file_name"] = dl.value.suggested_filename
        out["csv_lines"] = csv.strip().splitlines()
        out["formula_defused"] = "'=SUM(1,1)" in csv and ",=SUM" not in csv
        with s.page.expect_download() as dl2:
            dlg.get_by_role("button", name="Download monthly totals (CSV)").click()
        out["monthly_file"] = dl2.value.suggested_filename
        out["monthly_lines"] = open(dl2.value.path(), encoding="utf-8-sig").read().strip().splitlines()
        # month range: only the last month
        last = dlg.locator("select").first.locator("option").all_inner_texts()[-1]
        dlg.locator("select").first.select_option(label=last)
        out["rows_after_from"] = table.locator("tbody tr").count()
        # first month after last month blocks the download
        dlg.locator("select").nth(1).select_option(index=1)
        out["range_error"] = dlg.get_by_text("The first month is after the last month.").count()
        out["download_disabled"] = dlg.get_by_role("button", name="Download every session (CSV)").is_disabled()
        out["hscroll"] = s.hscroll(); out["errors"] = s.errors[:3]
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
