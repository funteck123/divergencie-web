#!/usr/bin/env python3
"""Second opinion on stored MCQ answers: ask Gemini which option the mark scheme page marks as correct (TKT-0362, TKT-0363).

The page picture goes to the Gemini API (GEMINI_API_KEY in .env); no answer is changed here. Results are cached in --out so a run can stop and resume.
Compare the result with the stored answer, then LOOK at every disagreement before changing anything: Save My Exams pages are sometimes wrong themselves.

  python3 scripts/ops/gemini_check_answers.py <database.json> <pdf dir> [<pdf dir> ...] --targets <keys.json> --out <results.json> [--model gemini-3.5-flash] [--workers 6]
  keys.json is a list of "qpId|questionNumber". Writes {key: {"answer": "A".."D" or null, "evidence": "...", "stored": "C"}}.
"""
import argparse, base64, concurrent.futures as cf, json, os, re, sys, time, urllib.error, urllib.request
import fitz

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from read_circled_letters import question_number  # noqa: E402

PROMPT = ("This page is a Save My Exams model answer for one multiple-choice question of a Cambridge exam. Find question number {n} on the page. "
          "Which option letter (A, B, C or D) does the page mark as the correct answer for question {n}? It is shown by a circle round the letter or option, "
          "a green tick against it, wrong options struck out or crossed in red, or text saying which answer is correct. If the picture and the explanation disagree, report the picture mark "
          "and say so in the evidence. Reply with JSON only: {{\"answer\": \"A\"|\"B\"|\"C\"|\"D\"|null, \"evidence\": \"one short sentence\"}}. Use null if you cannot tell.")


def page_png(doc, qn):
    for i, pg in enumerate(doc):
        text = pg.get_text()
        label = re.search(r"Question\s+(\d+)", text)  # picture pages are labelled "Question N", text pages start with the number
        if (label.group(1) if label else question_number(text)) == qn:
            return pg.get_pixmap(dpi=90, alpha=False).tobytes("png")
    return None


def ask(key, png, model, qn, apikey):
    body = {"contents": [{"parts": [{"text": PROMPT.format(n=qn)}, {"inline_data": {"mime_type": "image/png", "data": base64.b64encode(png).decode()}}]}],
            "generationConfig": {"temperature": 0, "responseMimeType": "application/json"}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apikey}"
    last = ""
    for attempt in range(5):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}), timeout=120))
            text = r["candidates"][0]["content"]["parts"][0]["text"]
            j = json.loads(re.sub(r"^```json|```$", "", text.strip()).strip())
            a = j.get("answer")
            return {"answer": a if a in ("A", "B", "C", "D") else None, "evidence": str(j.get("evidence", ""))[:300]}
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503):
                last = f"HTTP {e.code} (rate limited or busy)"
                time.sleep(2 ** attempt * 2); continue
            return {"answer": None, "evidence": f"HTTP {e.code}"}
        except Exception as e:  # malformed reply: try again, then give up for this one
            time.sleep(1 + attempt)
            last = str(e)[:100]
    return {"answer": None, "evidence": "failed: " + last}  # kept as unanswered so a later run asks again


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("db"); ap.add_argument("dirs", nargs="+"); ap.add_argument("--targets", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="gemini-3.5-flash"); ap.add_argument("--workers", type=int, default=6)
    a = ap.parse_args()
    apikey = os.environ["GEMINI_API_KEY"]
    targets = json.load(open(a.targets))
    done = json.load(open(a.out)) if os.path.exists(a.out) else {}
    retry = lambda k: k in done and done[k]["answer"] is None and done[k]["evidence"].startswith(("failed", "HTTP"))  # rate-limited earlier: ask again
    todo = [k for k in targets if k not in done or retry(k)]
    db = {r["qpId"]: r for r in json.load(open(a.db))}
    jobs = []
    docs = {}
    for k in todo:
        qp, qn = k.split("|")
        rec = db.get(qp)
        if not rec:
            continue
        stored = next((q["correctAnswer"] for q in rec["questions"] if q["questionNumber"] == qn), None)
        path = next((os.path.join(d, rec["msId"] + ".pdf") for d in a.dirs if os.path.exists(os.path.join(d, rec["msId"] + ".pdf"))), None)
        if not path:
            done[k] = {"answer": None, "evidence": "mark scheme PDF not cached", "stored": stored}; continue
        doc = docs.setdefault(path, fitz.open(path))
        png = page_png(doc, qn)
        if png is None:
            done[k] = {"answer": None, "evidence": "no page found", "stored": stored}; continue
        jobs.append((k, png, qn, stored))
    print(f"{len(done)} cached, {len(jobs)} to ask", flush=True)
    with cf.ThreadPoolExecutor(a.workers) as ex:
        futs = {ex.submit(ask, k, png, a.model, qn, apikey): (k, stored) for k, png, qn, stored in jobs}
        for n, f in enumerate(cf.as_completed(futs), 1):
            k, stored = futs[f]
            done[k] = {**f.result(), "stored": stored}
            if n % 25 == 0:
                json.dump(done, open(a.out, "w"), indent=0); print(n, "of", len(jobs), flush=True)
    json.dump(done, open(a.out, "w"), indent=0)
    agree = sum(1 for v in done.values() if v["answer"] and v["answer"] == v["stored"]); differ = sum(1 for v in done.values() if v["answer"] and v["answer"] != v["stored"])
    print(f"agree {agree}, differ {differ}, no answer {sum(1 for v in done.values() if not v['answer'])}")


if __name__ == "__main__":
    main()
