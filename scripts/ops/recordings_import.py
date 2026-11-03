"""TKT-0358: load the uploaded class recordings into the portal's Recording Library (POST /api/recordings, Management only).

Reads data/youtube/video_dataset.csv (gitignored: it holds the unlisted YouTube ids), takes every row that has a youtubeId, and builds one record per video.
Chapter number, chapter name and lesson come from the video's own YouTube title, which was checked by eye when it was written:
  "A Level Mathematics 9709 | Ch 1 Quadratics | Pure Mathematics 1: Quadratics 3"
  "IGCSE Biology 0610 | Ch 21 Biotechnology and genetic modification | 13 Jul 2026 | B14"
Default is a dry run that prints the records. Pass --post to send them (uses the CLI token in ~/.dcp1/config.json). Safe to run again: records are keyed by YouTube id and updated in place.
"""
import csv, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def record(r):
    parts = [p.strip() for p in (r["processedYouTubeTitle"] or r["youtubeTitle"]).split(" | ")]
    if len(parts) < 3:
        raise ValueError(f"unexpected title: {parts}")
    m = re.match(r"^Ch (\d+) (.+)$", parts[1])
    chapter_no, chapter_name = (int(m[1]), m[2]) if m else (0, parts[1])
    batch = (r["batchFromBoard"] or r["batch"]).strip()
    rest = [p for p in parts[2:] if p != batch]
    lesson = ", ".join(rest)
    # A Maths lesson reads "Pure Mathematics 1: Quadratics 3": the part before the colon is the component (its own course), the rest is the lesson.
    component = ""
    m2 = re.match(r"^((?:Pure Mathematics|Probability and Statistics|Statistics|Mechanics) \d): (.+)$", lesson)
    if m2:
        component, lesson = m2[1], m2[2]
    return {
        "YouTubeId": r["youtubeId"], "Title": lesson, "Level": r["level"], "Subject": r["subject"].replace(r["subjectCode"], "").strip(),
        "SubjectCode": r["subjectCode"], "Component": component, "ChapterNo": chapter_no, "ChapterName": chapter_name,
        "Date": r["recordedDate"] or r["date"], "Batch": batch, "DurationMin": float(r["processedDurationMin"] or r["durationMin"] or 0),
    }

def main():
    rows = [r for r in csv.DictReader(open(os.path.join(ROOT, "data/youtube/video_dataset.csv"), encoding="utf8")) if r["youtubeId"]]
    recs = [record(r) for r in rows]
    for x in recs:
        print(f'{x["YouTubeId"]} | {x["Level"]} {x["Subject"]} {x["SubjectCode"]} | ch {x["ChapterNo"]} {x["ChapterName"]} | {x["Title"]} | {x["Date"]} | {x["Batch"] or "-"} | {x["DurationMin"]} min')
    print(f"{len(recs)} records")
    if "--post" not in sys.argv:
        print("dry run: nothing sent (add --post)")
        return
    c = json.load(open(os.path.expanduser("~/.dcp1/config.json")))
    req = urllib.request.Request(c["baseUrl"].rstrip("/") + "/api/recordings", data=json.dumps({"recordings": recs}).encode(), method="POST", headers={"Authorization": "Bearer " + c["token"], "Content-Type": "application/json"})
    print(json.load(urllib.request.urlopen(req, timeout=60)))

if __name__ == "__main__":
    main()
