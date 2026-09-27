import base64, json, os
R = "/home/funteck/projects/dc_p1/divergencie-claude/v6/divergencie/"
D = os.path.dirname(os.path.abspath(__file__))
fonts = {}
for w, f in (("400","satoshi-400"),("700","satoshi-700"),("900","satoshi-900")):
    fonts[w] = base64.b64encode(open(R+"public/fonts/"+f+".woff2","rb").read()).decode()
fontface = "\n".join(
    f'@font-face{{font-family:Satoshi;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b}) format("woff2")}}'
    for w, b in fonts.items()
)
qdata = open("/home/funteck/.claude/jobs/88431ec6/tmp/motion15.json").read()
pdata = open("/home/funteck/.claude/jobs/88431ec6/tmp/paper_titles.json").read()

doc = open("/home/funteck/.claude/jobs/88431ec6/tmp/solver_app_template.html").read()
doc = doc.replace("__FONTFACE__", fontface, 1)
doc = doc.replace("__QDATA__", qdata, 1)
doc = doc.replace("__PDATA__", pdata, 1)
open(D + "/app.html", "w").write(doc)
print(len(doc))
