import base64, os, re
R = "/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/"
D = os.path.dirname(os.path.abspath(__file__))
real_css = open("/home/funteck/.claude/jobs/88431ec6/tmp/solver_real.css").read()
restyle_css = open(D + "/restyle.css").read()
fonts = {}
for w, f in (("400","satoshi-400"),("700","satoshi-700"),("900","satoshi-900")):
    fonts[w] = base64.b64encode(open(R+"public/fonts/"+f+".woff2","rb").read()).decode()
fontface = "\n".join(
    f'@font-face{{font-family:Satoshi;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b64}) format("woff2")}}'
    for w, b64 in fonts.items()
)

PAGES = [
    ("dom_library.html", "solver-restyle-library.html", "Library picker"),
    ("dom_mode.html", "solver-restyle-mode.html", "Mode choice"),
    ("dom_quiz.html", "solver-restyle-quiz.html", "Quiz, answered"),
    ("dom_results.html", "solver-restyle-results.html", "Results"),
    ("dom_progress.html", "solver-restyle-progress.html", "Progress & leaderboard"),
]
for src, out, title in PAGES:
    body = open("/home/funteck/.claude/jobs/88431ec6/tmp/" + src).read()
    if "progressChart" in body:
        chart_b64 = base64.b64encode(open("/home/funteck/.claude/jobs/88431ec6/tmp/progress_chart.png", "rb").read()).decode()
        body = re.sub(
            r'<canvas id="progressChart"[^>]*>.*?</canvas>',
            f'<img id="progressChart" alt="Score % per attempt, real captured chart" style="width:100%;height:auto;border:1px solid var(--border)" src="data:image/png;base64,{chart_b64}">',
            body, count=1, flags=re.S,
        )
    body = body.replace(
        '<div style="display:flex; gap:0.5rem; align-items:stretch;">',
        '<div class="mistakes-row" style="display:flex; gap:0.5rem; align-items:stretch;">', 1
    )
    # Icons on real actions -- additive only, same href/id/text, no structural change.
    ICONS = {
        'id="showUploadLink"': ('id="showUploadLink"', '<svg class="ic" viewBox="0 0 24 24"><path d="M12 3v12m0-12 4 4m-4-4-4 4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>'),
        'id="showProgressLink"': ('id="showProgressLink"', '<svg class="ic" viewBox="0 0 24 24"><path d="M4 19V9m6 10V5m6 14v-7"/></svg>'),
        'id="timerToggleBtn"': ('id="timerToggleBtn"', '<svg class="ic" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>'),
    }
    import re as _re
    for marker, (attr, svg) in ICONS.items():
        m = _re.search(r'(<a[^>]*' + _re.escape(marker) + r'[^>]*>)', body) or _re.search(r'(<button[^>]*' + _re.escape(marker) + r'[^>]*>)', body)
        if m:
            body = body.replace(m.group(1), m.group(1) + svg, 1)
    body = body.replace('\u2190 Cancel', '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>Cancel')
    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solver restyle — {title}</title>
<style>
{fontface}
{real_css}
{restyle_css}
</style></head>
<body>
<div class="app-bar"><div class="in">
  <span class="mark"><span class="sq"></span>DC Question Solver</span>
  <nav class="nav">
    <a href="#"><svg class="ic" viewBox="0 0 24 24" style="margin-right:6px"><path d="M4 19V9m6 10V5m6 14v-7"/></svg>Progress</a>
  </nav>
</div></div>
<main>{body}</main>
</body></html>"""
    open(D + "/" + out, "w").write(doc)
    print(out, len(doc))
