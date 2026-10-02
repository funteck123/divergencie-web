"""Shared Playwright harness for new-UI journeys. All data is fake: the page's /api calls are answered here,
so a test can never touch real records. Usage: from harness import Session"""
import json, os, re
from playwright.sync_api import sync_playwright

BASE = os.environ.get("U2_BASE", "http://localhost:3111")
# U2_WIDTH overrides a journey's viewport width. U2_AXE=<file> appends accessibility violations (axe-core, WCAG 2.x A and AA) to that file.
AXE_OUT = os.environ.get("U2_AXE")
AXE_SRC = os.path.join(os.path.dirname(__file__), "../../../node_modules/axe-core/axe.min.js")
MGMT = {"UserID": "MGT-0001", "UserType": "Management", "Name": "Test Admin", "UiPreference": "next"}


class Session:
    def __init__(self, user=None, width=1280, height=800, state=None, anon=False):
        self.anon = anon
        self.user = user or MGMT
        self.size = {"width": int(os.environ.get("U2_WIDTH", width)), "height": height}
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
        if not self.anon:
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
        self.axe("load")

    def axe(self, when):
        """Scan the page as it is now. Does nothing unless U2_AXE is set; never fails a journey."""
        if not AXE_OUT:
            return
        try:
            if self.page.locator('[data-sonner-toast]').count():
                self.page.wait_for_timeout(800)  # a toast fading in has blended colours: scan it once settled
            self.page.evaluate(open(AXE_SRC).read())
            res = self.page.evaluate("async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length, target: v.nodes[0].target.join(' '), html: v.nodes[0].html.slice(0, 160) }))")
            with open(AXE_OUT, "a") as f:
                for v in res:
                    f.write(json.dumps({**v, "when": when, "url": self.page.url.replace(BASE, ""), "width": self.size["width"], "hscroll": self.hscroll()}) + "\n")
            if self.hscroll() > 0:
                with open(AXE_OUT, "a") as f:
                    f.write(json.dumps({"id": "hscroll", "impact": "none", "help": "page scrolls sideways", "count": 0, "when": when, "url": self.page.url.replace(BASE, ""), "width": self.size["width"], "hscroll": self.hscroll(), "culprits": self.overflow_culprits()}) + "\n")
        except Exception as e:  # a page that navigated away mid-scan is not a finding
            with open(AXE_OUT, "a") as f:
                f.write(json.dumps({"id": "scan-failed", "impact": "none", "help": str(e)[:120], "count": 0, "when": when, "url": self.page.url.replace(BASE, ""), "width": self.size["width"]}) + "\n")

    def overflow_culprits(self, limit=4):
        """The widest elements poking out past the right edge: where a sideways scroll comes from."""
        return self.page.evaluate("""(limit) => {
          const w = document.documentElement.clientWidth, out = [];
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > w + 1) {
              let inScroller = false;
              for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { inScroller = true; break; } }
              if (!inScroller) out.push({ sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''), right: Math.round(r.right), width: Math.round(r.width) });
            }
          }
          // Which element forces the width? The ones whose removal shrinks the page (hide each in turn).
          const base = document.documentElement.scrollWidth, chain = [];
          for (const el of document.querySelectorAll('body *')) {
            const d = el.style.display; el.style.display = 'none';
            if (document.documentElement.scrollWidth < base) { const c = getComputedStyle(el.parentElement); chain.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ').slice(0, 2).join('.') + ' in ' + el.parentElement.tagName.toLowerCase() + ' ' + c.display); }
            el.style.display = d;
            if (chain.length > 7) break;
          }
          return [chain.slice(0, 9), ...out.sort((a, b) => b.right - a.right).slice(0, limit)];
        }""", limit)

    def hscroll(self):
        return self.page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

    def __exit__(self, *a):
        if a[0] is None:
            self.axe("end")
        self.browser.close()
        self._p.stop()
