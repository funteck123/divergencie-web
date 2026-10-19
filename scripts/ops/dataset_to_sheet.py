#!/usr/bin/env python3
"""Write the recordings dataset (data/youtube/video_dataset.json) to a Google Sheet in the DC Drive account (TKT-0358).

  python3 scripts/ops/dataset_to_sheet.py                 creates "DivergenCIE Recordings Dataset" and prints its link
  python3 scripts/ops/dataset_to_sheet.py --sheet <id>    rewrites the data tab of an existing sheet

The sheet is private to the account that creates it. Needs GOOGLE_OAUTH_* in the environment (Sheets scope).
"""
import json, os, sys, time, urllib.parse, urllib.request

CID, CSEC, RT = (os.environ[k] for k in ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN"))
COLS = [("Status", None), ("Location", "location"), ("File path", "filePath"), ("Local copies (C/D/E)", "localPaths"), ("Current name", "currentName"), ("Original name", "originalName"), ("Proposed name", "proposedName"),
        ("Level", "level"), ("Subject", "subject"), ("Subject code", "subjectCode"), ("Component", "component"), ("Chapter", "chapter"), ("Topic", "topic"),
        ("Session type", "sessionType"), ("Session no.", "sessionNumber"), ("Date", "date"), ("Batch", "batch"), ("Recording no.", "recordingNumber"), ("Instructor", "instructor"),
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
    if "--sheet" in sys.argv:  # rewrite, do not append to what is there
        api(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}/values/Videos!A:ZZ:clear", {}, "POST")
    api(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}/values/Videos!A1:append?valueInputOption=RAW", {"values": values}, "POST")
    meta = api(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}?fields=sheets.properties.sheetId")
    gid = meta["sheets"][0]["properties"]["sheetId"]
    api(f"https://sheets.googleapis.com/v4/spreadsheets/{sid}:batchUpdate", {"requests": [
        {"setBasicFilter": {"filter": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": len(values), "startColumnIndex": 0, "endColumnIndex": len(COLS)}}}},
        {"repeatCell": {"range": {"sheetId": gid, "startRowIndex": 0, "endRowIndex": 1}, "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}}, "fields": "userEnteredFormat.textFormat.bold"}},
        {"autoResizeDimensions": {"dimensions": {"sheetId": gid, "dimension": "COLUMNS", "startIndex": 0, "endIndex": 20}}}]}, "POST")
    print(f"{len(values) - 1} rows -> https://docs.google.com/spreadsheets/d/{sid}")


if __name__ == "__main__":
    main()
