"""TKT-0443: the DC Whiteboard. Real page, real API, real storage, two disposable test users (their files are removed at the end).
Needs the server's session secret: run with the same environment as the server, e.g.  node --env-file=.env.local to mint the cookies (done here).
Local:  python3 ui2/testing/e2e/whiteboard_journey.py        Live:  U2_BASE=https://www.divergencie.co.uk python3 ...  (cookies must be minted with the live secret: set WB_SECRET_ENV=.env.local.live)"""
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

BASE = os.environ.get("U2_BASE", "http://localhost:3111").rstrip("/")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
STAMP = str(int(time.time()))
USERS = {"A": f"ZZ-WB-A-{STAMP}", "B": f"ZZ-WB-B-{STAMP}"}

def mint(user_id):
    code = f"import {{ sessionCookieFor }} from './lib/session.js'; console.log(sessionCookieFor({{UserID:'{user_id}',UserType:'Student',Name:'WB Test'}}).value)"
    return subprocess.check_output(["node", "--env-file=" + os.path.join(ROOT, os.environ.get("WB_SECRET_ENV", ".env.local")), "--input-type=module", "-e", code], cwd=ROOT, stderr=subprocess.DEVNULL, text=True).strip()

def cleanup():
    code = "import { wipeUserForTests } from './lib/whiteboard/wbStore.js'; for (const u of process.argv.slice(1)) console.log(u, await wipeUserForTests(u))"
    print(subprocess.check_output(["node", "--env-file=" + os.path.join(ROOT, ".env.local"), "--input-type=module", "-e", code, *USERS.values()], cwd=ROOT, stderr=subprocess.DEVNULL, text=True).strip())

def api(page, path, method="GET"):
    return page.evaluate("async ([p, m]) => { const r = await fetch(p, { method: m }); let b = null; try { b = await r.json() } catch (e) {} return [r.status, b] }", [path, method])

def main():
    out = {}
    host = BASE.split("://")[1].split("/")[0].split(":")[0]
    try:
        with sync_playwright() as pw:
            br = pw.chromium.launch()
            def ctx(letter, w=1280, h=800):
                c = br.new_context(viewport={"width": w, "height": h}, has_touch=False)
                c.add_cookies([{"name": "dcp1_session", "value": mint(USERS[letter]), "domain": host, "path": "/"}])
                c.add_init_script("localStorage.setItem('dcp1_user', JSON.stringify({UserID:'%s',UserType:'Student',Name:'WB Test',UiPreference:'next'}))" % USERS[letter])
                return c
            errors = []
            ca = ctx("A"); pa = ca.new_page(); pa.on("pageerror", lambda e: errors.append(str(e)))
            pa.goto(BASE + "/whiteboard.html", wait_until="networkidle"); pa.wait_for_function("typeof ready !== 'undefined' && ready === true", timeout=60000)
            out["title"] = pa.title(); out["brand_text"] = pa.locator(".logo").inner_text().replace("\n", " ")
            body = pa.evaluate("document.body.innerText")
            out["no_old_brand_words"] = not any(w in body for w in ("MSA", "Hub ", "hub"))
            # draw one pen stroke, rename, save now
            pa.evaluate("tool='pen'"); box = pa.locator("#cv").bounding_box()
            pa.mouse.move(box["x"] + 300, box["y"] + 250); pa.mouse.down()
            for i in range(1, 12): pa.mouse.move(box["x"] + 300 + i * 25, box["y"] + 250 + (i % 3) * 20)
            pa.mouse.up()
            pa.fill("#name", "Algebra notes"); pa.keyboard.press("Tab"); pa.click("#bSave")
            bid = pa.evaluate("board.id"); lst = []
            for _ in range(60):   # wait until the SERVER holds the renamed board with its stroke, not just until some save message shows
                lst = api(pa, "/api/wb/list")[1]
                if any(e["name"] == "Algebra notes" and e["n"] >= 1 for e in lst): break
                pa.wait_for_timeout(500)
            out["status_text"] = pa.locator("#st").inner_text(); out["server_list"] = [(e["name"], e["n"] >= 1) for e in lst]
            pa.screenshot(path="snapshots/dc-whiteboard-desktop.png")
            # a new device: the browser's own copy is wiped, so the board must come back from the account
            pa.evaluate("async () => { await new Promise(r => { const q = indexedDB.deleteDatabase('dcwhiteboard-' + UID); q.onsuccess = q.onerror = q.onblocked = r }); localStorage.removeItem('wb_last_' + UID) }")
            pa.goto(BASE + "/whiteboard.html", wait_until="networkidle"); pa.wait_for_function("typeof ready !== 'undefined' && ready === true", timeout=60000)
            out["reopened"] = [pa.evaluate("board.id") == bid, pa.input_value("#name"), pa.evaluate("objs.length") >= 1]
            # a second person sees none of it
            cb = ctx("B"); pb = cb.new_page(); pb.on("pageerror", lambda e: errors.append(str(e)))
            pb.goto(BASE + "/whiteboard.html", wait_until="networkidle"); pb.wait_for_function("typeof ready !== 'undefined' && ready === true", timeout=60000)
            out["B_list_names"] = [e["name"] for e in api(pb, "/api/wb/list")[1]]
            out["B_get_A_board"] = api(pb, f"/api/wb/get?id={bid}")[0]
            out["B_board_is_new"] = pb.evaluate("board.id") != bid
            out["B_sees_A_name"] = pb.input_value("#name") == "Algebra notes"
            out["anonymous_api"] = br.new_context().new_page().request.get(BASE + "/api/wb/list").status if False else br.new_context().request.get(BASE + "/api/wb/list").status
            # a board linked to a class session: opens by the link, named from it, found again by the same link
            ps = ca.new_page(); ps.on("pageerror", lambda e: errors.append(str(e)))
            url = BASE + "/whiteboard.html?session=SCH-TEST&title=Maths%20class"
            ps.goto(url, wait_until="networkidle"); ps.wait_for_function("typeof ready !== 'undefined' && ready === true", timeout=60000)
            sid = ps.evaluate("board.id"); out["session_board_name"] = ps.input_value("#name"); out["session_chip"] = ps.locator("#sess").inner_text()
            ps.click("#bSave"); ps.wait_for_function("document.getElementById('st').textContent.includes('Saved to your account')", timeout=30000)
            ps.goto(url, wait_until="networkidle"); ps.wait_for_function("typeof ready !== 'undefined' && ready === true", timeout=60000)
            out["session_reopens_same"] = ps.evaluate("board.id") == sid
            out["session_filter"] = [len(api(ps, "/api/wb/list?session=SCH-TEST")[1]), len(api(ps, "/api/wb/list?session=SCH-OTHER")[1]), len(api(ps, "/api/wb/list")[1])]
            # phone
            cp = ctx("A", 390, 844); pp = cp.new_page(); pp.goto(BASE + "/whiteboard.html", wait_until="networkidle"); pp.wait_for_function("typeof ready !== 'undefined' && ready === true", timeout=60000)
            pp.screenshot(path="snapshots/dc-whiteboard-phone.png")
            out["errors"] = errors[:3]
            br.close()
    finally:
        out["cleanup"] = None
        try: cleanup()
        except Exception as e: print("cleanup problem:", e)
    for k, v in out.items(): print(k, v)
    assert out["title"].startswith("DC Whiteboard") and "DivergenCIE" in out["brand_text"] and out["no_old_brand_words"], out
    assert out["server_list"] == [("Algebra notes", True)] and "Saved to your account" in out["status_text"], out
    assert out["reopened"] == [True, "Algebra notes", True], out
    assert out["B_list_names"] != ["Algebra notes"] and "Algebra notes" not in out["B_list_names"] and out["B_get_A_board"] == 404 and out["B_board_is_new"] and not out["B_sees_A_name"], out
    assert out["anonymous_api"] == 401, out
    assert out["session_board_name"] == "Maths class" and "Maths class" in out["session_chip"] and out["session_reopens_same"] and out["session_filter"] == [1, 0, 2], out
    assert not out["errors"], out
    print("JOURNEY OK")

if __name__ == "__main__":
    main()
