import base64, os
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
]
for src, out, title in PAGES:
    body = open("/home/funteck/.claude/jobs/88431ec6/tmp/" + src).read()
    body = body.replace(
        '<div style="display:flex; gap:0.5rem; align-items:stretch;">',
        '<div class="mistakes-row" style="display:flex; gap:0.5rem; align-items:stretch;">', 1
    )
    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solver restyle — {title}</title>
<style>
{fontface}
{real_css}
{restyle_css}
</style></head>
<body>
<header><div><span class="badge">Restyled</span><h1>DC Question Solver</h1></div></header>
<main>{body}</main>
</body></html>"""
    open(D + "/" + out, "w").write(doc)
    print(out, len(doc))
