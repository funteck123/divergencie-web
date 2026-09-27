import base64, json, re, os
R = os.path.dirname(os.path.abspath(__file__)) + "/../../../"
def load():
    bg = base64.b64encode(open(R + "public/assets/images/register_bg.jpg", "rb").read()).decode()
    countries = json.loads(re.search(r"=\s*(\[.*\]);", open(R + "lib/cognitoCountries.js").read(), re.S).group(1))
    page = open(R + "app/register/page.js").read()
    def arr(n): return re.findall(r'"([^"]*)"', re.search(r"const " + n + r" = \[(.*?)\];", page, re.S).group(1))
    return bg, countries, arr("STUDYING_OPTIONS"), arr("HELP_OPTIONS"), arr("SUBJECT_OPTIONS"), arr("HEARD_OPTIONS")
