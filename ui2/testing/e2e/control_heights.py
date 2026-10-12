"""Finds rows where buttons, selects and inputs that sit side by side have different heights (TKT-0335). Exits non-zero if any are found."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session
import accounts_journey as A, services_journey as SV, schedule_journey as SJ, billing_journey as B

JS = """() => {
  const out = [];
  const ctl = (e) => e.matches('button, a[class*=btn], select, .u2-seg, .u2-search, input:not([type=checkbox]):not([type=radio]):not([type=file]), [role=combobox]') && !e.closest('table, .u2-cards, .u2-tl, .u2-cal, .u2-week, .u2-qstrip, .u2-tag, .u2-letters') && e.getBoundingClientRect().height > 0;
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

def main():
    bad = []
    with Session(state={"users": A.mk_users(), "services": SV.mk_services(), "items": SJ.mk_items(), "att": [], "requests": [], "enrollments": [{"EnrolmentID": "E1", "UserID": "STU-1001", "ServiceID": "SVC-1"}]}) as s:
        s.on(r"^/api/users", lambda m, p, b, st: (200, {"users": st["users"]}) if m == "GET" else None)
        s.on(r"^/api/services", lambda m, p, b, st: (200, {"services": st["services"]}) if m == "GET" else None)
        s.on(r"^/api/enrollments", lambda m, p, b, st: (200, {"enrollments": st["enrollments"]}) if m == "GET" else None)
        s.on(r"^/api/(schedule|attendance)", SJ.handler)
        for path in ["/v2/management/accounts", "/v2/management/services", "/v2/management/schedule", "/v2/management/schedule?view=timeline", "/v2/management/tickets"]:
            s.goto(path); s.page.wait_for_timeout(900)
            for r in s.page.evaluate(JS): bad.append((path, *r)); print(path, r)
    print("mismatched rows:", len(bad))
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
