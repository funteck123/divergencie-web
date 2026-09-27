# Builds 4 plain-HTML mockups of the student register form (TKT-0283).
# Real fields/options; the background image is embedded so each file opens on its own.
import base64, json, re, html, os
R = os.path.dirname(os.path.abspath(__file__)) + "/../../../"
bg = base64.b64encode(open(R + "public/assets/images/register_bg.jpg", "rb").read()).decode()
countries = json.loads(re.search(r"=\s*(\[.*\]);", open(R + "lib/cognitoCountries.js").read(), re.S).group(1))
page = open(R + "app/register/page.js").read()
def arr(n): return re.findall(r'"([^"]*)"', re.search(r"const " + n + r" = \[(.*?)\];", page, re.S).group(1))
STUDY, HELP, SUBJ, HEARD = arr("STUDYING_OPTIONS"), arr("HELP_OPTIONS"), arr("SUBJECT_OPTIONS"), arr("HEARD_OPTIONS")
e = html.escape
def checks(opts, other=True, name="c"):
    o = "".join(f'<label class="opt"><input type="checkbox"> {e(x)}</label>' for x in opts)
    if other: o += '<label class="opt other"><input type="checkbox"><input type="text" placeholder="Other" aria-label="Other"></label>'
    return f'<div class="opts">{o}</div>'
def fld(label, control, req=False, cls=""):
    star = '<span class="req">*</span>' if req else ""
    return f'<div class="field {cls}"><label class="lab">{e(label)}{star}</label>{control}</div>'
sel = lambda opts, ph: '<select><option value="">%s</option>%s</select>' % (e(ph), "".join(f"<option>{e(x)}</option>" for x in opts))
txt = lambda ph="", t="text": f'<input type="{t}" placeholder="{e(ph)}">'
F = {
 "as": fld("I'm applying as", sel(["Trial (Student)", "Interview - Teacher", "Interview - Staff", "Interview - Ambassador"], "Trial (Student)")),
 "name": fld("Student name", '<div class="two">' + txt("First") + txt("Last") + "</div>", True),
 "gender": fld("Gender", sel(["Male", "Female", "Prefer not to say"], "Select")),
 "loc": fld("Location", sel(countries, "Country")),
 "wa": fld("WhatsApp Number (Include country code!)", txt("+44 7000 000000", "tel"), True),
 "email": fld("Your Email", txt("Your active email address", "email"), True),
 "par": fld("Parent's Contact Number", txt("Phone (International)", "tel"), True),
 "pemail": fld("Parent's Email (Optional)", txt("Your active email address", "email")),
 "school": fld("School Name (Optional)", txt()),
 "study": fld("What are you studying?", checks(STUDY), True),
 "help": fld("How shall we help?", checks(HELP)),
 "subj": fld("Subjects", checks(SUBJ)),
 "ref": fld("Who referred you? (Referrer Name)", txt("Enter name!")),
 "heard": fld("How did you hear about us?", checks(HEARD, False), True),
 "coupon": fld("Coupon Code (Optional)", txt()),
 "astar": fld("Do you feel you can score A* with proper guidance?", '<div class="opts"><label class="opt"><input type="radio" name="a"> Yes</label><label class="opt"><input type="radio" name="a"> No</label></div>'),
}
def row(*k): return '<div class="row">' + "".join(F[x] for x in k) + "</div>"
def body(kind):
    head = '<div class="head"><h2>Apply</h2><p>Tell us a bit about you to get started.</p></div>'
    if kind == "C":
        sec = lambda t, inner: f'<section class="sec"><h3>{t}</h3>{inner}</section>'
        return head + sec("About the student", F["as"] + F["name"] + row("gender", "loc")) \
            + sec("How we reach you", F["wa"] + F["email"] + F["par"] + F["pemail"]) \
            + sec("What they study", F["school"] + F["study"] + F["help"] + F["subj"]) \
            + sec("A little more", row("ref", "heard") + F["coupon"] + F["astar"])
    return head + F["as"] + F["name"] + row("gender", "loc") + F["wa"] + F["email"] + F["par"] + F["pemail"] + F["school"] + F["study"] + F["help"] + F["subj"] + row("ref", "heard") + F["coupon"] + F["astar"]

BASE = """
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;font:15px/1.5 'Roboto Slab',Georgia,serif;color:#111;background:#1a3c5e url(data:image/jpeg;base64,__BG__) center/cover fixed no-repeat}
body::before{content:"";position:fixed;inset:0;background:rgba(26,60,94,.12);pointer-events:none}
.page{position:relative;display:flex;min-height:100vh}
.brand{display:none;flex:1;flex-direction:column;justify-content:center;padding:0 48px;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,.65)}
.brand h1{font:900 56px/1 'Satoshi','Inter',system-ui,sans-serif;text-transform:uppercase;margin:0 0 14px}
.brand h1 b{color:#e8a832}.brand p{font-size:18px;max-width:30em;margin:0}
.formcol{flex:1;padding:72px 16px 40px;max-width:820px;width:100%;margin:0 auto}
.back{position:absolute;top:22px;left:22px;color:#fff;font:700 10px 'Inter',sans-serif;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;text-shadow:0 1px 6px rgba(0,0,0,.6)}
h2{font:700 38px/1.1 'Roboto Slab',serif;text-transform:uppercase;color:#1a3c5e;margin:0}
.head p{margin:6px 0 0;color:#333}
.lab{display:block;font-size:14px;font-weight:500;color:#d63a34;margin-bottom:6px}
.req{color:#cc2a24;margin-left:3px}
input[type=text],input[type=tel],input[type=email],select{width:100%;font:inherit;padding:13px 14px;border:1px solid rgba(0,0,0,.22);background:rgba(255,255,255,.7);color:#111;border-radius:0}
input::placeholder{color:rgba(0,0,0,.45)}
input:focus,select:focus{outline:3px solid #4a9fd4;outline-offset:0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.row{display:grid;grid-template-columns:1fr;gap:0 14px}
.opts{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.opt{display:inline-flex;align-items:center;gap:7px;font-size:15px;color:#111}
.opt input[type=checkbox],.opt input[type=radio]{accent-color:#4ef314;width:16px;height:16px;margin:0}
.opt.other input[type=text]{width:150px;padding:4px 6px;background:transparent;border:0;border-bottom:2px dashed rgba(0,0,0,.35)}
button.submit{width:100%;padding:16px;margin-top:6px;border:0;background:#4ef314;color:#0b1b2e;font:700 15px 'Roboto Slab',serif;letter-spacing:.06em;text-transform:uppercase;border-radius:3px;cursor:pointer}
button.submit:hover{filter:brightness(.95)}
.signin{margin-top:14px;font:700 10px 'Inter',sans-serif;letter-spacing:.14em;text-transform:uppercase}
.signin a{color:#1a3c5e}
@media(min-width:640px){.row{grid-template-columns:1fr 1fr}}
@media(min-width:1024px){.brand{display:flex}.formcol{margin:0;max-width:760px}}
"""
V = {
"A": ("Field cards", """
.head,.field,.sec{background:rgba(255,255,255,.74);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:14px 16px;margin-bottom:10px;border:1px solid rgba(255,255,255,.7)}
.head{padding:18px 18px 16px}
.row{gap:0 10px}.row .field{margin-bottom:10px}
.signin{background:rgba(255,255,255,.74);display:inline-block;padding:8px 12px}
"""),
"B": ("Label chips", """
.head{display:inline-block;background:rgba(255,255,255,.88);padding:14px 20px;margin-bottom:18px}
.field{margin-bottom:18px}
.lab{display:inline-block;background:#fff;padding:3px 11px;margin-bottom:8px}
input[type=text],input[type=tel],input[type=email],select{background:rgba(255,255,255,.58);backdrop-filter:blur(6px)}
.opt{background:rgba(255,255,255,.9);padding:5px 12px;border-radius:99px}
.opt.other input[type=text]{background:transparent}
.signin{background:#fff;display:inline-block;padding:8px 12px}
"""),
"C": ("Section cards", """
.head{background:rgba(255,255,255,.78);backdrop-filter:blur(12px);padding:18px 20px;margin-bottom:14px}
.sec{background:rgba(255,255,255,.66);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);padding:20px 20px 8px;margin-bottom:22px;border:1px solid rgba(255,255,255,.7)}
.sec h3{margin:0 0 14px;font:700 13px 'Inter',sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#1a3c5e}
.field{margin-bottom:16px}
.signin{background:rgba(255,255,255,.78);display:inline-block;padding:8px 12px}
"""),
"D": ("Dark glass cards", """
.head,.field{background:rgba(12,28,48,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:14px 16px;margin-bottom:10px;border:1px solid rgba(255,255,255,.2)}
.head{padding:18px}
h2{color:#fff}.head p{color:rgba(255,255,255,.85)}
.lab{color:#ff9a92}
.req{color:#ff6b62}
.opt{color:#fff}
.opt.other input[type=text]{border-bottom-color:rgba(255,255,255,.55);color:#fff}
.opt.other input::placeholder{color:rgba(255,255,255,.6)}
.row{gap:0 10px}
input[type=text],input[type=tel],input[type=email],select{background:rgba(255,255,255,.86)}
.signin{background:rgba(12,28,48,.6);display:inline-block;padding:8px 12px;color:#fff}.signin a{color:#e8a832}
"""),
}
for k, (title, css) in V.items():
    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Register mockup {k}: {title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;500;700&family=Inter:wght@700&display=swap">
<style>{BASE.replace("__BG__", bg)}{css}</style></head><body>
<div class="page">
 <div class="brand"><h1>Join the <b>Team.</b></h1><p>One application for a trial class, or a teacher, staff, or ambassador interview. Management reviews every request personally.</p></div>
 <main class="formcol"><a class="back" href="#">&larr; Back to site</a>
 <form onsubmit="return false">{body(k)}<button class="submit" type="submit">Submit</button></form>
 <p class="signin">Already have an account? <a href="#">Sign in</a></p></main>
</div></body></html>"""
    open(os.path.dirname(os.path.abspath(__file__)) + f"/register-{k}.html", "w").write(doc)
    print(k, title, len(doc))
