import base64, os
R = "/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/"
D = os.path.dirname(os.path.abspath(__file__))
real_css = open("/home/funteck/.claude/jobs/88431ec6/tmp/solver_real.css").read()
restyle_css = open(D + "/restyle.css").read()
options_css = open(D + "/card-options.css").read()
fonts = {}
for w, f in (("400","satoshi-400"),("700","satoshi-700"),("900","satoshi-900")):
    fonts[w] = base64.b64encode(open(R+"public/fonts/"+f+".woff2","rb").read()).decode()
fontface = "\n".join(
    f'@font-face{{font-family:Satoshi;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b64}) format("woff2")}}'
    for w, b64 in fonts.items()
)
body_real = open("/home/funteck/.claude/jobs/88431ec6/tmp/dom_library.html").read()
body_real = body_real.replace(
    '<div style="display:flex; gap:0.5rem; align-items:stretch;">',
    '<div class="mistakes-row" style="display:flex; gap:0.5rem; align-items:stretch;">', 1
)

OPTS = [
 ("A", "No box", "Content sits directly on the page, separated by a navy rule above the heading."),
 ("B", "White page", "The page itself turns white, so there is no grey-vs-white square to see."),
 ("C", "Tinted panel", "Card fills with the brand's own Light Blue tint instead of white."),
 ("D", "Outline only", "No fill at all -- a navy outline, page shows through."),
 ("E", "Shadow, no border", "White fill kept, border dropped for a soft shadow instead."),
]
sections = ""
for letter, title, sub in OPTS:
    sections += f'''<div class="opt-block opt{letter}">
      <p class="opt-lab">{letter} — {title}</p>
      <p class="opt-sub">{sub}</p>
      {body_real}
    </div>'''

doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solver — card surface options</title>
<style>
{fontface}
{real_css}
{restyle_css}
{options_css}
main{{max-width:820px}}
</style></head>
<body>
<header><div><span class="badge">Restyled</span><h1>DC Question Solver</h1></div></header>
<main>{sections}</main>
</body></html>"""
open(D + "/card-surface-options.html", "w").write(doc)
print(len(doc))
