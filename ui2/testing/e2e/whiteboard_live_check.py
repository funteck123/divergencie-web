"""TKT-0443, live site: the whiteboard page against the real production API and storage. Production signs its sessions with a secret this machine does not have, so the
browser sends the Management API key with every whiteboard request instead of a session cookie. The test boards are named 'DC WB live check' and are deleted at the end."""
import json, os, time
from playwright.sync_api import sync_playwright
BASE = os.environ.get("U2_BASE", "https://www.divergencie.co.uk").rstrip("/")
cfg = json.load(open(os.path.expanduser("~/.dcp1/config.json"))); KEY = cfg["token"]
NAME = "DC WB live check"
def main():
    out = {}; made = set()
    with sync_playwright() as pw:
        br = pw.chromium.launch(); ctx = br.new_context(viewport={"width": 1280, "height": 800})
        ctx.add_init_script("localStorage.setItem('dcp1_user', JSON.stringify({UserID:'MGT-LIVECHECK',UserType:'Management',Name:'Live check'}))")
        ctx.route("**/api/wb/**", lambda route: route.continue_(headers={**route.request.headers, "authorization": "Bearer " + KEY}))
        errs = []; p = ctx.new_page(); p.on("pageerror", lambda e: errs.append(str(e)[:200]))
        def api(path, method="GET"):
            return p.evaluate("async ([u, m]) => { const r = await fetch(u, { method: m }); let b = null; try { b = await r.json() } catch (e) {} return [r.status, b] }", [path, method])
        def ready(): p.wait_for_function("typeof ready !== 'undefined' && ready === true", timeout=60000)
        try:
            p.goto(BASE + "/whiteboard.html", wait_until="networkidle"); ready()
            out["title"] = p.title(); out["logo"] = p.locator(".logo").inner_text().replace("\n", " ")
            made.add(p.evaluate("board.id"))
            p.evaluate("tool='pen'"); box = p.locator("#cv").bounding_box()
            p.mouse.move(box["x"] + 300, box["y"] + 250); p.mouse.down()
            for i in range(1, 12): p.mouse.move(box["x"] + 300 + i * 25, box["y"] + 250 + (i % 3) * 20)
            p.mouse.up(); p.fill("#name", NAME); p.keyboard.press("Tab"); p.click("#bSave")
            bid = p.evaluate("board.id"); lst = []
            for _ in range(60):
                lst = api("/api/wb/list")[1]
                if any(e["id"] == bid and e["name"] == NAME and e["n"] >= 1 for e in lst): break
                p.wait_for_timeout(500)
            out["live_server_has_it"] = any(e["id"] == bid and e["name"] == NAME and e["n"] >= 1 for e in lst)
            out["live_get"] = api(f"/api/wb/get?id={bid}")[0]
            p.screenshot(path="snapshots/dc-whiteboard-live.png")
            # a new device: wipe the browser copy, reload: the board comes back from the account
            p.evaluate("async () => { await new Promise(r => { const q = indexedDB.deleteDatabase('dcwhiteboard-' + UID); q.onsuccess = q.onerror = q.onblocked = r }); localStorage.removeItem('wb_last_' + UID) }")
            p.goto(BASE + "/whiteboard.html#" + bid, wait_until="networkidle"); ready()
            out["reopened_from_account"] = [p.evaluate("board.id") == bid, p.input_value("#name"), p.evaluate("objs.length") >= 1]
            # a class session link
            url = BASE + "/whiteboard.html?session=SCH-LIVECHECK&title=Live%20check%20class"
            p.goto(url, wait_until="networkidle"); ready(); sid = p.evaluate("board.id"); made.add(sid)
            out["session"] = [p.input_value("#name"), p.locator("#sess").inner_text()]
            p.click("#bSave")
            for _ in range(40):
                if len(api("/api/wb/list?session=SCH-LIVECHECK")[1]) == 1: break
                p.wait_for_timeout(500)
            out["session_filter"] = [len(api("/api/wb/list?session=SCH-LIVECHECK")[1]), len(api("/api/wb/list?session=SCH-NONE")[1])]
            made.add(bid)
            out["errors"] = errs[:3]
        finally:
            for i in made:
                try: api(f"/api/wb/del?id={i}", "POST")
                except Exception: pass
            left = [e for e in api("/api/wb/list")[1] if e["id"] in made]
            out["test_boards_left_in_list"] = len(left)
            br.close()
    for k, v in out.items(): print(k, v)
    assert out["title"].startswith("DC Whiteboard") and "DivergenCIE" in out["logo"], out
    assert out["live_server_has_it"] and out["live_get"] == 200, out
    assert out["reopened_from_account"] == [True, NAME, True], out
    assert out["session"][0] == "Live check class" and "Live check class" in out["session"][1] and out["session_filter"] == [1, 0], out
    assert out["test_boards_left_in_list"] == 0 and not out["errors"], out
    print("LIVE CHECK OK")
if __name__ == "__main__":
    main()
