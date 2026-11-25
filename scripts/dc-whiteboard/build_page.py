"""Builds public/whiteboard.html (the DC Whiteboard) from the owner's MSAWhiteboard, funteck123/msahub study/pages/whiteboard.html (TKT-0443, 25 Nov 2026).
Usage:  python3 scripts/dc-whiteboard/build_page.py <path to msahub>/study/pages/whiteboard.html
Every change is an exact replacement that must match once; the script stops if the source has changed shape."""
import re, sys, os

src = open(sys.argv[1], encoding="utf-8").read()
out_path = os.path.join(os.path.dirname(__file__), "..", "..", "public", "whiteboard.html")
t = src

def rep(old, new, count=1):
    global t
    n = t.count(old)
    assert n == count, f"expected {count} of {old[:70]!r}, found {n}"
    t = t.replace(old, new)

# ---- name, fonts, colours: the DivergenCIE brand (navy, gold, sky blue; Satoshi) -----------------------------
rep("<title>MSAWhiteboard</title>", "<title>DC Whiteboard | DivergenCIE</title><link rel=\"icon\" href=\"/assets/images/logo.jpg\">")
rep("<style>\n", """<style>
@font-face{font-family:Satoshi;src:url(/fonts/satoshi-400.woff2) format('woff2');font-weight:400;font-display:swap}
@font-face{font-family:Satoshi;src:url(/fonts/satoshi-500.woff2) format('woff2');font-weight:500;font-display:swap}
@font-face{font-family:Satoshi;src:url(/fonts/satoshi-700.woff2) format('woff2');font-weight:700;font-display:swap}
@font-face{font-family:Satoshi;src:url(/fonts/satoshi-900.woff2) format('woff2');font-weight:900;font-display:swap}
""")
# interface accent: navy, light-blue tints; drawing colours (--blue, --red, --yellow, --green) stay as the pen palette
t = re.sub(r"--acc:#1a73e8;--pn:#fff;--hv:#f1f3f4;--on:#e8f0fe;--onb:#c6dafc", "--acc:#1a3c5e;--pn:#fff;--hv:#f4f4f4;--on:#d5e8f0;--onb:#b4d3e2", t, count=1)
assert "--acc:#1a3c5e" in t
rep('font:14px/1.5 Roboto,"Segoe UI",Arial,sans-serif', 'font:14px/1.5 Satoshi,Roboto,"Segoe UI",Arial,sans-serif')
rep("button.p{background:var(--blue);border-color:var(--blue);color:#fff}button.p:hover{background:#3b78e7}", "button.p{background:#e8a832;border-color:#e8a832;color:#1a1a1a;font-weight:700}button.p:hover{background:#d99a25;border-color:#d99a25}")
# the five-colour letter logo becomes the DivergenCIE logo and wordmark
t = re.sub(r"\.logo b:nth-child\(1\)\{color:var\(--blue\)\}.*?(?=\n)", ".logo{display:inline-flex;align-items:center;gap:8px;font:900 18px/1 Satoshi,Arial,sans-serif;letter-spacing:-.3px}.logo img{width:28px;height:28px;border-radius:6px;object-fit:cover}.logo b{color:#e8a832;font-weight:900}.logo small{font:700 11px/1 Satoshi,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin-left:2px}body.dark .logo{color:#fff}", t, count=1)
assert ".logo img{" in t
t = re.sub(r"\.logo\{font:600 22px/1[^}]*\}\n", "", t, count=1)
rep('<a href="./" title="Back to MSAStudyHub" aria-label="Back to hub">&#8592;<span class="lb"> Hub</span></a><span class="logo" aria-label="MSAWhiteboard"><b>M</b><b>S</b><b>A</b><b>W</b><b>b</b><b>d</b></span>',
    '<a href="/" title="Back to DivergenCIE" aria-label="Back to DivergenCIE">&#8592;<span class="lb"> Back</span></a><span class="logo" aria-label="DC Whiteboard"><img src="/assets/images/logo.jpg" alt=""><span>Divergen<b>CIE</b></span><small class="lb">Whiteboard</small></span><span id="sess" class="lb" hidden></span>')

# ---- wording: saved to the account, not to a hub ------------------------------------------------------
rep("Saved to the hub (smaller board) ", "Saved to your account (smaller board) ")
rep("The bigger copy is kept as a backup on the hub.", "The bigger copy is kept as a backup in your account.")
rep('say("Saved to the hub "+', 'say("Saved to your account "+')
rep('toast("Saved to the hub")', 'toast("Saved to your account")')
rep("Saved in this browser only (hub not reachable)", "Saved in this browser only (not saved to your account yet)")
rep('toast("Hub not reachable: saved in this browser")', 'toast("Not saved to your account yet: kept in this browser")')
rep("Hub not reachable: image stored inside the board instead", "Could not upload: image stored inside the board instead")
rep("Audio upload failed (hub not reachable); not added", "Audio upload failed; not added")
rep("PDF upload failed (hub not reachable); not added", "PDF upload failed; not added")
rep("Video upload failed (hub not reachable); not added", "Video upload failed; not added")
t = t.replace("Save to the hub now (Ctrl+S)", "Save to your account now (Ctrl+S)")
rep("Boards autosave in this browser and are copied to the hub on the server, so they survive clearing the browser.", "Boards autosave in this browser and are saved to your DivergenCIE account, so they survive clearing the browser and open on any device you sign in on. Files over 4 MB stay in this browser.")
# file names and clipboard type
t = t.replace(".msawb.json", ".dcwb.json").replace("MSAWhiteboard", "DC Whiteboard").replace("application/x-msawb", "application/x-dcwb")

# ---- the DC API, per signed-in person --------------------------------------------------------------------
t = t.replace('"wb/api/', '"/api/wb/')
assert "wb/api/" not in t.replace("/api/wb/", "")
# everything stored in the browser is kept apart per person, so a second person on the same computer never sees the first one's boards
rep('indexedDB.open("msawhiteboard",1)', 'indexedDB.open("dcwhiteboard-"+UID,1)')
rep('localStorage.getItem("wb_last")', 'localStorage.getItem("wb_last_"+UID)')
rep('localStorage.setItem("wb_last",b.id)', 'localStorage.setItem("wb_last_"+UID,b.id)')
rep('localStorage.getItem("wb_clip")', 'localStorage.getItem("wb_clip_"+UID)', count=t.count('localStorage.getItem("wb_clip")'))
t = t.replace('localStorage.setItem("wb_clip",', 'localStorage.setItem("wb_clip_"+UID,')
# who is signed in, and the class session this board is linked to (?session=<id>&title=<name>)
rep("<script>\n", """<script>
const ME=(()=>{try{return JSON.parse(localStorage.getItem("dcp1_user")||"null")}catch(e){return null}})();
if(!ME||!ME.UserID){location.replace("/login")}
const UID=(ME&&ME.UserID)||"anon";
const QS=new URLSearchParams(location.search),SESSION=/^[A-Za-z0-9_-]{1,40}$/.test(QS.get("session")||"")?QS.get("session"):"",STITLE=(QS.get("title")||"").slice(0,100);
const SQ=SESSION?"&session="+encodeURIComponent(SESSION):"";
""")
# the board's save calls carry the session link
t = t.replace('"/api/wb/save?id="+encodeURIComponent(b.id),{method:"POST"', '"/api/wb/save?id="+encodeURIComponent(b.id)+SQ,{method:"POST"')
t = t.replace('navigator.sendBeacon("/api/wb/save?id="+board.id,', 'navigator.sendBeacon("/api/wb/save?id="+board.id+SQ,')
assert t.count("+SQ,") >= 3, t.count("+SQ,")
# a session board opens straight away: the person's own board for that session, or a new one named after the session
rep('listBoards().then(L=>{const id=L.some(b=>b.id===want)?want:(L[0]&&L[0].id);', 'sessionBoards().then(L=>{const id=SESSION?(L[0]&&L[0].id):(L.some(b=>b.id===want)?want:(L[0]&&L[0].id));')
rep("(function boot(){", """function sessionBoards(){if(!SESSION)return listBoards();return fetch("/api/wb/list?session="+encodeURIComponent(SESSION)).then(r=>r.ok?r.json():[]).catch(()=>[]).then(a=>a.sort((x,y)=>y.updated-x.updated))}
(function(){const el=document.getElementById("sess");if(SESSION&&el){el.hidden=false;el.textContent="Class session"+(STITLE?": "+STITLE:"");el.style.cssText="color:var(--mut);font-size:12px;border:1px solid var(--line);border-radius:12px;padding:2px 8px;white-space:nowrap"}})();
(function boot(){""")
rep('return newBoard()});return newBoard()}', 'return newBoard()});return newBoard()}')
# a new board for a session is named after it
rep('function newBoard(tpl){const b={id:uid()+uid(),name:"Untitled board",', 'function newBoard(tpl){const b={id:uid()+uid(),name:SESSION&&!tpl?(STITLE||"Class session"):"Untitled board",')
# an expired sign-in sends the person to the login page instead of failing quietly
rep("const SQ=", "const _f=window.fetch;window.fetch=function(){return _f.apply(this,arguments).then(function(r){if(r.status===401){location.replace(\"/login\")}return r})};\nconst SQ=")

open(out_path, "w", encoding="utf-8").write(t)
print("wrote", os.path.normpath(out_path), len(t), "bytes")
