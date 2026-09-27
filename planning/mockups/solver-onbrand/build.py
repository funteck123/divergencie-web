# On-brand Solver concepts (superseding persona-C/D, which used unbranded
# palettes/fonts -- rejected). Both reuse the EXACT homepage design system
# (Satoshi, navy #1a3c5e / gold #e8a832 / sky #4a9fd4 / coral #e05a4e, sharp
# corners, uppercase headings, gold eyebrow labels) already verified against
# the live homepage in the earlier full Solver mock, plus the brand doc's
# exact hex values (BDG-v1.0) -- not new colours/fonts. They differ only in
# picker mechanism: F = search-first (fewest keystrokes for a returning
# student), G = guided tile reveal (one card, no page change, for a first
# visit). Real content: same live-graded Q4 answer as every earlier mock.
import json, html
base_css = open("/home/funteck/.claude/jobs/88431ec6/tmp/homepage_style.css").read()  # includes <style>...</style>, fonts embedded
d = json.load(open("/home/funteck/.claude/jobs/88431ec6/tmp/solver_persona_data.json"))
e = html.escape
grade = d["grade"]
pips = "".join(f'<i class="{"" if m["awarded"] else "lost"}" title="{e(m["markLabel"])}"></i>' for m in grade["markBreakdown"])

def mk_row(m):
    need = m.get("whatWasNeeded") or ""
    need_html = f'<div class="need"><b class="label">Needed</b> {e(need)}</div>' if (not m["awarded"] and need) else ""
    ev = f'<q>{e(m["evidence"])}</q>' if m["evidence"] else '<span class="label">Nothing here</span>'
    return f'<div class="mk {"ok" if m["awarded"] else "lost"}"><div><span class="lab">{e(m["markLabel"])}</span><span class="st">{"Awarded" if m["awarded"] else "Not awarded"}</span></div><div>{ev}{need_html}</div></div>'
rows = "".join(mk_row(m) for m in grade["markBreakdown"])

extra_css = """
.search-wrap{position:relative;margin:40px 0 12px}
.search-wrap input{width:100%;font:900 22px Satoshi,sans-serif;text-transform:uppercase;letter-spacing:-.01em;padding:20px 24px;background:var(--panel);border:2px solid var(--head);color:var(--head)}
.search-wrap input:focus{outline:3px solid var(--sky);outline-offset:0}
.search-wrap .kbd{position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:900;letter-spacing:.14em;color:var(--muted)}
.rows2{border-top:2px solid var(--head);margin-bottom:40px}
.rows2 .r{display:flex;justify-content:space-between;align-items:center;padding:18px 0;border-bottom:1px solid var(--line);cursor:pointer}
.rows2 .r:hover .t{color:var(--gold)}
.rows2 .r .t{font-weight:900;text-transform:uppercase;font-size:16px;color:var(--head)}
.rows2 .r .m{font-size:11px;font-weight:700;letter-spacing:.1em;color:var(--muted);text-transform:uppercase;margin-top:4px}
.rows2 .r .go{font-size:11px;font-weight:900;letter-spacing:.14em;color:var(--gold)}
.chiprow{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 48px}
.chiprow a{display:flex;align-items:center;gap:8px;padding:10px 16px;border:1px solid var(--line);background:var(--panel);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:var(--head);text-decoration:none}
.chiprow a:hover{border-color:var(--head)}
.chiprow a b{color:var(--gold)}
.trail{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 24px;font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
.trail .done{color:var(--gold);cursor:pointer}
.trail .sep{color:var(--line)}
.trail .cur{color:var(--muted)}
"""

def build(name, title, sub, body, filename):
    doc = base_css.replace("</style>", extra_css + "</style>") + f"""
<body>
<header class="nav"><div class="wrap nav-in"><a class="brand" href="#"><span>Divergen<b>CIE</b></span></a>
<nav class="links" aria-label="Main">
<a href="#" aria-current="page">Solver</a>
<a href="#">Progress</a>
</nav></div></header>
<main><section><div class="wrap" style="max-width:900px">
<p class="eyebrow">Question Solver — {e(name)}</p>
<h1>{title}</h1>
<p class="sub" style="margin:16px 0 0">{sub}</p>
{body}
</div></section></main>
</body></html>"""
    open(f"/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/mockups/solver-onbrand/{filename}", "w").write(doc)
    print(filename, len(doc))

grading_panel = f"""
<h2 style="font-size:28px;margin:56px 0 4px">Question 4 <span>· {d['theory_q4_marks']} marks</span></h2>
<p class="label" style="margin:0 0 24px">Physics May/June 2026, Paper 42</p>
<div class="split">
  <div><img class="qimg" src="{d['theory_q4_img']}" alt="Question 4"></div>
  <div>
    <p class="label" style="margin-bottom:10px">Your answer</p>
    <textarea>{e(grade['_answer'])}</textarea>
    <div class="actions" style="margin-top:16px;justify-content:flex-start">
      <button class="btn btn-gold" onclick="document.getElementById('res').style.display='block';this.style.display='none'">Mark my answer</button>
    </div>
    <div id="res" style="display:none;margin-top:32px">
      <div class="gscore"><div class="score">{grade['marksAwarded']}<small>/{grade['marksAvailable']}</small></div></div>
      <div class="marks">{pips}</div>
      <p class="remark">{e(grade['remark'])}</p>
      <div style="border-top:2px solid var(--head)">{rows}</div>
    </div>
  </div>
</div>
"""

# ---- Concept F: search-first ----
body_f = f"""
<div class="search-wrap"><input value="physics motion" readonly><span class="kbd">↵ open</span></div>
<div class="rows2">
  <div class="r"><div><div class="t">Ch1.2 Motion (MCQ) Worksheet 1</div><div class="m">IGCSE · Physics · 15 questions</div></div><span class="go">Open →</span></div>
  <div class="r"><div><div class="t">Physics May/June 2026, Paper 42</div><div class="m">IGCSE · Theory · 73 marks</div></div><span class="go">Open →</span></div>
  <div class="r"><div><div class="t">Ch1.1 Length &amp; Time (MCQ) Worksheet 1</div><div class="m">IGCSE · Physics · 12 questions</div></div><span class="go">Open →</span></div>
</div>
<p class="label" style="margin-bottom:12px">Continue where you left off</p>
<div class="chiprow">
  <a href="#">Paper 42 <b>62%</b></a>
  <a href="#">Motion Worksheet <b>80%</b></a>
  <a href="#">Paper 62, practical</a>
</div>
{grading_panel}
"""
build("F", "Find it <span>fast.</span>", "Type a few letters of a subject or paper. Arrow keys and Enter, no menus.", body_f, "solver-F-search.html")

# ---- Concept G: guided tile reveal, one card, no page change ----
body_g = f"""
<div class="trail"><span class="done">IGCSE</span><span class="sep">/</span><span class="done">Physics</span><span class="sep">/</span><span class="cur">Paper</span></div>
<div class="panel">
  <p class="label" style="margin-bottom:16px">Choose a paper</p>
  <div class="tiles">
    <a class="tile" href="#" style="border-color:var(--head)"><span class="name" style="font-size:17px">Ch1.2 Motion</span><span class="meta"><span>MCQ, 15 qs</span><span class="dot"></span></span></a>
    <a class="tile" href="#"><span class="name" style="font-size:17px">May/June 2026</span><span class="meta"><span>Theory, Paper 42</span><span class="dot"></span></span></a>
    <a class="tile" href="#"><span class="name" style="font-size:17px">Feb/March 2026</span><span class="meta"><span>Practical, Paper 62</span><span class="dot"></span></span></a>
    <a class="tile" href="#"><span class="name" style="font-size:17px">Ch1.1 Length &amp; Time</span><span class="meta"><span>MCQ, 12 qs</span><span class="dot"></span></span></a>
  </div>
</div>
{grading_panel}
"""
build("G", "One step<br>at a <span>time.</span>", "Board, then subject, then paper — each choice opens in this same card.", body_g, "solver-G-guided.html")
