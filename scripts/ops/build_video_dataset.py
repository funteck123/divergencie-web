#!/usr/bin/env python3
"""Build the recordings dataset (TKT-0358): one row per video in Drive with the fields that identify a class, ready for a later YouTube upload.

Sources, per field (each row keeps a "source" note and a "needsReview" list instead of guessing):
  Drive      id, file name, folder path, size, duration, created time
  file name  level, subject, topic, session number, date (DDMMYYYY), batch (B14, B4,14), recording number, Zoom room
  codes      subject code from the subject (CAIE codes), or from a leading 4-digit code in the name ("0610 Conservation")
  folder     instructor hints (Aurneela, Menahil, Rabia, Saba); the Zoom room name gives Shahid Akhtar or Ms Imtiaz
  intro      what the teacher says in the first minutes (data/youtube/intros.json from video_intro.py), kept as text for review
  ledger     YouTube id and privacy status when the video is already uploaded (data/youtube/ledger.json)

  python3 scripts/ops/build_video_dataset.py [--out data/youtube/video_dataset]     writes <out>.json and <out>.csv

A video that looks private (interview, trial class, feedback, testimonial, recruitment) is kept in the file with "category": "private" and "upload": false.
Needs GOOGLE_OAUTH_* in the environment (Drive scope).
"""
import csv, json, os, re, sys, urllib.parse, urllib.request

CID, CSEC, RT = (os.environ[k] for k in ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN"))
_tok = {}


def token():
    if "v" not in _tok:
        _tok["v"] = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", urllib.parse.urlencode(
            {"client_id": CID, "client_secret": CSEC, "refresh_token": RT, "grant_type": "refresh_token"}).encode()), timeout=60))["access_token"]
    return _tok["v"]


def api(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": "Bearer " + token()}), timeout=120))


def list_videos():
    q = urllib.parse.quote("mimeType contains 'video/' and trashed=false")
    rows, tk = [], ""
    while True:
        r = api(f"https://www.googleapis.com/drive/v3/files?q={q}&fields=nextPageToken,files(id,name,size,parents,createdTime,videoMediaMetadata/durationMillis)"
                f"&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true" + (f"&pageToken={tk}" if tk else ""))
        rows += r["files"]; tk = r.get("nextPageToken", "")
        if not tk:
            return rows


_paths = {}


def folder_path(fid):
    if fid not in _paths:
        try:
            m = api(f"https://www.googleapis.com/drive/v3/files/{fid}?fields=name,parents&supportsAllDrives=true")
            parent = m["parents"][0] if m.get("parents") else None
            _paths[fid] = (folder_path(parent) + "/" if parent else "") + m["name"].strip()
        except Exception:
            _paths[fid] = "?"
    return _paths[fid]


# (level, subject as written in the file name) -> (subject, CAIE code). Codes: Cambridge IGCSE 0580 Maths, 0625 Physics, 0620 Chemistry, 0610 Biology,
# 0510 English as a Second Language (speaking endorsement 0511), 0417 ICT, 0452 Accounting, 0455 Economics, 0478 Computer Science; AS and A Level 9708 Economics, 9700 Biology, 9618 Computer Science.
SUBJECTS = {"maths": ("Mathematics", "0580"), "mathematics": ("Mathematics", "0580"), "physics": ("Physics", "0625"), "chemistry": ("Chemistry", "0620"), "biology": ("Biology", "0610"),
            "english sl": ("English as a Second Language", "0510"), "english": ("English as a Second Language", "0510"), "ict": ("ICT", "0417"), "accounting": ("Accounting", "0452"),
            "economics": ("Economics", "0455"), "computer science": ("Computer Science", "0478"), "cs": ("Computer Science", "0478")}
CODE_SUBJECT = {"0580": "Mathematics", "0625": "Physics", "0620": "Chemistry", "0610": "Biology", "0510": "English as a Second Language", "0417": "ICT", "0452": "Accounting",
                "0455": "Economics", "0478": "Computer Science", "9708": "Economics", "9700": "Biology", "9618": "Computer Science", "9709": "Mathematics", "9702": "Physics", "9701": "Chemistry"}
AS_CODES = {"Economics": "9708", "Biology": "9700", "Computer Science": "9618"}
LEVELS = r"(?P<level>iGCSE|IGCSE|AS Level|AS|A Level|SAT|Qudrat|Quadrat)"
NAME = re.compile(r"^(?P<head>.+?)\s*-\s*(?P<date>\d{8})\s+(?P<batch>B[\w,]+)(?:\s*-\s*Recording\s*(?P<rec>\d+))?(?:\s*-\s*(?P<room>.+))?$", re.I)
PRIVATE = re.compile(r"interview|trial|feedback|sample|testimonial|recruit|intern\b|social media", re.I)
SESSION = [("past paper", "past paper practice"), ("quiz", "quiz"), ("practice", "practice"), ("revision", "revision"), ("crash course", "crash course")]
INSTRUCTORS = [("Shahid_Akhtar", "Shahid Akhtar"), ("Ms_Imtiaz", "Ms Imtiaz")]
FOLDER_TEACHER = [("Aurneela", "Aurneela"), ("Menahil", "Menahil"), ("Rabia", "Rabia"), ("Saba", "Saba"), ("Kavita", "Dr Kavita")]


def standard_name(o, file_name):
    """The library's naming format: "<code> <Topic> <n> - DDMMYYYY <Batch>[ - Part <k>]" (same as "0610 Conservation - 12082026 B14"). None when a part is missing or unreliable."""
    topic = (o["topic"] or "").strip()
    if not (o["subject"] and o["date"] and o["batch"] and topic) or topic.lower() in ("nan", "") or o["category"] != "class":
        return None
    d = o["date"]; ddmmyyyy = d[8:] + d[5:7] + d[:4]
    topic = re.sub(r"^(Maths|Mathematics|Physics|Chemistry|Biology)\s+", "", topic) if o["level"] in ("SAT", "Qudrat") else topic
    lead = o["subjectCode"] or " ".join(x for x in [o["level"], {"Mathematics": "Maths"}.get(o["subject"], o["subject"])] if x)
    num = f" {o['sessionNumber']}" if o["sessionNumber"] else ""
    part = f" - Part {o['recordingNumber']}" if (o["recordingNumber"] or 1) > 1 else ""
    ext = os.path.splitext(file_name)[1] if file_name.lower().endswith((".mp4", ".mov", ".mkv", ".m4v")) else ".mp4"
    return f"{lead} {topic}{num} - {ddmmyyyy} {o['batch']}{part}{ext}"


def parse(row, path, intro):
    name = re.sub(r"\.(mp4|tmp|mov|mkv)+$", "", row["name"], flags=re.I).strip()
    name = re.sub(r"\.mp4$", "", name, flags=re.I)
    out = {"driveId": row["id"], "fileName": row["name"], "folder": path, "sizeMB": round(int(row.get("size") or 0) / 1e6, 1),
           "durationMin": round(int(row.get("videoMediaMetadata", {}).get("durationMillis") or 0) / 60000, 1), "createdTime": row.get("createdTime", "")[:10],
           "level": None, "subject": None, "subjectCode": None, "component": None, "chapter": None, "topic": None, "sessionType": None, "sessionNumber": None,
           "date": None, "batch": None, "recordingNumber": None, "instructor": None, "category": "class", "upload": True, "introText": (intro or {}).get("text"),
           "proposedName": None, "titleProposal": None, "filePath": None, "location": "Google Drive", "duplicateOf": None, "needsReview": [], "source": {}}
    review = out["needsReview"]
    if PRIVATE.search(name + " " + path):
        out["category"], out["upload"] = "private", False
        return out
    m = NAME.match(name)
    head = name
    if m:
        head = m.group("head").strip()
        d = m.group("date"); out["date"] = f"{d[4:]}-{d[2:4]}-{d[:2]}"; out["source"]["date"] = "file name"
        out["batch"] = m.group("batch").upper().replace("BNAN", ""); out["recordingNumber"] = int(m.group("rec")) if m.group("rec") else None
        room = m.group("room") or ""
        for key, who in INSTRUCTORS:
            if key.lower() in room.lower():
                out["instructor"], out["source"]["instructor"] = who, "Zoom room name"
    lead = re.match(r"^(\d{4})\s+(.*)$", head)
    lm = re.match(r"^" + LEVELS + r"\s+(.*)$", head, re.I)
    if lead and lead.group(1) in CODE_SUBJECT:
        out["subjectCode"], out["subject"], head = lead.group(1), CODE_SUBJECT[lead.group(1)], lead.group(2)
        out["level"] = "IGCSE" if out["subjectCode"][0] == "0" else "AS/A Level"; out["source"]["subject"] = "leading code"
    elif lm:
        lv = lm.group("level"); out["level"] = {"igcse": "IGCSE", "quadrat": "Qudrat", "qudrat": "Qudrat", "sat": "SAT", "as": "AS Level", "as level": "AS Level"}.get(lv.lower(), lv)
        rest = lm.group(2)
        for key in sorted(SUBJECTS, key=len, reverse=True):
            if rest.lower().startswith(key + " ") or rest.lower() == key:
                out["subject"], code = SUBJECTS[key]
                out["subjectCode"] = AS_CODES.get(out["subject"]) if out["level"] in ("AS Level", "A Level") else (code if out["level"] == "IGCSE" else None)
                head = rest[len(key):].strip(); out["source"]["subject"] = "file name"; break
        else:
            head = rest
    # a four-digit code in the middle of the topic ("Mechanics 1  0580 Equations and Inequalities 2") wins over the words before it
    mid = re.search(r"\b(0\d{3}|97\d{2})\b\s+", head)
    if mid and mid.group(1) in CODE_SUBJECT:
        out["subjectCode"] = mid.group(1); out["subject"] = CODE_SUBJECT[mid.group(1)]; head = head[mid.end():]; out["source"]["subjectCode"] = "code in name"
    cm = re.search(r"\b(?:CH|Ch|Chapter)\s*(\d+)\b", head)
    if cm:
        out["chapter"], out["source"]["chapter"] = cm.group(1), "file name"
    sm = re.search(r"\s(\d{1,2})\s*$", head)
    if sm:
        out["sessionNumber"] = int(sm.group(1)); head = head[:sm.start()].strip()
    out["topic"] = re.sub(r"\s+", " ", head).strip(" -")
    low = (out["topic"] or "").lower()
    for key, label in SESSION:
        if key in low:
            out["sessionType"] = label; break
    for key, who in FOLDER_TEACHER:
        if key.lower() in path.lower() and not out["instructor"]:
            out["instructor"], out["source"]["instructor"] = who, "folder name"
    if re.match(r"^video\d+", name) or not m:
        review.append("name has no date, batch or topic: identify from the intro text")
    for field in ("subject", "date", "batch", "instructor"):
        if not out[field]:
            review.append(f"no {field}")
    if not out["chapter"]:
        out["source"]["chapter"] = "not in the file name: fill from the syllabus"
    out["proposedName"] = standard_name(out, row["name"])
    out["titleProposal"] = out["proposedName"][:-4] if out["proposedName"] else None
    return out


def add_local(rows):
    """Videos found on the C, D and E drives (data/youtube/local_videos.tsv: path, bytes, date). A local copy whose name and size match a Drive recording is added to that row's
    localPaths; a class-looking local file with no Drive match becomes its own row (location "Local"). Phone backups and project footage are not class videos and are left out."""
    if not os.path.exists("data/youtube/local_videos.tsv"):
        return
    def norm(n):  # letters and digits only: local copies have a Drive-id prefix and glued words ("IGCSEEnglish SLEmail")
        return re.sub(r"[^a-z0-9]", "", re.sub(r"\.\w+$", "", n.lower()))
    drive = [(norm(n), r) for r in rows if r["location"] == "Google Drive" for n in {r["originalName"], r["currentName"]}]  # a renamed local copy matches the new name
    left_out = new = matched = 0
    for line in open("data/youtube/local_videos.tsv", encoding="utf8"):
        fields = line.rstrip("\n").split("\t")
        if len(fields) != 3 or not fields[1].isdigit():
            continue  # a line still being written by the search, or a path with a line break in it
        path, size, mtime = fields
        base = os.path.basename(path)
        nb = norm(base)
        hit = [r for nr, r in drive if nr and (nb.endswith(nr) or nr.endswith(nb)) and abs(int(r["sizeMB"] * 1e6) - int(size)) < 2e6]
        if hit:
            if path not in hit[0]["localPaths"]:
                hit[0]["localPaths"].append(path)
            matched += 1; continue
        if not (NAME.match(re.sub(r"\.\w+$", "", base)) or re.match(r"^\d{4}\s+.+-\s*\d{8}", base)) or PRIVATE.search(base):
            left_out += 1; continue
        fake = {"id": None, "name": base, "size": size, "createdTime": mtime, "videoMediaMetadata": {}}
        rec = parse(fake, os.path.dirname(path), None)
        rec.update({"location": "Local", "filePath": path, "originalName": base, "currentName": base, "youtubeId": None, "youtubePrivacy": None, "localPaths": [path]})
        rows.append(rec); new += 1
    print(f"local files: {matched} match a Drive recording, {new} are not in Drive, {left_out} are other videos (phone backups, project footage) and left out")


def main():
    out = "data/youtube/video_dataset"
    if "--out" in sys.argv:
        out = sys.argv[sys.argv.index("--out") + 1]
    os.makedirs(os.path.dirname(out), exist_ok=True)
    intros = json.load(open("data/youtube/intros.json")) if os.path.exists("data/youtube/intros.json") else {}
    ledger = json.load(open("data/youtube/ledger.json")) if os.path.exists("data/youtube/ledger.json") else {}
    first_name = {}  # the name a file had before any rename (docs/recording-rename-history.csv)
    if os.path.exists("docs/recording-rename-history.csv"):
        for h in csv.DictReader(open("docs/recording-rename-history.csv", encoding="utf8")):
            if h["status"] == "renamed":
                first_name.setdefault(h["driveId"], h["before"])
    rows = []
    for v in list_videos():
        v = dict(v); original = first_name.get(v["id"], v["name"]); current = v["name"]; v["name"] = original  # parse the original name: it carries date, batch and Zoom room
        rec = parse(v, folder_path(v["parents"][0]) if v.get("parents") else "", intros.get(v["id"]))
        rec["originalName"], rec["currentName"] = original, current
        rec["youtubeId"] = (ledger.get(v["id"]) or {}).get("youtubeId"); rec["youtubePrivacy"] = (ledger.get(v["id"]) or {}).get("privacyStatus")
        rows.append(rec)
    for r in rows:
        r["filePath"] = (r["folder"] + "/" + r["currentName"]).replace("//", "/"); r["localPaths"] = []
    add_local(rows)
    seen = {}
    for r in rows:  # same size and length = the same video stored twice
        key = (r["sizeMB"], r["durationMin"]) if r["sizeMB"] > 1 else None
        if key and key in seen:
            r["duplicateOf"] = seen[key]; r["needsReview"].append("duplicate of " + seen[key][:8])
        elif key:
            seen[key] = r["driveId"]
    names = {}
    for r in rows:  # two files must never get the same new name
        n = r["proposedName"]
        if n:
            names.setdefault(n.lower(), []).append(r)
    for n, group in names.items():
        if len(group) > 1:
            for r in group:
                r["needsReview"].append("same proposed name as another file"); r["proposedName"] = None; r["titleProposal"] = None
    rows.sort(key=lambda r: (r["date"] or "9999", r["fileName"]))
    json.dump(rows, open(out + ".json", "w"), indent=1, ensure_ascii=False)
    cols = [c for c in rows[0] if c not in ("source", "needsReview", "introText", "localPaths")] + ["localPaths", "needsReview", "introText"]
    with open(out + ".csv", "w", newline="", encoding="utf8") as f:
        w = csv.writer(f); w.writerow(cols)
        for r in rows:
            w.writerow([("; ".join(r[c]) if isinstance(r[c], list) else r[c]) for c in cols])
    ok = sum(1 for r in rows if r["upload"] and r["proposedName"] and not r["needsReview"]); review = sum(1 for r in rows if r["upload"] and not (r["proposedName"] and not r["needsReview"]))
    print(f"{len(rows)} videos: {ok} complete, {review} need review, {sum(1 for r in rows if not r['upload'])} private (not for upload) -> {out}.json / .csv")


if __name__ == "__main__":
    main()
