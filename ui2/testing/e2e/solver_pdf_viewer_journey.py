import http.server, json, os, re, socketserver, sys, threading
from playwright.sync_api import sync_playwright

# TKT-0426: View notes opens our own viewer (not a bare tab); pages are drawn, the counter and zoom work, and the Download button inside it saves the file.
# Fake student, fake library, a real 30-page PDF made on the spot; the page's /api calls are answered here, nothing real is touched.
BASE = os.environ.get("U2_BASE", "http://localhost:3111")
def make_pdf(pages=30):
    import fitz
    d = fitz.open()
    for i in range(pages):
        p = d.new_page(); p.insert_text((72, 120), f"Fake ZNotes page {i + 1}", fontsize=28)
    return d.tobytes()
PDF = make_pdf()
STU = {"UserID": "STU-1", "UserType": "Student", "Name": "Test Student", "UiPreference": "next"}
COMP = "ZNotes: Theory"
PAPER = {"board": "IGCSE", "subject": "Physics", "component": COMP, "year": 2024, "session": "Notes", "paperId": "znotes_physics_theory", "title": "ZNotes -- Physics Theory"}
# The PDF comes from a tiny real server over a real connection, answered the way our server answers (inline, not attachment): a reply made up by the
# test tool itself would not behave like a real download.
class PdfServer(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.send_header("Content-Type", "application/pdf"); self.send_header("Content-Disposition", 'inline; filename="server-name.pdf"'); self.send_header("Content-Length", str(len(PDF))); self.end_headers(); self.wfile.write(PDF)
    def log_message(self, *a): pass
_srv = socketserver.TCPServer(("127.0.0.1", 0), PdfServer); PDF_PORT = _srv.server_address[1]; threading.Thread(target=_srv.serve_forever, daemon=True).start()
def handle(route):
    u = route.request.url; path = u.split(BASE.split("//")[1], 1)[1]
    if path.startswith("/api/mcq/yearly-pdf"):
        return route.continue_(url=f"http://127.0.0.1:{PDF_PORT}/pdf")
    body = {}
    if path.startswith("/api/mcq/library"): body = {"IGCSE": {"Physics": {COMP: []}}}
    elif path.startswith("/api/mcq/yearly-library"): body = {"IGCSE": {"Physics": {COMP: [PAPER]}}}
    elif path.startswith("/api/mcq/subject-meta"): body = {"IGCSE": {"Physics": {}}}
    elif path.startswith("/api/mcq/paper-titles"): body = {"titles": {}, "subjects": {}}
    return route.fulfill(status=200, content_type="application/json", body=json.dumps(body))
def check(label, ctx_args):
    with sync_playwright() as pw:
        b = pw.chromium.launch(); ctx = b.new_context(accept_downloads=True, **ctx_args)
        ctx.route(re.compile(r"https?://[^/]*sentry\.io/.*"), lambda r: r.abort())
        ctx.add_init_script("localStorage.setItem('dcp1_user', %s)" % json.dumps(json.dumps(STU)))
        page = ctx.new_page(); page.set_default_timeout(90000); errs = []; popups = []
        page.on("pageerror", lambda e: errs.append(str(e)[:200])); ctx.on("page", lambda p: popups.append(p.url))
        page.route(BASE + "/api/**", handle)
        page.goto(BASE + "/v2/question-solver", wait_until="networkidle", timeout=240000)
        page.get_by_label("Board").click(); page.get_by_role("option", name="IGCSE").click()
        page.get_by_label("Subject").click(); page.get_by_role("option", name="Physics").click()
        page.get_by_label("Component").click(); page.get_by_role("option", name=COMP).click()
        page.get_by_role("button", name=re.compile("View notes")).click()
        dlg = page.get_by_role("dialog"); dlg.wait_for(timeout=30000)
        page.get_by_text(re.compile(r"Page 1 of 30")).wait_for(timeout=90000)
        page.wait_for_function("document.querySelector('.u2-pdfv__page canvas') && document.querySelector('.u2-pdfv__page canvas').width > 0", timeout=60000)
        out = {"title": dlg.get_by_role("heading").first.inner_text(), "counter": page.get_by_role("status").filter(has_text="Page").first.inner_text()}
        painted = page.evaluate("[...document.querySelectorAll('.u2-pdfv__page canvas')].filter(c => c.width > 0).length")
        out["canvases_drawn_of_30"] = painted
        assert 1 <= painted <= 12, "should draw only the pages near the screen, not all 30: %s" % painted
        z0 = page.locator(".u2-pdfv__zoom").inner_text()
        page.get_by_role("button", name="Zoom in").click(); page.wait_for_timeout(500); z1 = page.locator(".u2-pdfv__zoom").inner_text()
        out["zoom"] = f"{z0} -> {z1}"; assert z0 != z1
        page.get_by_label("Go to page").fill("20"); page.get_by_role("button", name="Go", exact=True).click(); page.wait_for_timeout(1500)
        out["counter_after_goto_20"] = page.get_by_text(re.compile(r"Page \d+ of 30")).first.inner_text()
        assert "Page 20" in out["counter_after_goto_20"] or "Page 19" in out["counter_after_goto_20"] or "Page 18" in out["counter_after_goto_20"], out
        link = dlg.get_by_role("link", name=re.compile("Download"))
        saved = []
        page.on("download", lambda d: saved.append(d))
        link.click()
        for _ in range(40):
            if saved: break
            page.wait_for_timeout(500)
        assert saved, "clicking Download in the viewer did not save a file"
        d = saved[0]
        # The test tool redirects the PDF request to its own little server, which makes it cancel the saved copy, so the bytes are checked by fetching the same link
        # (the saved-file bytes are proven by phone_download_proof.py against a real server). What this checks: the click really starts a download, with the right name.
        data = bytes(page.evaluate("fetch(document.querySelector('.u2-pdfv a[download]').href).then(r => r.arrayBuffer()).then(b => Array.from(new Uint8Array(b)))"))
        out.update({"saved_as": d.suggested_filename, "is_pdf": data[:5] == b"%PDF-", "same_bytes": data == PDF})
        vw = page.viewport_size["width"]; box = dlg.bounding_box()
        out["viewer_fills_width"] = abs(box["width"] - vw) <= 2
        out["new_tabs_opened"] = len(popups); out["errors"] = errs[:2]
        page.keyboard.press("Escape"); page.wait_for_timeout(400); out["closed_with_Escape"] = page.get_by_role("dialog").count() == 0
        page.screenshot(path=f"/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/data/ops-work/znotes/viewer_{label.split()[0]}.png")
        b.close(); return out
def main():
    with sync_playwright() as pw: pixel = pw.devices["Pixel 7"]
    for label, args in (("phone (Pixel 7)", pixel), ("desktop 1280", {"viewport": {"width": 1280, "height": 800}})):
        o = check(label, args); print(label, json.dumps(o))
        assert o["saved_as"] == "ZNotes -- Physics Theory.pdf", o
        assert o["is_pdf"] and o["same_bytes"], o
        assert o["new_tabs_opened"] == 0, "View notes must not open a new tab: %s" % o
        assert o["viewer_fills_width"] and o["closed_with_Escape"], o
        assert not o["errors"], o
    print("JOURNEY OK")
if __name__ == "__main__":
    main()
