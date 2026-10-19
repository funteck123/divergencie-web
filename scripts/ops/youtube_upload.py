#!/usr/bin/env python3
"""Upload class recordings from Google Drive to the DivergenCIE YouTube channel as UNLISTED videos (TKT-0358).

Each Drive file is streamed to YouTube in 8 MB chunks through memory (nothing is saved on disk) with the resumable protocol, and recorded in a ledger so a rerun never uploads the same Drive file twice.
The ledger holds Drive id, YouTube id, title and the privacy status YouTube reported. Needs GOOGLE_OAUTH_* in the environment with the youtube.upload scope
(scripts/ops/google-reauth.mjs). One upload costs 1600 of the 10,000 daily API quota units, so at most 6 a day until Google raises the quota.

  python3 scripts/ops/youtube_upload.py <drive file id> [<drive file id> ...] [--ledger data/youtube/ledger.json] [--dry-run]

The title is the Drive file name without ".mp4"; student names must not be in it. Prints the YouTube status per video and stops at the first failure.
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

CID, CSEC, RT = (os.environ[k] for k in ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN"))
_t = {"v": None, "e": 0}


def token():
    if time.time() > _t["e"] - 120:
        r = json.load(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", urllib.parse.urlencode(
            {"client_id": CID, "client_secret": CSEC, "refresh_token": RT, "grant_type": "refresh_token"}).encode()), timeout=60))
        _t["v"], _t["e"] = r["access_token"], time.time() + r["expires_in"]
    return _t["v"]


def drive_meta(file_id):
    req = urllib.request.Request(f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=id,name,size,mimeType&supportsAllDrives=true", headers={"Authorization": "Bearer " + token()})
    return json.load(urllib.request.urlopen(req, timeout=60))


CHUNK = 32 * 256 * 1024  # 8 MB; YouTube wants a multiple of 256 KB for every chunk but the last


def stream(file_id, size, title, description):
    """Drive -> YouTube in memory: one chunk is read from Drive and sent on, so no video is written to disk. Returns YouTube's reply."""
    body = {"snippet": {"title": title[:100], "description": description, "categoryId": "27"},
            "status": {"privacyStatus": "unlisted", "selfDeclaredMadeForKids": False}}
    init = urllib.request.Request("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", data=json.dumps(body).encode(), method="POST",
                                  headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json; charset=UTF-8",
                                           "X-Upload-Content-Length": str(size), "X-Upload-Content-Type": "video/mp4"})
    session = urllib.request.urlopen(init, timeout=60).headers["Location"]
    src = urllib.request.urlopen(urllib.request.Request(f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&supportsAllDrives=true",
                                                        headers={"Authorization": "Bearer " + token()}), timeout=600)
    sent = 0
    while sent < size:
        want = min(CHUNK, size - sent)
        buf = b""
        while len(buf) < want:
            part = src.read(want - len(buf))
            if not part:
                raise RuntimeError(f"Drive stream ended at {sent + len(buf)} of {size} bytes")
            buf += part
        req = urllib.request.Request(session, data=buf, method="PUT", headers={"Content-Length": str(len(buf)), "Content-Range": f"bytes {sent}-{sent + len(buf) - 1}/{size}"})
        try:
            r = urllib.request.urlopen(req, timeout=600)
            return json.load(r)  # 200/201 on the last chunk
        except urllib.error.HTTPError as e:
            if e.code != 308:
                raise
        sent += len(buf)
    raise RuntimeError("upload ended without a reply from YouTube")


def main():
    args = [a for a in sys.argv[1:]]
    dry = "--dry-run" in args
    ledger_path = "data/youtube/ledger.json"
    if "--ledger" in args:
        i = args.index("--ledger"); ledger_path = args[i + 1]; del args[i:i + 2]
    ids = [a for a in args if not a.startswith("--")]
    os.makedirs(os.path.dirname(ledger_path), exist_ok=True)
    ledger = json.load(open(ledger_path)) if os.path.exists(ledger_path) else {}
    for fid in ids:
        if fid in ledger:
            print("already uploaded:", ledger[fid]["title"], ledger[fid]["youtubeId"]); continue
        meta = drive_meta(fid)
        title = os.path.splitext(meta["name"])[0].strip() if meta["name"].lower().endswith(".mp4") else meta["name"].strip()
        print("uploading", title, round(int(meta.get("size") or 0) / 1e6), "MB", flush=True)
        if dry:
            continue
        try:
            r = stream(fid, int(meta["size"]), title, "DivergenCIE class recording.")
        except urllib.error.HTTPError as e:
            print("FAILED", e.code, e.read().decode()[:400]); sys.exit(1)
        ledger[fid] = {"driveId": fid, "youtubeId": r["id"], "title": title, "privacyStatus": r["status"]["privacyStatus"], "uploadedAt": time.strftime("%Y-%m-%dT%H:%M:%S")}
        json.dump(ledger, open(ledger_path, "w"), indent=1)
        print("  ->", r["id"], r["status"]["privacyStatus"], flush=True)


if __name__ == "__main__":
    main()
