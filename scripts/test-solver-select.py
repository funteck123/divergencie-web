# Regression for the Question Solver dropdown on a phone: the list must survive the keyboard-sized resize and the option must change.
# Serve public/ first: (cd public && python3 -m http.server 8081) ; then python3 scripts/test-solver-select.py
import json, sys
from playwright.sync_api import sync_playwright
LIB={"Cambridge":{"Physics":{"Paper 1":[{"qpId":"q1","msId":"m1","title":"Ch1 Motion (MCQ) Worksheet 1"}]},"Chemistry":{"Paper 1":[{"qpId":"q2","msId":"m2","title":"Ch1 Atoms (MCQ) Worksheet 1"}]},"Maths":{"Paper 1":[]}}}
def h(route):
    u=route.request.url
    body={"library":LIB}["library"] if u.endswith("/api/mcq/library") else {}
    route.fulfill(status=200,content_type="application/json",body=json.dumps(body))
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":390,"height":800},has_touch=True,is_mobile=True)
    pg=ctx.new_page(); pg.route("**/api/mcq/**",h)
    pg.goto("http://localhost:8081/mcq-digitizer/index.html?account=A1&name=Sam"); pg.wait_for_selector("#libraryPicker",state="visible")
    trig=pg.locator(".ss-trigger").nth(1)   # Subject
    trig.tap(); pg.wait_for_selector(".ss-panel")
    print("panel open after tap:", pg.locator(".ss-panel").count())
    pg.set_viewport_size({"width":390,"height":420})   # what the soft keyboard does
    pg.wait_for_timeout(300)
    print("panel open after keyboard-sized resize:", pg.locator(".ss-panel").count())
    if pg.locator(".ss-panel").count():
        pg.locator(".ss-opt", has_text="Chemistry").tap(); pg.wait_for_timeout(200)
    print("subject now:", pg.evaluate("document.getElementById('pickSubject').value"))
    b.close()
