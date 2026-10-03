import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
from accounts_journey import mk_users, users_handler

def main():
    out = {}
    with Session(state={"users": mk_users()}) as s:
        s.on(r"^/api/users", users_handler)
        s.goto("/v2/management/accounts")
        s.page.get_by_role("table").wait_for(timeout=60000)
        status = lambda: s.page.get_by_role("status").filter(has_text=re.compile(r"\d+ (of \d+ )?rows")).first.inner_text()
        out["start"] = status()
        s.page.get_by_role("button", name="Filter", exact=True).click()
        s.page.locator("summary", has_text="Course").click()
        s.page.locator("label.u2-tt__value", has_text="IGCSE").locator("input").check()
        out["filtered"] = status()
        out["chip"] = s.page.get_by_role("button", name="Remove filter Course").count()
        s.page.get_by_role("button", name="Done").click()
        s.page.get_by_label("Group by").select_option(label="Batch")
        heads = s.page.locator("button.u2-group__head")
        out["groups"] = heads.count()
        out["first_group"] = heads.first.inner_text().replace("\n", " ")
        out["rows_open"] = s.page.locator("tbody tr[data-row-id]").count()
        heads.first.click()
        out["rows_after_collapse"] = s.page.locator("tbody tr[data-row-id]").count()
        s.page.get_by_label("Group by").select_option("")
        s.page.get_by_role("button", name="Remove filter Course").click()
        out["cleared"] = status()
        out["errors"] = s.errors[:3]
        out["hscroll"] = s.hscroll()
    for k, v in out.items(): print(k, v)

if __name__ == "__main__":
    main()
