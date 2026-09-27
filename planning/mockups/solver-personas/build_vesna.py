# Persona D: "Vesna" -- calm-focus academic coach.
# Identity: an exam coach who has watched test anxiety wreck more scores
# than weak knowledge did. Distrusts dense screens and cold verdicts.
# Purpose: minimal clicks through progressive disclosure in ONE card (pick
# board -> the same card reveals subject tiles in place -> reveals papers),
# never a page change, never more than one decision visible at a time; the
# question screen is spacious and the mark result is framed as coaching,
# not a scoreboard.
import json, html
d = json.load(open("/home/funteck/.claude/jobs/88431ec6/tmp/solver_persona_data.json"))
e = html.escape
grade = d["grade"]

def mk_row(m):
    need = m.get("whatWasNeeded") or ""
    ev = e(m["evidence"]) if m["evidence"] else "Not attempted"
    need_html = f'<p class="need">Next time: {e(need)}</p>' if (not m["awarded"] and need) else ""
    return f'''<div class="mk {"ok" if m["awarded"] else "lost"}">
      <div class="mk-h"><span class="tag">{e(m["markLabel"])}</span><span class="st">{"Earned" if m["awarded"] else "Not yet"}</span></div>
      <p class="ev">"{ev}"</p>{need_html}
    </div>'''
rows = "".join(mk_row(m) for m in grade["markBreakdown"])
earned = grade["marksAwarded"]; total = grade["marksAvailable"]

doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Persona D — Vesna</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@500;700&family=Nunito+Sans:wght@400;600;700;800&display=swap">
<style>
:root{{--paper:#faf6ee;--card:#ffffff;--ink:#2b2620;--muted:#8a8070;--sage:#7c9473;--terracotta:#c1704f;--line:#e8e0d0}}
*{{box-sizing:border-box}} html,body{{margin:0}}
body{{background:var(--paper);color:var(--ink);font:400 16px/1.6 "Nunito Sans",system-ui,sans-serif;min-height:100vh}}
.wrap{{max-width:760px;margin:0 auto;padding:48px 20px 90px}}
.brand{{font:700 12px "Nunito Sans";letter-spacing:.14em;text-transform:uppercase;color:var(--sage);margin-bottom:8px}}
h1{{font:500 34px "Source Serif 4",serif;margin:0 0 10px;color:var(--ink)}}
.sub{{color:var(--muted);margin:0 0 34px;font-size:15.5px;max-width:46ch}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px;box-shadow:0 20px 40px -30px rgba(43,38,32,.35);margin-bottom:26px}}
.step-lab{{font:700 11px "Nunito Sans";letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 16px}}
.tiles{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}}
.tile{{border:1.5px solid var(--line);border-radius:14px;padding:18px 16px;text-align:left;background:#fff;cursor:pointer;font:700 15px "Nunito Sans";color:var(--ink)}}
.tile:hover{{border-color:var(--sage)}}
.tile.sel{{border-color:var(--sage);background:#f1f5ee}}
.tile .d{{display:block;font:400 12.5px "Nunito Sans";color:var(--muted);margin-top:4px}}
.trail{{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:18px;font:700 13px "Nunito Sans";color:var(--sage)}}
.trail .done{{color:var(--muted);text-decoration:none;cursor:pointer}}
.trail .sep{{color:var(--line)}}
.qcard{{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 20px 40px -30px rgba(43,38,32,.35)}}
.qhead{{padding:22px 30px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline}}
.qhead b{{font:500 20px "Source Serif 4",serif}}
.qhead span{{color:var(--muted);font-size:13px}}
.qimg{{padding:26px 30px 0}}
.qimg img{{width:100%;border-radius:10px;border:1px solid var(--line)}}
.qanswer{{padding:26px 30px 30px}}
label.lab{{display:block;font:700 13px "Nunito Sans";margin-bottom:10px;color:var(--ink)}}
textarea{{width:100%;min-height:170px;font:inherit;font-size:15px;padding:16px;border:1.5px solid var(--line);border-radius:12px;color:var(--ink);background:#fffdf9;resize:vertical}}
textarea:focus{{outline:none;border-color:var(--sage)}}
.cta{{width:100%;margin-top:16px;padding:16px;border:0;border-radius:12px;background:var(--sage);color:#fff;font:700 15px "Nunito Sans";cursor:pointer}}
.cta:hover{{background:#6d8564}}
.result{{padding:30px;border-top:2px solid var(--line)}}
.big{{display:flex;align-items:baseline;gap:14px;margin-bottom:6px}}
.big .n{{font:700 56px "Source Serif 4",serif;color:var(--sage)}}
.big .n small{{font-size:22px;color:var(--muted)}}
.big .word{{font:700 15px "Nunito Sans";color:var(--muted)}}
.remark{{font:500 17px "Source Serif 4",serif;color:var(--ink);margin:14px 0 24px;line-height:1.5}}
.mk{{padding:16px 0;border-top:1px solid var(--line)}}
.mk-h{{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}}
.tag{{font:700 12px "Nunito Sans";color:var(--ink)}}
.st{{font:700 11px "Nunito Sans";letter-spacing:.06em;text-transform:uppercase}}
.mk.ok .st{{color:var(--sage)}} .mk.lost .st{{color:var(--terracotta)}}
.ev{{color:var(--muted);font-size:14px;font-style:italic;margin:0}}
.need{{color:var(--terracotta);font-size:13.5px;margin:6px 0 0;font-weight:600}}
</style></head><body>
<div class="wrap">
  <p class="brand">Question Solver — Vesna</p>
  <h1>One step at a time.</h1>
  <p class="sub">Pick a board, then a subject, then a paper — each choice opens right where you are, nothing new to load.</p>

  <div class="card">
    <div class="trail"><span class="done">IGCSE</span><span class="sep">›</span><span class="done">Physics</span><span class="sep">›</span><span>Paper</span></div>
    <p class="step-lab">Choose a paper</p>
    <div class="tiles">
      <button class="tile sel">Ch1.2 Motion<span class="d">MCQ worksheet, 15 qs</span></button>
      <button class="tile">May/June 2026<span class="d">Theory, Paper 42</span></button>
      <button class="tile">Feb/March 2026<span class="d">Practical, Paper 62</span></button>
      <button class="tile">Ch1.1 Length &amp; Time<span class="d">MCQ worksheet, 12 qs</span></button>
    </div>
  </div>

  <p class="step-lab" style="margin:0 0 14px 2px">Now: Physics May/June 2026, Question 4 · {d['theory_q4_marks']} marks</p>
  <div class="qcard">
    <div class="qhead"><b>Question 4</b><span>Take your time — there's no clock here</span></div>
    <div class="qimg"><img src="{d['theory_q4_img']}" alt="Question 4"></div>
    <div class="qanswer">
      <label class="lab">Write your answer in your own words</label>
      <textarea>{e(grade['_answer'])}</textarea>
      <button class="cta" onclick="document.getElementById('res').style.display='block';this.style.display='none'">See how I did</button>
    </div>
    <div id="res" class="result" style="display:none">
      <div class="big"><span class="n">{earned}<small>/{total}</small></span><span class="word">marks so far</span></div>
      <p class="remark">{e(grade['remark'])}</p>
      {rows}
    </div>
  </div>
</div>
</body></html>"""
open("/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/mockups/solver-personas/persona-D-vesna.html", "w").write(doc)
print(len(doc))
