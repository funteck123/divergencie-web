"""Remove the Save My Exams banner from a RAW original without touching any real text (TKT-0299). The banner is its own form object (or its own text objects) in its own fonts (Cambria,
Times New Roman Italic, Calibri), printed over the first line of the page; covering it with a rectangle erases that real line, deleting the banner object does not. The fonts of every form are
resolved through its own resources, so a real font and a banner font that share a resource name are never mixed up. After the edit it checks, per page, on the SAVED file: no banner line is left
and the multiset of all real characters is identical before and after. usage: strip_sme_banner.py <raw.pdf> <out.pdf>  -> JSON per page; exits 1 if any page fails (the output must not be used).
"""
import json, re, sys
import fitz

BOIL = re.compile(r"savemyexams|saveyexams|homeofrevision|awesome|visit|headto|resources", re.I)
BT = re.compile(rb"(?<![\w/])BT(?![\w])(.*?)(?<![\w/])ET(?![\w])", re.S)
TF = re.compile(rb"/(\S+?)\s+[-\d.]+\s+Tf")
base = lambda s: s.split("+")[-1]
norm = lambda t: re.sub(r"[\s\xa0]", "", t)

def lines_of(page):
    out = []
    for b in page.get_text("dict")["blocks"]:
        for ln in b.get("lines", []):
            text = "".join(sp["text"] for sp in ln["spans"])
            out.append((ln["bbox"][1], norm(text), {base(sp["font"]) for sp in ln["spans"]}, bool(ln["bbox"][1] < 120 and BOIL.search(norm(text)))))
    return out

def form_font_names(doc, xref):
    """{resource name: base font} for the fonts a form XObject itself declares (its own /Resources /Font), so two different fonts that share a resource name on the page and in the form are not mixed up."""
    t, v = doc.xref_get_key(xref, "Resources/Font")
    if t == "null":
        t2, v2 = doc.xref_get_key(xref, "Resources")
        if t2 == "xref": t, v = doc.xref_get_key(int(v2.split()[0]), "Font")
    if t == "xref": v = doc.xref_object(int(v.split()[0]))
    out = {}
    for name, fx in re.findall(r"/([^\s/<>\[\]()]+)\s+(\d+)\s+0\s+R", v if t != "null" else ""):
        bt, bv = doc.xref_get_key(int(fx), "BaseFont")
        out[name.encode()] = base(bv.lstrip("/")) if bt != "null" else ""
    return out


def chars_of(page, skip_fonts=()):
    """Every character of the page's text layer (spans not in skip_fonts), spaces dropped, sorted: a multiset, so a different line grouping cannot hide or fake a change."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for ln in b.get("lines", []):
            for sp in ln["spans"]:
                if base(sp["font"]) not in skip_fonts: out.extend(norm(sp["text"]))
    return sorted(out)


def strip(src, out):
    doc = fitz.open(src); rep = {}; ok = True
    snap = {pno: lines_of(doc[pno]) for pno in range(doc.page_count)}
    snapch = {}
    emptied = set()
    for pno in range(doc.page_count):
        page = doc[pno]; before = snap[pno]
        banner_fonts = set().union(*[f for _, _, f, isb in before if isb]) if any(b[3] for b in before) else set()
        if not banner_fonts: continue
        snapch[pno] = chars_of(page, banner_fonts)
        real_fonts = set().union(*[f for _, t, f, isb in before if not isb and t]) if any((not x[3]) and x[1] for x in before) else set()
        for xo in page.get_xobjects():
            if xo[0] in emptied: continue
            st = doc.xref_stream(xo[0])
            used = set(TF.findall(st or b""))
            if not used: continue
            fmap = form_font_names(doc, xo[0])
            bases = {fmap[n] for n in used if n in fmap}
            if len(bases) == 0 or len(used) != len({n for n in used if n in fmap}): continue   # a font we cannot resolve: leave the form alone
            if bases & banner_fonts and not bases & real_fonts:      # uses the banner's fonts and none of the real text's fonts: the banner itself
                doc.update_stream(xo[0], b" "); emptied.add(xo[0])
    # second pass, only for a page whose banner is drawn in the page's own content (the cover page): delete the text objects whose fonts belong to the banner alone
    for pno in range(doc.page_count):
        before = snap[pno]
        if not any(b[3] for b in before): continue
        page = doc[pno]
        if not any(b[3] for b in lines_of(page)): continue            # the form step already removed it
        banner_fonts = set().union(*[f for _, _, f, isb in before if isb])
        real_fonts = set().union(*[f for _, t, f, isb in before if not isb and t]) if any((not x[3]) and x[1] for x in before) else set()
        only = banner_fonts - real_fonts
        fmap = form_font_names(doc, page.xref)
        for xref in page.get_contents():
            st = doc.xref_stream(xref)
            def drop(m, only=only, fmap=fmap):
                used = set(TF.findall(m.group(0)))
                if used and all(n in fmap for n in used) and {fmap[n] for n in used} <= only:
                    return b""
                return m.group(0)
            doc.update_stream(xref, BT.sub(drop, st))
        for d in page.get_drawings():                                  # the banner's link underline, a thin black bar near the top
            rc = d["rect"]
            if rc.y1 < 70 and rc.height < 1.5 and rc.width > 20 and d.get("fill") == (0.0, 0.0, 0.0):
                page.draw_rect(fitz.Rect(rc.x0 - 1, rc.y0 - 0.8, rc.x1 + 1, rc.y1 + 0.8), color=None, fill=(1, 1, 1), overlay=True)
    doc.save(out, garbage=3, deflate=True); n = doc.page_count; doc.close()
    chk = fitz.open(out)                                     # judge the saved file, not the in-memory one
    for pno in range(n):
        before = snap[pno]
        if not any(b[3] for b in before): continue
        after = lines_of(chk[pno])
        left = [t for _, t, _, isb in after if isb]
        same = snapch.get(pno) == chars_of(chk[pno])
        banner_fonts = set().union(*[f for _, _, f, isb in before if isb])
        shared = banner_fonts & (set().union(*[f for _, t, f, isb in before if not isb and t]) if any((not b[3]) and b[1] for b in before) else set())
        page_ok = not left and same
        ok = ok and page_ok
        rep[pno + 1] = {"banner_left": len(left), "real_text_identical": same, "banner_fonts_also_used_by_real_text": sorted(shared), "ok": page_ok}
    rep["forms_emptied"] = sorted(emptied); chk.close()
    return rep, ok

if __name__ == "__main__":
    rep, ok = strip(sys.argv[1], sys.argv[2])
    print(json.dumps({"ok": ok, "pages": rep})[:2500]); sys.exit(0 if ok else 1)
