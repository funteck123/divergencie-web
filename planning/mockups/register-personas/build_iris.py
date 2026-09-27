# Persona B: "Iris" -- brand storyteller / editorial designer.
# Identity: the form is a moment in the brand's story, not a database entry
# screen. Purpose: make filling it feel considered and warm, using the same
# homepage visual language (gold eyebrows, heavy uppercase headings, sharp
# corners, tracked labels) -- while still keeping every choice to one tap:
# pill-toggle buttons instead of checkboxes, no scrolling walls, no card.
# Genuinely different mechanism from Atlas's disclosure/chip pattern: every
# option is visible at once as a toggle pill, grouped under a gold eyebrow,
# never hidden behind a click-to-open control.
import sys, html, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shared_data import load
bg, countries, STUDY, HELP, SUBJ, HEARD = load()
e = html.escape

def dial_select():
    common = ["+44 UK", "+91 IN", "+966 SA", "+92 PK", "+60 MY", "+1 US"]
    return '<select class="dial" aria-label="Country code">' + "".join(f"<option>{e(c.split(' ')[0])}</option>" for c in common) + "</select>"

def phone_row(label, ph, req=True):
    star = "<i>*</i>" if req else ""
    return f'''<div class="fld"><label>{label}{star}</label><div class="phone">{dial_select()}<input type="tel" placeholder="{ph}"></div></div>'''

def pills(legend, opts, other=True, req=False):
    b = "".join(f'<label class="pill"><input type="checkbox"><span>{e(o)}</span></label>' for o in opts)
    if other:
        b += '<label class="pill other"><input type="checkbox"><input type="text" placeholder="Other" aria-label="Other"></label>'
    star = "<i>*</i>" if req else ""
    return f'<div class="fld"><span class="eyebrow">{e(legend)}{star}</span><div class="pillwrap">{b}</div></div>'

def seg(legend, opts, req=True):
    b = "".join(f'<label class="pill radio"><input type="radio" name="{legend[:6]}"><span>{e(o)}</span></label>' for o in opts)
    star = "<i>*</i>" if req else ""
    return f'<div class="fld"><span class="eyebrow">{e(legend)}{star}</span><div class="pillwrap">{b}</div></div>'

def fld(label, control, req=False):
    star = "<i>*</i>" if req else ""
    return f'<div class="fld">{("<label>"+e(label)+star+"</label>") if label else ""}{control}</div>'

sel = lambda opts, ph: '<select><option value="">%s</option>%s</select>' % (e(ph), "".join(f"<option>{e(x)}</option>" for x in opts))
txt = lambda ph="", t="text": f'<input type="{t}" placeholder="{e(ph)}">'

body = f"""
<div class="section">
  <span class="eyebrow">Application type</span>
  <div class="g1">{fld("", sel(["Trial (Student)", "Interview — Teacher", "Interview — Staff", "Interview — Ambassador"], "Trial (Student)"))}</div>
</div>
<div class="section">
  <span class="eyebrow">About the student</span>
  <div class="g2">{fld("First name", txt("First"), True)}{fld("Last name", txt("Last"), True)}</div>
  <div class="g2">{fld("Gender", sel(["Male", "Female", "Prefer not to say"], "Select"))}{fld("Location", sel(countries, "Country"))}</div>
</div>
<div class="section">
  <span class="eyebrow">How to reach you</span>
  <div class="g2">{phone_row("WhatsApp number", "7000 000000")}{fld("Your email", txt("you@example.com", "email"), True)}</div>
  <div class="g2">{phone_row("Parent's contact number", "7000 000000")}{fld("Parent's email", txt("optional", "email"))}</div>
  <div class="g1">{fld("School name", txt("optional"))}</div>
</div>
<div class="section">
  <span class="eyebrow">What they're studying</span>
  {pills("Qualification", STUDY, req=True)}
  <div class="g2">{pills("How we can help", HELP)}{pills("Subjects", SUBJ)}</div>
</div>
<div class="section">
  <span class="eyebrow">A little more</span>
  <div class="g2">{fld("Referrer name", txt("optional"))}{seg("How did you hear about us", HEARD)}</div>
  <div class="g2">{fld("Coupon code", txt("optional"))}{seg("Confident with A*?", ["Yes", "No"], req=False)}</div>
</div>
"""

doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Persona B — Iris</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap">
<style>
:root{{--navy:#1a3c5e;--gold:#e8a832;--ink:#1a1a1a}}
*{{box-sizing:border-box}}
html,body{{margin:0}}
body{{font:400 15px/1.6 Inter,system-ui,sans-serif;color:var(--ink);min-height:100vh;background:var(--navy)}}
.page{{display:grid;grid-template-columns:1fr;grid-template-areas:"form";min-height:100vh}}
@media(min-width:960px){{.page{{grid-template-columns:1fr 1.3fr;grid-template-areas:"brand form"}}}}
.brand{{grid-area:brand;display:none;position:relative;background:var(--navy) url(data:image/jpeg;base64,{bg}) center/cover}}
.brand::after{{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(26,60,94,.25),rgba(26,60,94,.7))}}
@media(min-width:960px){{.brand{{display:block}}}}
.brand-in{{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:center;padding:56px}}
.brand-in .eyebrow{{color:var(--gold);font:900 11px/1 Inter;letter-spacing:.3em;text-transform:uppercase;margin:0 0 16px;display:block}}
.brand-in h1{{font:900 52px/.95 Inter,sans-serif;text-transform:uppercase;color:#fff;margin:0 0 16px;letter-spacing:-.02em;text-shadow:0 2px 14px rgba(0,0,0,.5)}}
.brand-in h1 b{{color:var(--gold)}}
.brand-in p{{margin:0;color:rgba(255,255,255,.9);max-width:30ch;font-size:15px}}
.form{{grid-area:form;position:relative;background:url(data:image/jpeg;base64,{bg}) center/cover}}
.form::before{{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,.08) 100%)}}
.wrap{{position:relative;z-index:1;max-width:700px;margin:0 auto;padding:56px 20px 70px}}
.back{{position:fixed;top:16px;left:16px;z-index:2;color:#fff;font:900 10px Inter;letter-spacing:.2em;text-decoration:none;text-shadow:0 1px 8px rgba(0,0,0,.7)}}
.kicker{{color:var(--gold);font:900 11px Inter;letter-spacing:.3em;text-transform:uppercase;margin:0 0 10px;text-shadow:0 1px 8px rgba(0,0,0,.4)}}
h1.title{{font:900 46px/.92 Inter;text-transform:uppercase;margin:0 0 8px;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.55)}}
.sub{{color:rgba(255,255,255,.92);margin:0 0 34px;font-size:15px;text-shadow:0 1px 8px rgba(0,0,0,.5);max-width:44ch}}
form{{display:grid;gap:26px}}
.section{{display:grid;gap:12px;border-top:2px solid rgba(255,255,255,.35);padding-top:16px}}
.section:first-child{{border-top:0;padding-top:0}}
.eyebrow{{display:block;color:var(--gold);font:900 11px Inter;letter-spacing:.22em;text-transform:uppercase;text-shadow:0 1px 6px rgba(0,0,0,.5)}}
.fld{{display:grid;gap:6px;min-width:0}}
.fld label{{font:700 11px Inter;letter-spacing:.12em;text-transform:uppercase;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5)}}
.fld label i{{font-style:normal;color:var(--gold);margin-left:3px}}
.g1{{display:grid}}
.g2{{display:grid;grid-template-columns:1fr;gap:12px}}
@media(min-width:560px){{.g2{{grid-template-columns:1fr 1fr}}}}
input,select{{font:inherit;padding:12px 13px;border:0;border-bottom:2px solid rgba(26,60,94,.35);border-radius:0;background:rgba(255,255,255,.92);color:var(--ink);width:100%}}
input:focus,select:focus{{outline:2px solid var(--gold);outline-offset:0}}
.phone{{display:grid;grid-template-columns:74px 1fr;gap:6px}}
.dial{{font-size:12px;padding:12px 4px;text-align:center}}
.pillwrap{{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}}
.pill{{position:relative;cursor:pointer}}
.pill input{{position:absolute;opacity:0;width:1px;height:1px}}
.pill span{{display:inline-block;padding:9px 15px;background:rgba(255,255,255,.85);border:2px solid transparent;font:700 12.5px Inter;color:var(--navy);text-transform:uppercase;letter-spacing:.02em}}
.pill input:checked + span{{background:var(--gold);color:#1a1200;border-color:var(--gold)}}
.pill.other{{display:inline-flex;align-items:center;background:rgba(255,255,255,.85);padding:0 4px 0 15px}}
.pill.other input[type=text]{{width:80px;border:0;background:transparent;padding:9px 4px;font-size:12.5px;text-transform:none;letter-spacing:0}}
.pill.radio span{{border-radius:999px}}
button.submit{{margin-top:6px;padding:16px;border:0;background:var(--gold);color:#fff;font:900 13px Inter;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;box-shadow:0 20px 30px -14px rgba(232,168,50,.55)}}
button.submit:hover{{transform:scale(1.02)}}
.signin{{margin-top:16px;font:900 10px Inter;letter-spacing:.16em;color:rgba(255,255,255,.85);text-transform:uppercase;text-shadow:0 1px 6px rgba(0,0,0,.5)}}
.signin a{{color:var(--gold)}}
</style></head><body>
<a class="back" href="#">&larr; Back to site</a>
<div class="page">
  <div class="brand"><div class="brand-in"><span class="eyebrow">DivergenCIE Coaching</span><h1>Join the <b>team.</b></h1><p>One application for a trial class, or a teacher, staff, or ambassador interview.</p></div></div>
  <div class="form"><div class="wrap">
    <p class="kicker">Application</p>
    <h1 class="title">Apply.</h1>
    <p class="sub">Tell us a bit about you. Every choice below is one tap.</p>
    <form onsubmit="return false">{body}
      <button class="submit" type="submit">Submit</button>
      <p class="signin">Already have an account? <a href="#">Sign in</a></p>
    </form>
  </div></div>
</div>
</body></html>"""
open(os.path.dirname(os.path.abspath(__file__)) + "/persona-B-iris.html", "w").write(doc)
print(len(doc))
