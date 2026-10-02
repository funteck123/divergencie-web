"""Shared Playwright harness for new-UI journeys. All data is fake: the page's /api calls are answered here,
so a test can never touch real records. Usage: from harness import Session"""
import json, os, re
from playwright.sync_api import sync_playwright

BASE = os.environ.get("U2_BASE", "http://localhost:3111")
MGMT = {"UserID": "MGT-0001", "UserType": "Management", "Name": "Test Admin", "UiPreference": "next"}


class Session:
    def __init__(self, user=None, width=1280, height=800, state=None):
        self.user = user or MGMT
        self.size = {"width": width, "height": height}
        self.state = state if state is not None else {}
        self.calls = []  # (method, path, body)
        self.errors = []
        self.handlers = []  # (regex, fn(method, url, body, state) -> (status, json) | None)

    def on(self, pattern, fn):
        self.handlers.append((re.compile(pattern), fn))

    def __enter__(self):
        self._p = sync_playwright().start()
        self.browser = self._p.chromium.launch()
        ctx = self.browser.new_context(viewport=self.size, permissions=["clipboard-read", "clipboard-write"])
        ctx.add_init_script("localStorage.setItem('dcp1_user', %s)" % json.dumps(json.dumps(self.user)))
        self.page = ctx.new_page()
        self.page.set_default_timeout(30000)
        self.page.on("pageerror", lambda e: self.errors.append(str(e)[:300]))
        self.page.on("console", lambda m: self.errors.append("console:" + m.text[:300]) if m.type == "error" and "favicon" not in m.text else None)
        self.page.route(BASE + "/api/**", self._route)
        return self

    def _route(self, route):
        req = route.request
        path = req.url.split(BASE.split("//")[1], 1)[1] if BASE.split("//")[1] in req.url else req.url
        body = None
        try:
            raw = req.post_data
        except Exception:
            raw = "<binary upload>"  # a multipart file body is not text
        if raw:
            try:
                body = json.loads(raw)
            except Exception:
                body = raw
        if req.method != "GET":
            self.calls.append((req.method, path, body))
        for rx, fn in self.handlers:
            if rx.search(path):
                out = fn(req.method, path, body, self.state)
                if out is not None:
                    status, data = out
                    return route.fulfill(status=status, content_type="application/json", body=json.dumps(data))
        return route.fulfill(status=200, content_type="application/json", body="{}")

    def goto(self, path, wait="networkidle"):
        self.page.goto(BASE + path, wait_until=wait, timeout=180000)

    def hscroll(self):
        return self.page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

    def __exit__(self, *a):
        self.browser.close()
        self._p.stop()
