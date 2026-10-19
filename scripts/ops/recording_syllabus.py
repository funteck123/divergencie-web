#!/usr/bin/env python3
"""Match a recording to a syllabus chapter (TKT-0358). Used by build_video_dataset.py.

Source: data/syllabus-digitizer/database.json (the Syllabus Viewer's data). A chapter is a top-level syllabus topic ("5 Chemical energetics"); its sub-topics (5.1, 5.2) and
their wording make up the text a recording is compared with. For AS/A Level syllabuses the component is "AS Level" until the syllabus says "A Level subject content", then
"A Level (A2)"; for IGCSE the component is "IGCSE". A recording is compared with the chapters of its own subject (known code), or, when the subject is unknown, with every
IGCSE/AS/A chapter of the subjects whose name appears in the text.

Method: TF-IDF cosine over lower-cased word stems. The answer carries a confidence (high, medium, low) and the next best chapters, so a person can check the doubtful ones.
"""
import json, math, re

STOP = set("the and for with that this from are was were you your our have has had will can all any not but what when which how why into out one two its they them their there then than also about "
           "class today first last next lets let okay now just like some more very here these those such each other being been does did get got going want need make see look know say said "
           "chapter topic session lesson recording part practice revision past paper summary full exam test question questions".split())
_cache = {}


def stem(w):
    for suf in ("ations", "ation", "ings", "ing", "ies", "ied", "es", "ed", "s"):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[: -len(suf)] + ("y" if suf in ("ies", "ied") else "")
    return w


def words(text):
    return [stem(w) for w in re.findall(r"[a-z]{3,}", (text or "").lower()) if w not in STOP]


def load():
    if "chapters" in _cache:
        return _cache
    db = json.load(open("data/syllabus-digitizer/database.json"))["subjects"]
    chapters = []  # {subject, level, code, component, chapter, title, text}
    for sub in db.values():
        if sub["code"] == "0510":  # English as a Second Language: the syllabus has no numbered topics, its content is the four skills
            for i, (skill, extra) in enumerate((("Reading", "read text comprehension passage understand factual information"), ("Writing", "write essay article email letter report review descriptive narrative composition"),
                                                ("Listening", "listen listening audio recording understand spoken"), ("Speaking", "speak speaking oral discussion conversation presentation"))):
                chapters.append({"subject": sub["subject"], "level": sub["level"], "code": "0510", "component": "IGCSE", "chapter": "RWLS"[i], "title": skill, "extra": [extra]})
            continue
        comp = "IGCSE" if sub["level"] == "IGCSE" else "AS Level"
        cur = None
        for t in sub["topics"]:
            title = (t.get("title") or "").strip()
            if re.match(r"^A Level subject content", title, re.I):
                comp = "A Level (A2)"; continue
            if re.match(r"^AS Level subject content", title, re.I):
                comp = "AS Level"; continue
            if t["depth"] == 0 and t.get("code") and t["code"] != "None" and not title.lower().startswith("subject content"):
                if cur and cur["chapter"] == t["code"]:
                    cur["extra"].append(title + " " + (t.get("content") or "")[:300]); continue
                cur = {"subject": sub["subject"], "level": sub["level"], "code": sub["code"], "component": comp, "chapter": t["code"], "title": title,
                       "extra": [(t.get("content") or "")[:600]]}
                chapters.append(cur)
            elif cur and t["depth"] == 1 and title:
                cur["extra"].append(title + " " + (t.get("content") or "")[:250])
    df = {}
    for c in chapters:
        c["tokens"] = words((c["title"] + " ") * 4 + " ".join(c["extra"]))
        for w in set(c["tokens"]):
            df[w] = df.get(w, 0) + 1
    n = len(chapters)
    idf = {w: math.log((1 + n) / (1 + d)) + 1 for w, d in df.items()}
    for c in chapters:
        tf = {}
        for w in c["tokens"]:
            tf[w] = tf.get(w, 0) + 1
        vec = {w: (1 + math.log(f)) * idf[w] for w, f in tf.items()}
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1
        c["vec"] = {w: v / norm for w, v in vec.items()}
    _cache.update(chapters=chapters, idf=idf)
    return _cache


def query_vec(text):
    idf = load()["idf"]
    tf = {}
    for w in words(text):
        if w in idf:
            tf[w] = tf.get(w, 0) + 1
    vec = {w: (1 + math.log(f)) * idf[w] for w, f in tf.items()}
    norm = math.sqrt(sum(v * v for v in vec.values())) or 1
    return {w: v / norm for w, v in vec.items()}


SUBJECT_WORDS = {"Chemistry": r"chemistr|molecule|atom|acid|electrolysis|periodic|organic|reaction", "Physics": r"physics|force|energy|wave|circuit|velocity|electric|magnet",
                 "Biology": r"biology|cell|enzyme|photosynthesis|organism|ecosystem", "Mathematics": r"math|algebra|equation|geometry|trigonometr|graph|probability|statistic",
                 "ICT": r"\bict\b|spreadsheet|database|software|hardware", "Computer Science": r"python|program|algorithm|computer science|\bcs\b|binary",
                 "Accounting": r"account|ledger|journal|balance sheet", "Economics": r"econom|demand|supply|inflation|market",
                 "ESL": r"essay|article|writing|comprehension|grammar|reading|speaking|listening"}


GENERIC = re.compile(r"past\s*paper|spring test|summer test|mock|exam revision|full revision|revision|practical exam|booklet|doubts?|crash course|\btest\b|\bquiz\b|session", re.I)


def level_hint(text):
    low = (text or "").lower()
    if re.search(r"\b(gcse|igcse|o[- ]level)\b", low):
        return "IGCSE"
    if re.search(r"\b(a[- ]level|as[- ]level|a2|alevel)\b", low):
        return "A Level"
    return None


def match(text, code=None, subject=None, level=None, top=3):
    """Returns {subject, code, component, chapter, chapterTitle, confidence, score, alternatives} or None when nothing in the text matches a chapter."""
    chapters = load()["chapters"]
    pool = [c for c in chapters if code and c["code"] == code]
    if not pool and subject:
        pool = [c for c in chapters if c["subject"].lower() == subject.lower() and (not level or c["level"] == level)]
    if not pool:  # unknown subject: the common subjects, boosted by words in the text
        low = (text or "").lower()
        wanted = {s for s, rx in SUBJECT_WORDS.items() if re.search(rx, low)}
        pool = [c for c in chapters if any(w.lower() in c["subject"].lower() for w in wanted)] or []
        if level:
            pool = [c for c in pool if c["level"] == level] or pool
    if not pool:
        return None
    q = query_vec(text)
    if not q:
        return None
    scored = sorted(((sum(v * c["vec"].get(w, 0) for w, v in q.items()), c) for c in pool), key=lambda x: -x[0])
    best, c = scored[0]
    if best <= 0:
        return None
    margin = best - (scored[1][0] if len(scored) > 1 else 0)
    conf = "high" if best >= 0.35 and margin >= 0.08 else "medium" if best >= 0.2 else "low"
    return {"subject": c["subject"], "code": c["code"], "level": c["level"], "component": c["component"], "chapter": c["chapter"], "chapterTitle": c["title"], "confidence": conf,
            "score": round(best, 3), "alternatives": [f"{x['chapter']} {x['title']}" for _, x in scored[1:top]]}
