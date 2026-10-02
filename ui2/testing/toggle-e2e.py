import json,os
from playwright.sync_api import sync_playwright
user={"UserID":"MGT-0001","UserType":"Management","Name":"Admin"}
sent=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":800})
    ctx.add_init_script("if(!localStorage.getItem('dcp1_user'))localStorage.setItem('dcp1_user', %s)"%json.dumps(json.dumps(user)))
    page=ctx.new_page(); page.set_default_timeout(30000); errs=[]
    page.on("pageerror",lambda e:errs.append(str(e)[:200]))
    UNION={k:[] for k in ["users","services","enrollments","scheduleItems","slots","invoices","paychecks","tickets","regForms","leads","guides","auditlog","options"]}
    def handle(route):
        r=route.request
        if "ui-preference" in r.url:
            sent.append((r.method,json.loads(r.post_data or "{}"))); return route.fulfill(status=200,content_type="application/json",body="{}")
        if r.method!="GET": return route.fulfill(status=200,content_type="application/json",body="{}")
        return route.fulfill(status=200,content_type="application/json",body=json.dumps(UNION))
    page.route("**/api/**",handle)
    page.goto("http://localhost:3111/dashboard/management",wait_until="domcontentloaded",timeout=120000)
    btn=page.get_by_role("button",name="New UI (Beta)"); btn.wait_for(timeout=60000)
    print("classic shows switch:",btn.count())
    btn.click(); page.wait_for_url("**/v2",timeout=60000)
    page.get_by_role("heading",name="New UI").wait_for()
    print("on /v2:",page.url, "pref stored:",json.loads(page.evaluate("localStorage.getItem('dcp1_user')")).get("UiPreference"))
    bar=page.locator("header").first.bounding_box(); print("bar height",bar["height"])
    page.screenshot(path="snapshots/v2-home.png")
    page.goto("http://localhost:3111/v2/system",wait_until="domcontentloaded"); page.get_by_role("heading",name="Component gallery").wait_for(timeout=60000)
    page.screenshot(path="snapshots/v2-gallery.png",full_page=True)
    page.goto("http://localhost:3111/v2",wait_until="domcontentloaded")
    page.get_by_role("button",name="Classic UI").click(); page.wait_for_url("**/dashboard/management",timeout=60000)
    print("back on classic:",page.url,"pref:",json.loads(page.evaluate("localStorage.getItem('dcp1_user')")).get("UiPreference"))
    print("PATCHes:",sent); print("errors:",errs[:3]); b.close()
