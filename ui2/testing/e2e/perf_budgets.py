"""Measures the budgets of planning/new-ui-migration-plan.md 4.4 that a browser can check with fake data on a local production server:
1,000-row Accounts (filter, sort, scroll), JS per route (gzipped), layout shift, quiz next-question. Run on `next start`, not `next dev`.
Writes planning/perf/budgets-<date>.md. Timings come from the page itself (event to second animation frame), not from Playwright's own waits."""
import gzip, json, os, sys, datetime
sys.path.insert(0, os.path.dirname(__file__))
from harness import Session, BASE, MGMT
from accounts_journey import mk_users, users_handler

IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
TIMED = """async (act) => { const t0 = performance.now(); act(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; }"""

def js_kb(s, path):
    sizes = {}
    def on_resp(r):
        if r.url.endswith(".js") or ".js?" in r.url:
            try: sizes[r.url] = len(gzip.compress(r.body()))
            except Exception: pass
    s.page.on("response", on_resp)
    s.goto(path)
    s.page.remove_listener("response", on_resp)
    return round(sum(sizes.values()) / 1024)

def main():
    rows = []
    users = mk_users()
    base = [u for u in users if u["UserType"] == "Student"]
    for i in range(240, 1000):
        u = dict(base[i % 240]); u["UserID"] = f"STU-{1000 + i}"; u["Name"] = f"{u['Name']} {i}"; u["Username"] = f"stu{i}"; users.append(u)
    with Session(state={"users": users}) as s:
        s.on(r"^/api/users", users_handler)
        s.page.add_init_script("window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });")
        kb = js_kb(s, "/v2/management/accounts")
        s.page.get_by_role("table").wait_for(timeout=60000)
        n = s.page.locator("tbody tr").count()
        s.page.wait_for_timeout(500)
        total = s.page.locator("table.u2-table").get_attribute("aria-rowcount")
        rows.append(("Accounts rows: in the page / in the table", f"{n} / {int(total) - 1 if total else n}", "all 1,000 reachable (windowed)", total == "1001"))
        rows.append(("JS for the Accounts route (gzip)", f"{kb} KB", "under 170 KB", kb < 170))
        rows.append(("Layout shift (Accounts load)", f"{s.page.evaluate('window.__cls'):.3f}", "under 0.05", s.page.evaluate("window.__cls") < 0.05))
        search = s.page.get_by_role("searchbox").first
        search.focus()
        t = s.page.evaluate("""async () => { const el = document.activeElement; const first = () => document.querySelector('tbody tr[data-row-id]')?.getAttribute('data-row-id'); const before = first(); const t0 = performance.now(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Zara'); el.dispatchEvent(new Event('input', { bubbles: true })); while (first() === before && performance.now() - t0 < 3000) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; }""")
        left = s.page.locator("tbody tr[data-row-id]").count()
        rows.append(("Filter 1,000 rows (type 'Zara')", f"{t:.0f} ms (first row changed; {left} rows on the page)", "under 100 ms", t < 100))
        search.fill("")
        s.page.wait_for_timeout(300)
        hdr = s.page.locator("thead button").nth(1)
        t = s.page.evaluate("""async () => { const first = () => document.querySelector('tbody tr[data-row-id]')?.getAttribute('data-row-id'); const before = first(); const t0 = performance.now(); document.querySelectorAll('thead button')[1].click(); while (first() === before && performance.now() - t0 < 3000) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; }""")
        rows.append(("Sort 1,000 rows (click a header)", f"{t:.0f} ms", "under 100 ms", t < 100))
        fps = s.page.evaluate("""async () => { const h = document.documentElement.scrollHeight - innerHeight; let frames = 0, y = 0; const t0 = performance.now(); await new Promise(res => { function step() { frames++; y += h / 60; window.scrollTo(0, y); if (performance.now() - t0 < 1000) requestAnimationFrame(step); else res(); } requestAnimationFrame(step); }); return frames / ((performance.now() - t0) / 1000); }""")
        rows.append(("Scroll 1,000 rows", f"{fps:.0f} fps", "60 fps", fps >= 55))
    stu = {"UserID": "STU-1", "UserType": "Student", "Name": "Sam", "UiPreference": "next"}
    me = {"user": {**stu, "Timezone": "Asia/Kolkata"}, "enrollments": [], "services": [], "scheduleItems": [], "attendanceItems": [], "rescheduleRequests": [], "invoices": [], "guides": []}
    for path in ["/v2/student", "/v2/question-solver", "/v2/syllabus"]:
        with Session(user=stu, state={}) as s:
            s.on(r"^/api/me", lambda m, p, b, st: (200, me))
            kb = js_kb(s, path)
            rows.append((f"JS for {path} (gzip)", f"{kb} KB", "under 170 KB", kb < 170))
    library = {"CIE": {"Physics": {"Paper 2 MCQ": [{"qpId": "qp1", "msId": "ms1", "title": "1 Motion Q"}]}}}
    qs = [{"questionNumber": str(i), "image": IMG, "optionLetters": list("ABCD"), "correctAnswer": "A"} for i in range(1, 41)]
    def h(m, p, b, st):
        if p.startswith("/api/mcq/library"): return 200, library
        if p.startswith("/api/mcq/fetch-and-digitize"): return 200, {"questions": qs}
    with Session(user=stu, state={}) as s:
        s.page.on("dialog", lambda d: d.accept())
        s.on(r"^/api/mcq", h)
        s.goto("/v2/question-solver")
        import re
        s.page.get_by_role("button", name=re.compile("Digitize|Fetch|Load|Start", re.I)).first.click()
        s.page.get_by_role("button", name="Test Mode").click()
        s.page.get_by_role("button", name="Next →").wait_for()
        ts = []
        for _ in range(8):
            ts.append(s.page.evaluate("""async () => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Next')); const t0 = performance.now(); b.click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; }"""))
        rows.append(("Quiz: next question (40 questions)", f"{sorted(ts)[len(ts)//2]:.0f} ms median, {max(ts):.0f} ms worst", "under 50 ms, no network wait", max(ts) < 50))
    day = datetime.date.today().isoformat()
    md = f"# Performance budgets, measured {day}\n\nProduction build (`next start`) on a shared development machine under load, headless Chromium, fake API data, so network time is zero. Numbers describe the front end only. Cold section loads on the real API are in `baseline-2026-10-02.md`.\n\n| Check | Measured | Budget | Result |\n|---|---|---|---|\n"
    md += "\n".join(f"| {a} | {b} | {c} | {'pass' if ok else '**MISSED**'} |" for a, b, c, ok in rows) + "\n"
    out = os.path.join(os.path.dirname(__file__), f"../../../planning/perf/budgets-{day}.md")
    open(out, "w").write(md)
    print(md)

if __name__ == "__main__":
    main()
