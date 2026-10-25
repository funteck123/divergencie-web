#!/usr/bin/env python3
"""Check stored MCQ answers against the plain-text answer key of the mark scheme (TKT-0362, TKT-0363).

Many mark schemes (all the A Level worksheets) are a list of "1. A  2. B ..." in the text layer. This tool reads that list again with its own small
parser, ignoring how the answers were first stored, and compares the two. A question the key does not list exactly once is "unread", never guessed.

  python3 scripts/ops/check_text_keys.py <database.json> <pdf dir> [<pdf dir> ...] --out <result.json> [--board "A Levels"] [--source text-parsing]
Writes {"differs": [...], "counts": {...}, "unread": [...]}. Look at every difference on its page before changing an answer.
"""
import argparse, collections, json, os, re
import fitz

TOKEN = re.compile(r"^(\d{1,3})\.?$")


def read_key(path):
    """{question number: letter} from every "N" or "N." token that is immediately followed by a lone A to D. A number seen twice with different letters is dropped."""
    doc = fitz.open(path)
    seen = collections.defaultdict(set)
    for pg in doc:
        toks = pg.get_text().split()
        for i in range(len(toks) - 1):
            m = TOKEN.match(toks[i])
            if m and toks[i + 1] in ("A", "B", "C", "D"):
                seen[m.group(1)].add(toks[i + 1])
    doc.close()
    return {n: next(iter(s)) for n, s in seen.items() if len(s) == 1}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("db"); ap.add_argument("dirs", nargs="+"); ap.add_argument("--out", required=True); ap.add_argument("--board"); ap.add_argument("--source")
    a = ap.parse_args()
    counts, differs, unread = collections.Counter(), [], []
    for rec in json.load(open(a.db)):
        if a.board and rec.get("board") != a.board:
            continue
        wanted = [q for q in rec["questions"] if not a.source or q.get("source") == a.source]
        path = next((os.path.join(d, rec["msId"] + ".pdf") for d in a.dirs if os.path.exists(os.path.join(d, rec["msId"] + ".pdf"))), None)
        if not wanted or not path:
            counts["no pdf"] += len(wanted); continue
        key = read_key(path)
        for q in wanted:
            n = q["questionNumber"]
            if n not in key:
                counts["unread"] += 1; unread.append(f"{rec['qpId']}|{n}"); continue
            if key[n] == q["correctAnswer"]:
                counts["agrees"] += 1
            else:
                counts["DIFFERS"] += 1
                differs.append({"title": rec["title"], "subject": rec.get("subject"), "qpId": rec["qpId"], "msId": rec["msId"], "q": n, "current": q["correctAnswer"], "key": key[n], "source": q.get("source")})
    json.dump({"differs": differs, "counts": dict(counts), "unread": unread}, open(a.out, "w"), indent=1)
    print(dict(counts))


if __name__ == "__main__":
    main()
