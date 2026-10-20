#!/usr/bin/env python3
"""Write the recordings dataset (data/youtube/video_dataset.json) to a Google Sheet in the DC Drive account (TKT-0358).

  python3 scripts/ops/dataset_to_sheet.py                 creates "DivergenCIE Recordings Dataset" and prints its link
  python3 scripts/ops/dataset_to_sheet.py --sheet <id>    rewrites the data tab of an existing sheet

The sheet is private to the account that creates it. Needs GOOGLE_OAUTH_* in the environment (Sheets scope).
"""
import json, os, re, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import recording_syllabus as rs

CID, CSEC, RT = (os.environ[k] for k in ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN"))
COLS = [("Status", None), ("Location", "location"), ("File path", "filePath"), ("Local copies (C/D/E)", "localPaths"), ("Current name", "currentName"), ("Original name", "originalName"), ("Proposed file name", "proposedName"), ("YouTube title", "youtubeTitle"), ("YouTube description", "youtubeDescription"),
        ("Level", "level"), ("Subject", "subject"), ("Subject code", "subjectCode"), ("Component", "component"), ("Chapter code", "chapter"), ("Chapter title", "chapterTitle"), ("Chapter source", "chapterConfidence"), ("Other chapter options", "chapterAlternatives"), ("Topic", "topic"),
        ("Session type", "sessionType"), ("Session no.", "sessionNumber"), ("Date", "date"), ("Zoom time (UTC)", "zoomTimeUTC"), ("Batch", "batch"), ("Recording no.", "recordingNumber"), ("Instructor", "instructor"),
        ("Duration (min)", "durationMin"), ("Size (MB)", "sizeMB"), ("Category", "category"), ("Upload", "upload"), ("YouTube id", "youtubeId"), ("YouTube privacy", "youtubePrivacy"),
        ("Needs review", "needsReview"), ("Intro (spoken)", "introText"), ("Drive id", "driveId")]
_tok = {"v": None, "e": 0}


def token():
    if time.time() > _tok["e"] - 120:
        r = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", urllib.parse.urlencode(
            {"client_id": CID, "client_secret": CSEC, "refresh_token": RT, "grant_type": "refresh_token"}).encode()), timeout=60))
        _tok["v"], _tok["e"] = r["access_token"], time.time() + r["expires_in"]
    return _tok["v"]


def api(url, body=None, method="GET"):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method,
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=180))


def status(r):
    if r["category"] == "private":
        return "Private, do not upload"
    if r["youtubeId"]:
        return "Uploaded"
    if r["duplicateOf"]:
        return "Duplicate"
    return "Ready" if r["proposedName"] and not r["needsReview"] else "Needs review"


def coverage(rows):
    """One line per syllabus chapter of every subject that has recordings: how many recordings cover it, how many minutes, and Covered / Weak / Missing.
    A recording counts as covering a chapter when a person assigned the chapter (docs/recording-chapter-assignments.json); ones the person marked uncertain are listed as Weak (check).
    Zoom exports are counted apart because their chapter comes from reading the first 2 minutes of speech."""
    classes = [r for r in rows if r["category"] == "class" and r["upload"] and r.get("chapter") not in (None, "X") and r.get("subjectCode")]
    codes = []
    for r in classes:
        if r["subjectCode"] not in codes:
            codes.append(r["subjectCode"])
    head = ["Subject", "Level", "Code", "Component", "Chapter", "Chapter title", "Recordings (named)", "Recordings (Zoom, read from intro)", "Marked uncertain", "Minutes", "Status", "Dates"]
    out = [head]
    for code in sorted(codes):
        seen, chapters = set(), []
        for c in rs.load()["chapters"]:  # the syllabus data repeats some chapters (Core and Extended) and has stray rows of binary digits (Computer Science 0478): list each real chapter once
            if c["code"] != code or re.fullmatch(r"[01 ]+", c["title"]) or (c["component"], c["chapter"]) in seen:
                continue
            seen.add((c["component"], c["chapter"])); chapters.append(c)
        key = lambda c: (c["component"], int(re.match(r"\d+", c["chapter"]).group()) if re.match(r"\d+", c["chapter"]) else 0, c["chapter"])
        for c in sorted(chapters, key=key):
            mine = [r for r in classes if r["subjectCode"] == code and r["chapter"] == c["chapter"]]
            good = [r for r in mine if r["chapterConfidence"] == "manual"]
            weak = [r for r in mine if r["chapterConfidence"] == "manual, check"]
            named = [r for r in good if r["location"] != "Local (Zoom)"]; zoom = [r for r in good if r["location"] == "Local (Zoom)"]
            dates = sorted(r["date"] for r in good if r["date"])
            out.append([c["subject"], c["level"], code, c["component"], c["chapter"], c["title"], len(named), len(zoom), len(weak), round(sum(r["durationMin"] or 0 for r in good)),
                        "Covered" if good else "Weak (check)" if weak else "Missing", f"{dates[0]} to {dates[-1]}" if dates else ""])
        mixed = [r for r in rows if r["category"] == "class" and r["upload"] and r.get("chapter") == "X" and r.get("subjectCode") == code]
        if mixed:
            out.append([chapters[0]["subject"], chapters[0]["level"], code, "IGCSE" if code[0] == "0" else "", "X", "Exam practice (mixed chapters)", len(mixed), 0, 0, round(sum(r["durationMin"] or 0 for r in mixed)), "Extra", ""])
    return out


def write_tab(sid, name, values, status_col=None):
    meta = api(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}?fields=sheets.properties")
    props = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}
    reqs = []
    if name not in props:
        res = api(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}:batchUpdate", {"requests": [{"addSheet": {"properties": {"title": name, "gridProperties": {"frozenRowCount": 1}}}}]}, "POST")
        gid = res["replies"][0]["addSheet"]["properties"]["sheetId"]
    else:
        gid = props[name]
        api(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}/values/{urllib.parse.quote(name)}!A:ZZ:clear", {}, "POST")
    api(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}/values/{urllib.parse.quote(name)}!A1:append?valueInputOption=RAW", {"values": values}, "POST")
    reqs += [{"setBasicFilter": {"filter": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": len(values), "startColumnIndex": 0, "endColumnIndex": len(values[0])}}}},
             {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}}, "fields": "userEnteredFormat.textFormat.bold"}},
             {"autoResizeDimensions": {"dimensions": {"sheetId": gid, "dimension": "COLUMNS", "startIndex": 0, "endIndex": min(len(values[0]), 20)}}}]
    if status_col is not None:
        for text, rgb in (("Missing", {"red": 0.96, "green": 0.8, "blue": 0.8}), ("Weak (check)", {"red": 1, "green": 0.93, "blue": 0.7}), ("Covered", {"red": 0.8, "green": 0.92, "blue": 0.8})):
            reqs.append({"addConditionalFormatRule": {"index": 0, "rule": {"ranges": [{"sheetId": gid, "startRowIndex": 1, "endRowIndex": len(values), "startColumnIndex": status_col, "endColumnIndex": status_col + 1}],
                         "booleanRule": {"condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": text}]}, "format": {"backgroundColor": rgb}}}}})
    api(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}:batchUpdate", {"requests": reqs}, "POST")


def main():
    rows = json.load(open("data/youtube/video_dataset.json"))
    values = [[c[0] for c in COLS]]
    for r in rows:
        line = []
        for head, key in COLS:
            v = status(r) if key is None else r.get(key)
            line.append("; ".join(v) if isinstance(v, list) else ("" if v is None else v))
        values.append(line)
    sid = sys.argv[sys.argv.index("--sheet") + 1] if "--sheet" in sys.argv else None
    if not sid:
        sheet = api("https://sheets.googleapis.com/v4/spreadsheets", {"properties": {"title": "DivergenCIE Recordings Dataset"}, "sheets": [{"properties": {"title": "Videos", "gridProperties": {"frozenRowCount": 1}}}]}, "POST")
        sid = sheet["spreadsheetId"]
    write_tab(sid, "Videos", values)
    cov = coverage(rows)
    write_tab(sid, "Coverage", cov, status_col=10)
    missing = sum(1 for r in cov[1:] if r[10] == "Missing"); total = sum(1 for r in cov[1:] if r[10] != "Extra")
    print(f"Coverage tab: {total} chapters, {missing} missing")
    print(f"{len(values) - 1} rows -> https://docs.google.com/spreadsheets/d/{sid}")


if __name__ == "__main__":
    main()
