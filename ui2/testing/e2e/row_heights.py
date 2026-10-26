"""Global row-height rule (TKT-0382): controls that sit in one visual row have one height, wherever they are in the DOM.
Every control (button, icon button, tab, select, combobox, input, search, segmented control, chip, pill, tag) is placed in a row by vertical overlap, whatever its parent;
a row whose controls differ by more than 1 px fails. It runs on every admin page, on the four portals, at desktop and phone width, and inside every form that opens
from a New, Add, Create, Edit, Enrol, Import or Invite button (dialogs and sheets). Not controls, so not measured: status badges (indicators, smaller on purpose),
the screenshot helper, and plain text buttons with no border or fill. The heights themselves come from --u2-control-h, --u2-control-h-sm and --u2-chip-h (scripts/lint-design.mjs
refuses a raw control height), so a failure here is a layout cause (a stretching grid, a wrong size prop), not a number to patch on one page."""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV, schedule_journey as SJ, billing_journey as B, portals_journey as P, pipeline_journey as PJ

SEL = "button, a[class*=btn], [role=tab], [role=combobox], select, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), .u2-chip, .u2-pill, .u2-tag, .u2-seg, .u2-search, .u2-iconbtn, .u2-linkicon, .u2-combo__trigger, .u2-lead, .u2-toolbar__new"
JS = """([SEL, dialogOnly]) => {
  const root = dialogOnly ? document.querySelector('[role=dialog]') : document.body;
  if (!root) return [];
  const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[data-radix-popper-content-wrapper], .u2-skip, [aria-hidden=true]'); };
  const filled = (e) => { const cs = getComputedStyle(e); return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0 || e.matches('input, select, textarea, [role=combobox]'); };
  let els = [...root.querySelectorAll(SEL)].filter(vis).filter((e) => !e.matches('.u2-shotfab, .u2-badge') && filled(e));
  els = els.filter((e) => !els.some((o) => o !== e && o.contains(e)));
  const sx = scrollX, sy = scrollY;
  const items = els.map((e) => { const r = e.getBoundingClientRect(); return { e, t: r.top + sy, b: r.bottom + sy, l: r.left + sx, r: r.right + sx, h: r.height }; }).sort((a, b) => a.t - b.t || a.l - b.l);
  const rows = [];
  for (const it of items) {
    const row = rows.find((r) => { const ov = Math.min(r.b, it.b) - Math.max(r.t, it.t); return ov >= 0.5 * Math.min(r.b - r.t, it.h) && r.items.every((o) => it.l >= o.r - 1 || it.r <= o.l + 1); });
    if (row) { row.items.push(it); row.t = Math.min(row.t, it.t); row.b = Math.max(row.b, it.b); } else rows.push({ t: it.t, b: it.b, items: [it] });
  }
  return rows.filter((r) => r.items.length > 1).map((r) => r.items.map((i) => [Math.round(i.h * 10) / 10, (i.e.textContent || i.e.getAttribute('aria-label') || i.e.getAttribute('placeholder') || i.e.tagName).trim().slice(0, 14)]))
    .filter((r) => Math.max(...r.map((x) => x[0])) - Math.min(...r.map((x) => x[0])) > 1)
    .map((r) => r.map((x) => `${x[1]}:${x[0]}`).join(" / "));
}"""
OPENERS = re.compile(r"^(new|add|create|edit|enrol|enroll|import|invite|reschedule|report|decide|offer|open|convert|reject|approve|send task|mark as|\+ new|\d\d:\d\d|✎)", re.I)
bad = []
seen = {"pages": 0, "forms": 0, "rows": 0}  # coverage: a pass that measured nothing proves nothing


def measure(s, label, dialog_only=False):
    seen["forms" if dialog_only else "pages"] += 1
    print("  measured", label, flush=True)
    for r in s.page.evaluate(JS, [SEL, dialog_only]):
        bad.append((label, r)); print(label, "|", r)


def sweep(s, path, label=None):
    """The page itself, then the form behind each opener button."""
    label = label or path
    s.goto(path); s.page.wait_for_timeout(900)
    measure(s, label)
    btns = s.page.locator("header button, main button")
    seen_names = set()
    for i in range(min(btns.count(), 80)):
        b = btns.nth(i)
        try:
            name = (b.get_attribute("aria-label", timeout=1500) or b.inner_text(timeout=1500) or "").strip()
            key = name.split()[0].lower() if name.split() else name  # "Edit Ana K", "Edit Ben R": one form of that kind is enough
            if not OPENERS.match(name) or key in seen_names or len(seen_names) >= 12 or not b.is_visible(): continue
        except Exception:
            continue
        seen_names.add(key)
        try:
            b.click(timeout=3000); s.page.wait_for_timeout(500)
            if s.page.locator("[role=dialog]").count(): measure(s, f"{label} > {name}", dialog_only=True)
        except Exception:
            pass
        s.page.keyboard.press("Escape"); s.page.wait_for_timeout(250)
        if s.page.locator("[role=dialog]").count(): s.goto(path); s.page.wait_for_timeout(600); btns = s.page.locator("header button, main button")


def main():
    routes = ["accounts", "services", "schedule", "schedule?view=timeline", "enrollments", "billing", "guides", "templates", "tickets", "audit-log"]
    for width in (1280, 390):
        with Session(state={"users": A.mk_users(), "services": SV.mk_services(), "items": SJ.mk_items(), "att": [], "requests": [], "enrollments": [{"EnrolmentID": "E1", "UserID": "STU-1001", "ServiceID": "SVC-1"}]}, width=width, height=900) as s:
            s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
            s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
            s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
            s.on(r"^/api/(schedule|attendance)", SJ.handler)
            s.state["invoices"] = B.mk_invoices(); s.state["paychecks"] = B.mk_paychecks()
            s.on(r"^/api/(invoices|paychecks|payment-details)", B.handler)
            for r in routes: sweep(s, f"/v2/management/{r}", f"/v2/management/{r}@{width}")
        for r in ["applications", "pipeline"]:
            with Session(state=PJ.mk_state(), width=width, height=900) as s:
                s.on(r"^/api/", PJ.handler); sweep(s, f"/v2/management/{r}", f"/v2/management/{r} (with data)@{width}")
        for kind, utype, path in [("student", "Student", "/v2/student"), ("teacher", "Teacher", "/v2/teacher"), ("staff", "Staff", "/v2/staff"), ("parent", "Parent", "/v2/parent")]:
            user = {"UserID": {"student": "STU-1", "teacher": "T", "staff": "STF-1", "parent": "PAR-1"}[kind], "UserType": utype, "Name": f"Test {utype}", "UiPreference": "next"}
            with Session(user=user, state={}, width=width, height=900) as s:
                s.on(r"^/api/", P.handler_for(user, kind)); sweep(s, path, f"{path}@{width}")
    print(f"measured {seen['pages']} pages and {seen['forms']} forms (dialogs and sheets) at 1280 and 390 px")
    print("rows with different control heights:", len(bad))
    if seen["forms"] < 30: print("TOO FEW FORMS OPENED: the openers were not found, the check is not covering the forms"); bad.append(("coverage", "forms"))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
