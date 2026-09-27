# App-first library screen (supersedes the sticky-top-bar "app-shell" pass,
# which still read as a website/dashboard). Direct reference: user's own
# screenshots of Grab, YouTube, Spotify -- every one of them uses a bottom
# tab bar, edge-to-edge content, pill category chips, and tap-a-tile-to-open
# browsing instead of a stacked form with a submit button. This changes the
# picker's structure (not just its skin) -- flagged explicitly, see report.
# Real content only: real board/subject/component lists, real paper titles
# for Physics MCQ topical worksheets (41 real worksheets).
import base64, json, html, re, os
R = "/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/"
D = os.path.dirname(os.path.abspath(__file__))
e = html.escape
fonts = {}
for w, f in (("400","satoshi-400"),("700","satoshi-700"),("900","satoshi-900")):
    fonts[w] = base64.b64encode(open(R+"public/fonts/"+f+".woff2","rb").read()).decode()
fontface = "\n".join(
    f'@font-face{{font-family:Satoshi;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b}) format("woff2")}}'
    for w, b in fonts.items()
)
lib = json.load(open("/home/funteck/.claude/jobs/88431ec6/tmp/lib.json"))
papers = lib["IGCSE"]["Physics"]["Paper 2: Multiple Choice (Extended)"]
def short(t):
    return re.sub(r"^CAIE IGCSE Physics ", "", t).replace(" (MCQ)", "")

SUBJECTS = ["Physics", "Chemistry", "Biology", "Mathematics", "ICT", "Economics", "Computer Science"]
COMPONENTS = ["MCQ", "Theory", "Practical", "Znotes"]

subj_chips = "".join(f'<button class="chip{" sel" if s=="Physics" else ""}">{e(s)}</button>' for s in SUBJECTS)
comp_chips = "".join(f'<button class="chip small{" sel" if c=="MCQ" else ""}">{e(c)}</button>' for c in COMPONENTS)

def tile(p, i):
    colors = ["#1a3c5e","#e8a832","#4a9fd4","#e05a4e","#5c5248"]
    c = colors[i % len(colors)]
    title = short(p["title"])
    return f'''<a class="row" href="#">
      <span class="art" style="background:{c}">{e(title[:2].upper())}</span>
      <span class="mid"><span class="t">{e(title)}</span><span class="m">Topical worksheet · MCQ</span></span>
      <svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
    </a>'''

rows = "".join(tile(p, i) for i, p in enumerate(papers))

doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solver — app-first library</title>
<style>
{fontface}
:root{{--navy:#1a3c5e;--gold:#e8a832;--sky:#4a9fd4;--coral:#e05a4e;--charcoal:#5c5248;--bg:#0e1116;--panel:#171b22;--line:#242a33;--muted:#8b94a3;--ink:#f3f5f8}}
*{{box-sizing:border-box}} html,body{{margin:0}}
body{{background:var(--bg);color:var(--ink);font:400 15px/1.5 Satoshi,-apple-system,sans-serif;min-height:100vh;padding-bottom:78px}}
.topbar{{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 6px}}
.topbar .greet{{font-size:22px;font-weight:900}}
.topbar .avatar{{width:36px;height:36px;border-radius:999px;background:linear-gradient(135deg,var(--gold),var(--coral));display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:#1a1200}}
.search{{margin:10px 16px 18px;display:flex;align-items:center;gap:10px;background:var(--panel);border-radius:999px;padding:12px 16px;color:var(--muted)}}
.search svg{{width:17px;height:17px;stroke:var(--muted);fill:none;stroke-width:2}}
.chiprow{{display:flex;gap:8px;overflow-x:auto;padding:0 16px 14px;scrollbar-width:none}}
.chiprow::-webkit-scrollbar{{display:none}}
.chip{{flex:none;background:var(--panel);color:var(--ink);border:0;border-radius:999px;padding:9px 16px;font:700 13px Satoshi;white-space:nowrap}}
.chip.small{{padding:7px 13px;font-size:12px;color:var(--muted)}}
.chip.sel{{background:var(--gold);color:#1a1200}}
.chip.small.sel{{background:var(--navy);color:#fff}}
section{{padding:6px 16px 22px}}
section h2{{font-size:17px;font-weight:900;margin:4px 0 12px;letter-spacing:-.01em}}
section h2 span{{color:var(--muted);font-weight:700;font-size:13px;float:right}}
.rows{{display:flex;flex-direction:column;gap:2px}}
.row{{display:flex;align-items:center;gap:14px;padding:10px 10px;border-radius:12px;text-decoration:none;color:inherit}}
.row:active,.row:hover{{background:var(--panel)}}
.art{{width:46px;height:46px;flex:none;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:15px}}
.mid{{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}}
.mid .t{{font-weight:700;font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.mid .m{{font-size:12px;color:var(--muted)}}
.chev{{width:16px;height:16px;stroke:var(--muted);fill:none;stroke-width:2.4;flex:none}}
.tabbar{{position:fixed;left:0;right:0;bottom:0;background:rgba(14,17,22,.92);backdrop-filter:blur(14px);border-top:1px solid var(--line);display:flex;padding:10px 6px calc(10px + env(safe-area-inset-bottom))}}
.tab{{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--muted);font:700 10.5px Satoshi;text-transform:uppercase;letter-spacing:.04em}}
.tab.active{{color:var(--gold)}}
.tab svg{{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2}}
.tab.active svg{{fill:currentColor;stroke:none}}
</style></head>
<body>
<div class="topbar"><span class="greet">Library</span><span class="avatar">A</span></div>
<div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>Search a paper or subject</div>
<div class="chiprow">{subj_chips}</div>
<div class="chiprow">{comp_chips}</div>
<section>
  <h2>Physics · MCQ <span>{len(papers)} worksheets</span></h2>
  <div class="rows">{rows}</div>
</section>
<nav class="tabbar">
  <a class="tab active" href="#"><svg viewBox="0 0 24 24"><path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>Library</a>
  <a class="tab" href="#"><svg viewBox="0 0 24 24"><path d="M4 19V9m6 10V5m6 14v-7"/></svg>Progress</a>
  <a class="tab" href="#"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>Mistakes</a>
  <a class="tab" href="#"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>Account</a>
</nav>
</body></html>"""
open(D + "/library-app.html", "w").write(doc)
print(len(doc))
