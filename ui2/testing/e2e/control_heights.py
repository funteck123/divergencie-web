"""Finds rows where buttons, selects and inputs that sit side by side have different heights (TKT-0335). Exits non-zero if any are found."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV, schedule_journey as SJ, billing_journey as B, portals_journey as P, pipeline_journey as PJ

JS = """() => {
  const out = [];
  const ctl = (e) => e.matches('button, a[class*=btn], select, .u2-seg, .u2-search, input:not([type=checkbox]):not([type=radio]):not([type=file]), [role=combobox]') && !e.closest('.u2-cards, .u2-tl, .u2-cal, .u2-week, .u2-qstrip, .u2-tag, .u2-letters') && e.getBoundingClientRect().height > 0;
  for (const p of document.querySelectorAll('main *')) {
    const kids = [...p.children].filter(ctl);
    if (kids.length < 2) continue;
    const hs = kids.map((k) => Math.round(k.getBoundingClientRect().height));
    const tops = kids.map((k) => Math.round(k.getBoundingClientRect().top));
    if (Math.max(...tops) - Math.min(...tops) > 12) continue; // wrapped onto different lines
    if (Math.max(...hs) - Math.min(...hs) > 1) out.push([p.className.toString().slice(0, 30), hs.join('/'), kids.map((k) => (k.textContent || k.getAttribute('aria-label') || k.tagName).trim().slice(0, 14)).join(' | ')]);
  }
  return out;
}"""

# A group of action buttons that has wrapped onto two lines (a column that is too narrow for its buttons) doubles the row height.
WRAPPED_JS = """() => [...document.querySelectorAll('main .u2-rowactions')].filter((g) => {
  const kids = [...g.children].filter((k) => k.getBoundingClientRect().height > 0);
  const tops = kids.map((k) => Math.round(k.getBoundingClientRect().top));
  return kids.length > 1 && Math.max(...tops) - Math.min(...tops) > 12 && !g.closest('.u2-cards');
}).map((g) => ['wrapped actions', g.textContent.trim().slice(0, 40), Math.round(g.getBoundingClientRect().height)])"""


CLIP_JS = """() => [...document.querySelectorAll('td')].filter((td) => td.querySelector('button, a') && td.scrollWidth > td.clientWidth + 1).map((td) => ['control clipped by its cell', td.textContent.trim().slice(0, 30), td.scrollWidth - td.clientWidth])"""

# icon buttons of a table's rows start at one x (rows of different lead buttons used to push them apart), and small sub-lines never overflow their cell
ALIGN_JS = """() => [...document.querySelectorAll('.u2-table__wrap')].flatMap((w) => {
  const xs = [...w.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('.u2-rowactions .u2-iconbtn')).filter(Boolean).map((b) => Math.round(b.getBoundingClientRect().left));
  const out = xs.length > 1 && Math.max(...xs) - Math.min(...xs) > 1 ? [['icon buttons not aligned across rows', w.getAttribute('aria-label') || '', Math.max(...xs) - Math.min(...xs)]] : [];
  return out.concat([...w.querySelectorAll('.u2-sub')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => ['sub-line overflows its cell', e.textContent.trim().slice(0, 30), e.scrollWidth - e.clientWidth]));
})"""

# boxes side by side in one row ("u2-split") have one height
SPLIT_JS = """() => [...document.querySelectorAll('.u2-split:not(.u2-split--top)')].flatMap((sp) => {
  const kids = [...sp.children].filter((k) => k.getBoundingClientRect().height > 0);
  const row = kids.filter((k) => Math.abs(k.getBoundingClientRect().top - kids[0].getBoundingClientRect().top) < 2);
  const hs = row.map((k) => Math.round(k.getBoundingClientRect().height));
  return row.length > 1 && Math.max(...hs) - Math.min(...hs) > 1 ? [['boxes in one row have different heights', hs.join(' / '), Math.max(...hs) - Math.min(...hs)]] : [];
})"""


def main():
    bad = []
    with Session(state={"users": A.mk_users(), "services": SV.mk_services(), "items": SJ.mk_items(), "att": [], "requests": [], "enrollments": [{"EnrolmentID": "E1", "UserID": "STU-1001", "ServiceID": "SVC-1"}]}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
        s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
        s.on(r"^/api/(schedule|attendance)", SJ.handler)
        s.state["invoices"] = B.mk_invoices(); s.state["paychecks"] = B.mk_paychecks()
        s.on(r"^/api/(invoices|paychecks|payment-details)", B.handler)
        for path in ["/v2/management/accounts", "/v2/management/services", "/v2/management/schedule", "/v2/management/schedule?view=timeline", "/v2/management/tickets", "/v2/management/pipeline", "/v2/management/enrollments", "/v2/management/billing", "/v2/management/guides", "/v2/management/templates", "/v2/management/audit-log", "/v2/management/applications"]:
            s.goto(path); s.page.wait_for_timeout(900)
            for r in s.page.evaluate(JS) + s.page.evaluate(WRAPPED_JS) + s.page.evaluate(CLIP_JS) + s.page.evaluate(ALIGN_JS) + s.page.evaluate(SPLIT_JS): bad.append((path, *r)); print(path, r)
    # pages whose rows only appear with data (Applications: Approve and Reject on one line; Pipeline: step lists on one line, tables not scrolling sideways), at desktop width
    STEPS_JS = """() => [...document.querySelectorAll('.u2-table .u2-steps')].filter((o) => { const t = [...o.children].map((l) => Math.round(l.getBoundingClientRect().top)); return Math.max(...t) - Math.min(...t) > 4; }).map((o) => ['wrapped steps', o.textContent.trim().slice(0, 40), 0]).concat([...document.querySelectorAll('.u2-table .u2-steps')].filter((o) => o.scrollWidth > o.parentElement.clientWidth + 1).map((o) => ['clipped steps', o.textContent.trim().slice(0, 40), o.scrollWidth - o.parentElement.clientWidth])).concat([...document.querySelectorAll('.u2-table__wrap')].filter((w) => w.scrollWidth > w.clientWidth + 1).map((w) => ['table scrolls sideways', (w.getAttribute('aria-label') || '').trim().slice(0, 30), w.scrollWidth - w.clientWidth]))"""
    for path in ["/v2/management/applications", "/v2/management/pipeline"]:
        with Session(state=PJ.mk_state()) as s:
            s.on(r"^/api/", PJ.handler)
            s.goto(path); s.page.wait_for_timeout(1200)
            for r in s.page.evaluate(JS) + s.page.evaluate(WRAPPED_JS) + s.page.evaluate(STEPS_JS): bad.append((path + " (with data)", *r)); print(path, r)
    # the shell header on a phone: "Report issue" and the "Menu" trigger share one row and one height
    with Session(state={"users": A.mk_users(), "services": SV.mk_services(), "enrollments": []}, width=390, height=900) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
        s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": []}) if m == "GET" else None)
        s.goto("/v2/management/enrollments"); s.page.wait_for_timeout(900)
        for r in s.page.evaluate(JS) + s.page.evaluate(WRAPPED_JS): bad.append(("/v2/management/enrollments@390", *r)); print("phone", r)
        hs = s.page.evaluate("""() => [...document.querySelectorAll('header button, header [aria-label=Menu]')].map((b) => Math.round(b.getBoundingClientRect().height))""")
        if len(set(hs)) > 1: bad.append(("phone header", "button heights", str(hs))); print("phone header heights", hs)
    # the four portals with their own data, at desktop and phone width
    for width in (1280, 390):
        for kind, utype, path in [("student", "Student", "/v2/student"), ("teacher", "Teacher", "/v2/teacher"), ("staff", "Staff", "/v2/staff"), ("parent", "Parent", "/v2/parent")]:
            user = {"UserID": {"student": "STU-1", "teacher": "T", "staff": "STF-1", "parent": "PAR-1"}[kind], "UserType": utype, "Name": f"Test {utype}", "UiPreference": "next"}
            with Session(user=user, state={}, width=width, height=900) as s:
                s.on(r"^/api/", P.handler_for(user, kind)); s.goto(path); s.page.wait_for_timeout(1200)
                for r in s.page.evaluate(JS) + s.page.evaluate(WRAPPED_JS): bad.append((f"{path}@{width}", *r)); print(path, width, r)
    print("mismatched rows:", len(bad))
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
