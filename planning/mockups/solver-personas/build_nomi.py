# Persona C: "Nomi" -- speedrun-minded student engineer.
# Identity: a student who has used this tool 40 times and resents every
# screen between opening it and seeing a question. Distrusts nested
# dropdowns and page loads.
# Purpose: shortest possible path to "the question I want, marked." A single
# type-ahead command box replaces board->subject->component->type->year
# dropdown chains; recent/unfinished papers are one tap away; the question
# and its grade sit in one dense view, no separate "result" page.
import json, base64, html
d = json.load(open("/home/funteck/.claude/jobs/88431ec6/tmp/solver_persona_data.json"))
e = html.escape
grade = d["grade"]
pips = "".join(f'<i class="{"" if m["awarded"] else "lost"}" title="{e(m["markLabel"])}"></i>' for m in grade["markBreakdown"])
def mk_row(m):
    need = m.get("whatWasNeeded") or ""
    need_html = f"<i>needed: {e(need)}</i>" if (not m["awarded"] and need) else ""
    ev = e(m["evidence"]) if m["evidence"] else "nothing here"
    return f'<div class="mk {"ok" if m["awarded"] else "lost"}"><b>{e(m["markLabel"])}</b><span>{ev}</span>{need_html}</div>'
rows = "".join(mk_row(m) for m in grade["markBreakdown"])

doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Persona C — Nomi</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600;700&display=swap">
<style>
:root{{--bg:#0b0f14;--panel:#12181f;--line:#1f2833;--ink:#e8edf2;--muted:#7c8a99;--accent:#38e0c8;--bad:#ff6b6b;--ok:#38e0c8}}
*{{box-sizing:border-box}} html,body{{margin:0}}
body{{background:var(--bg);color:var(--ink);font:400 15px/1.5 Inter,system-ui,sans-serif;min-height:100vh}}
.wrap{{max-width:920px;margin:0 auto;padding:28px 18px 80px}}
header{{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}}
.brand{{font:700 13px IBM Plex Mono,monospace;letter-spacing:.14em;color:var(--muted)}}
.brand b{{color:var(--accent)}}
.kbd{{font:600 10px IBM Plex Mono,monospace;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:2px 6px}}
.search{{position:relative;margin-bottom:10px}}
.search input{{width:100%;font:600 20px Inter;padding:18px 20px;background:var(--panel);border:1px solid var(--line);border-radius:10px;color:var(--ink)}}
.search input::placeholder{{color:var(--muted);font-weight:400}}
.search input:focus{{outline:none;border-color:var(--accent)}}
.hint{{position:absolute;right:16px;top:50%;transform:translateY(-50%);font:600 10px IBM Plex Mono,monospace;color:var(--muted)}}
.results{{background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:28px}}
.r{{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--line);cursor:pointer}}
.r:last-child{{border-bottom:0}}
.r:hover,.r.sel{{background:#182029}}
.r .t{{font-weight:600}}
.r .m{{font:600 11px IBM Plex Mono,monospace;color:var(--muted);letter-spacing:.04em}}
.r .go{{color:var(--accent);font:600 11px IBM Plex Mono,monospace}}
.section-lab{{font:700 11px IBM Plex Mono,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}}
.chips{{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:32px}}
.chip{{font:600 12.5px Inter;padding:8px 13px;background:var(--panel);border:1px solid var(--line);border-radius:999px;color:var(--ink);cursor:pointer}}
.chip .pct{{color:var(--accent);margin-left:6px}}
.qview{{display:grid;grid-template-columns:1fr;gap:0;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden}}
@media(min-width:820px){{.qview{{grid-template-columns:1fr 1fr}}}}
.qside{{padding:22px;border-bottom:1px solid var(--line)}}
@media(min-width:820px){{.qside{{border-bottom:0;border-right:1px solid var(--line)}}}}
.qside img{{width:100%;border-radius:6px;background:#fff;display:block}}
.qmeta{{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font:600 11px IBM Plex Mono,monospace;color:var(--muted);letter-spacing:.06em}}
.aside{{padding:22px}}
textarea{{width:100%;min-height:150px;font:inherit;padding:14px;background:#0e141b;border:1px solid var(--line);border-radius:8px;color:var(--ink);resize:vertical}}
textarea:focus{{outline:none;border-color:var(--accent)}}
.actions{{display:flex;justify-content:space-between;align-items:center;margin-top:12px}}
button.mark{{background:var(--accent);color:#00201c;border:0;padding:11px 20px;border-radius:8px;font:700 12.5px Inter;letter-spacing:.02em;cursor:pointer}}
button.mark:hover{{filter:brightness(1.05)}}
.score{{font:800 40px IBM Plex Mono,monospace;letter-spacing:-.02em}}
.score small{{font-size:16px;color:var(--muted)}}
.pips{{display:flex;gap:4px;margin:10px 0 16px}}
.pips i{{width:22px;height:8px;background:var(--ok);border-radius:2px}}
.pips i.lost{{background:var(--bad)}}
.remark{{color:var(--muted);font-size:13.5px;margin:0 0 16px;line-height:1.5}}
.mk{{display:grid;grid-template-columns:70px 1fr;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:13px}}
.mk b{{font:700 11px IBM Plex Mono,monospace}}
.mk.ok b{{color:var(--ok)}} .mk.lost b{{color:var(--bad)}}
.mk span{{color:var(--muted)}} .mk i{{display:block;font-style:normal;color:var(--bad);font-size:12px;margin-top:2px}}
</style></head><body>
<div class="wrap">
  <header><span class="brand">Question <b>Solver</b> // Nomi</span><span class="kbd">⌘K to search anytime</span></header>

  <div class="search"><input value="physics motion" readonly><span class="hint">↑↓ ↵</span></div>
  <div class="results">
    <div class="r sel"><div><div class="t">Ch1.2 Motion (MCQ) Worksheet 1</div><div class="m">IGCSE · Physics · 15 questions</div></div><span class="go">OPEN ↵</span></div>
    <div class="r"><div><div class="t">Physics May/June 2026 Paper 42</div><div class="m">IGCSE · Theory · 73 marks</div></div><span class="go">OPEN</span></div>
    <div class="r"><div><div class="t">Ch1.1 Length &amp; Time (MCQ) Worksheet 1</div><div class="m">IGCSE · Physics · 12 questions</div></div><span class="go">OPEN</span></div>
  </div>

  <p class="section-lab">Continue where you left off — one tap</p>
  <div class="chips">
    <span class="chip">Physics · Paper 42<span class="pct">62%</span></span>
    <span class="chip">Motion Worksheet<span class="pct">80%</span></span>
    <span class="chip">Paper 62, practical</span>
  </div>

  <p class="section-lab">Now open: Physics May/June 2026 Paper 42 — Question 4, {d['theory_q4_marks']} marks</p>
  <div class="qview">
    <div class="qside">
      <div class="qmeta"><span>Q4 of 11</span><span>Test mode</span></div>
      <img src="{d['theory_q4_img']}" alt="Question 4">
    </div>
    <div class="aside">
      <label class="section-lab">Your answer</label>
      <textarea>{e(grade['_answer'])}</textarea>
      <div class="actions"><button class="mark" onclick="document.getElementById('res').style.display='block';this.remove()">Mark it — Enter</button><span class="kbd">Enter</span></div>
      <div id="res" style="display:none;margin-top:18px">
        <div class="score">{grade['marksAwarded']}<small>/{grade['marksAvailable']}</small></div>
        <div class="pips">{pips}</div>
        <p class="remark">{e(grade['remark'])}</p>
        {rows}
      </div>
    </div>
  </div>
</div>
</body></html>"""
open("/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/planning/mockups/solver-personas/persona-C-nomi.html", "w").write(doc)
print(len(doc))
