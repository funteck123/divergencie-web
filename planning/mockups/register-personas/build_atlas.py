# Persona A: "Atlas" -- systems-minded product engineer.
# Identity: thinks in forms-as-data. Every field is a cost; fewest taps wins.
# Purpose: get a valid submission in the least time, on any device, with the
# background photo left as visible as legibility allows. No card anywhere --
# a scrim over the form column only, inputs get their own small frosted box,
# labels sit directly on the photo. Multi-select lists collapse behind a
# native <details> disclosure (click once to open, click a chip to close),
# not a wall of always-visible checkboxes -- this is the actual mechanism
# that cuts taps+scrolling versus every earlier mockup.
import sys, html, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shared_data import load
bg, countries, STUDY, HELP, SUBJ, HEARD = load()
e = html.escape

def dial_select():
    common = ["+44 United Kingdom", "+91 India", "+966 Saudi Arabia", "+92 Pakistan", "+60 Malaysia", "+1 United States"]
    return '<select class="dial" aria-label="Country code">' + "".join(f"<option>{e(c.split(' ')[0])}</option>" for c in common) + "</select>"

def phone_row(label, ph):
    return f'''<div class="fld"><label>{label}<i>*</i></label><div class="phone">{dial_select()}<input type="tel" placeholder="{ph}"></div></div>'''

def disclosure(legend, opts, other=True, req=False):
    chips = "".join(f'<label class="chip"><input type="checkbox"><span>{e(o)}</span></label>' for o in opts)
    if other:
        chips += '<label class="chip other"><input type="checkbox"><input type="text" placeholder="Other" aria-label="Other"></label>'
    star = "<i>*</i>" if req else ""
    return f'''<details class="disc"><summary>{e(legend)}{star} <span class="hint">tap to choose</span></summary><div class="chipwrap">{chips}</div></details>'''

def seg(legend, opts, req=True):
    b = "".join(f'<label class="seg-opt"><input type="radio" name="{legend[:6]}"><span>{e(o)}</span></label>' for o in opts)
    star = "<i>*</i>" if req else ""
    return f'<div class="fld"><label>{e(legend)}{star}</label><div class="seg">{b}</div></div>'

def fld(label, control, req=False):
    star = "<i>*</i>" if req else ""
    return f'<div class="fld">{("<label>"+e(label)+star+"</label>") if label else ""}{control}</div>'

sel = lambda opts, ph: '<select><option value="">%s</option>%s</select>' % (e(ph), "".join(f"<option>{e(x)}</option>" for x in opts))
txt = lambda ph="", t="text": f'<input type="{t}" placeholder="{e(ph)}">'

body = f"""
<div class="g1">
  {fld("I'm applying as", sel(["Trial (Student)", "Interview — Teacher", "Interview — Staff", "Interview — Ambassador"], "Trial (Student)"))}
</div>
<div class="g2">
  {fld("Student first name", txt("First"), True)}
  {fld("Student last name", txt("Last"), True)}
</div>
<div class="g2">
  {fld("Gender", sel(["Male", "Female", "Prefer not to say"], "Select"))}
  {fld("Location", sel(countries, "Country"))}
</div>
<div class="g2">
  {phone_row("WhatsApp Number", "7000 000000")}
  {fld("Your Email", txt("you@example.com", "email"), True)}
</div>
<div class="g2">
  {phone_row("Parent's Contact Number", "7000 000000")}
  {fld("Parent's Email", txt("optional", "email"))}
</div>
<div class="g1">{fld("School Name", txt("optional"))}</div>
<div class="g1">{disclosure("What are you studying?", STUDY, req=True)}</div>
<div class="g2">
  {disclosure("How shall we help?", HELP)}
  {disclosure("Subjects", SUBJ)}
</div>
<div class="g2">
  {fld("Referrer name", txt("optional"))}
  {seg("How did you hear about us?", HEARD)}
</div>
<div class="g2">
  {fld("Coupon Code", txt("optional"))}
  {seg("Can you score A* with guidance?", ["Yes", "No"], req=False)}
</div>
"""

doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Persona A — Atlas</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;500;600;700&display=swap">
<style>
:root{{--ink:#0d1b2a;--line:rgba(13,27,42,.28);--accent:#2f6fed;--ok:#1f9d55}}
*{{box-sizing:border-box}}
html,body{{margin:0}}
body{{font:400 15px/1.5 Inter,system-ui,sans-serif;color:#fff;min-height:100vh;background:#0d1b2a}}
.page{{display:grid;grid-template-columns:1fr;grid-template-areas:"form";min-height:100vh}}
@media(min-width:960px){{.page{{grid-template-columns:1.1fr 1.4fr;grid-template-areas:"brand form"}}}}
.brand{{grid-area:brand;display:none;position:relative;background:url(data:image/jpeg;base64,{bg}) center/cover}}
.brand::after{{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(13,27,42,.15),rgba(13,27,42,.55))}}
@media(min-width:960px){{.brand{{display:block}}}}
.brand-in{{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;padding:48px}}
.brand-in .tag{{font:600 11px/1 IBM Plex Mono,monospace;letter-spacing:.16em;text-transform:uppercase;color:#8fb4ff;margin:0 0 10px}}
.brand-in h1{{font:700 40px/1.05 Inter,sans-serif;margin:0 0 10px;text-shadow:0 2px 12px rgba(0,0,0,.6)}}
.brand-in p{{margin:0;color:rgba(255,255,255,.82);max-width:32ch;font-size:14px}}
.form{{grid-area:form;position:relative;background:url(data:image/jpeg;base64,{bg}) center/cover}}
.form::before{{content:"";position:absolute;inset:0;background:linear-gradient(100deg,rgba(6,14,24,.72) 0%,rgba(6,14,24,.55) 55%,rgba(6,14,24,.4) 100%)}}
.wrap{{position:relative;z-index:1;max-width:640px;margin:0 auto;padding:56px 20px 64px}}
.back{{position:fixed;top:16px;left:16px;z-index:2;color:#fff;font:600 11px IBM Plex Mono,monospace;letter-spacing:.1em;text-decoration:none;text-shadow:0 1px 6px rgba(0,0,0,.6)}}
h2{{font:700 13px IBM Plex Mono,monospace;letter-spacing:.18em;text-transform:uppercase;color:#8fb4ff;margin:0 0 4px}}
h1.title{{font:700 34px/1.05 Inter;margin:0 0 6px}}
.sub{{color:rgba(255,255,255,.7);margin:0 0 28px;font-size:14px}}
form{{display:grid;gap:14px}}
.g1{{display:grid}}
.g2{{display:grid;grid-template-columns:1fr;gap:14px}}
@media(min-width:520px){{.g2{{grid-template-columns:1fr 1fr}}}}
.fld{{display:grid;gap:6px;min-width:0}}
.fld label{{font:600 12px/1.2 Inter;color:#dce8ff;letter-spacing:.01em}}
.fld label i{{font-style:normal;color:#7fd88f;margin-left:3px}}
input,select{{font:inherit;padding:11px 12px;border:1px solid var(--line);border-radius:6px;background:rgba(255,255,255,.94);color:var(--ink);width:100%}}
input:focus,select:focus{{outline:2px solid var(--accent);outline-offset:1px}}
.phone{{display:grid;grid-template-columns:88px 1fr;gap:6px}}
.dial{{font-size:13px;padding:11px 4px}}
details.disc{{border:1px solid rgba(255,255,255,.35);border-radius:6px;background:rgba(255,255,255,.08)}}
details.disc summary{{cursor:pointer;list-style:none;padding:11px 14px;display:flex;justify-content:space-between;align-items:center;font:600 13px Inter;color:#fff}}
details.disc summary::-webkit-details-marker{{display:none}}
details.disc summary i{{font-style:normal;color:#7fd88f;margin-left:3px}}
details.disc .hint{{font:500 10px IBM Plex Mono,monospace;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.55)}}
details.disc[open] summary{{border-bottom:1px solid rgba(255,255,255,.25)}}
.chipwrap{{display:flex;flex-wrap:wrap;gap:6px;padding:12px 14px;max-height:220px;overflow-y:auto}}
.chip{{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.94);color:var(--ink);cursor:pointer;border:1px solid transparent}}
.chip input{{width:13px;height:13px;padding:0;accent-color:var(--accent)}}
.chip.other{{padding:4px 10px}}
.chip.other input[type=text]{{width:84px;border:0;background:transparent;padding:2px 0;font-size:12.5px}}
.seg{{display:flex;gap:6px;flex-wrap:wrap}}
.seg-opt{{position:relative}}
.seg-opt input{{position:absolute;opacity:0;width:1px;height:1px}}
.seg-opt span{{display:inline-block;padding:9px 14px;border-radius:6px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.35);font:600 12.5px Inter;color:#fff;cursor:pointer}}
.seg-opt input:checked + span{{background:var(--accent);border-color:var(--accent)}}
button.submit{{margin-top:8px;padding:14px;border:0;border-radius:6px;background:var(--ok);color:#fff;font:700 13px Inter;letter-spacing:.04em;text-transform:uppercase;cursor:pointer}}
button.submit:hover{{filter:brightness(1.06)}}
.signin{{margin-top:14px;font:600 11px IBM Plex Mono,monospace;letter-spacing:.06em;color:rgba(255,255,255,.7)}}
.signin a{{color:#8fb4ff}}
</style></head><body>
<a class="back" href="#">&larr; BACK</a>
<div class="page">
  <div class="brand"><div class="brand-in"><p class="tag">DivergenCIE // Intake</p><h1>One form.<br>Fewer taps.</h1><p>Built for the phone in your hand: dropdowns over typing, disclosures over scrolling walls.</p></div></div>
  <div class="form"><div class="wrap">
    <h2>Apply</h2>
    <h1 class="title">Get started</h1>
    <p class="sub">Every field below is exactly what we need — nothing more.</p>
    <form onsubmit="return false">{body}
      <button class="submit" type="submit">Submit</button>
      <p class="signin">Already have an account? <a href="#">Sign in</a></p>
    </form>
  </div></div>
</div>
</body></html>"""
open(os.path.dirname(os.path.abspath(__file__)) + "/persona-A-atlas.html", "w").write(doc)
print(len(doc))
