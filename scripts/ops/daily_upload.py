#!/usr/bin/env python3
"""Daily YouTube upload job (TKT-0358), meant to run from a scheduler OUTSIDE any Claude session.

One run = look at the current quota day (it starts at 16:00 local time), count the uploads already in data/youtube/ledger.json since then,
upload up to the remaining slots (6 per quota day) as UNLISTED, then load the new videos into the portal's Recording Library.

Safe to run as often as you like (the Windows task runs it hourly from 16:07 and at logon):
  - nothing left in the quota day, or a quota error already seen today: it exits at once;
  - it takes a lock, so two runs never overlap;
  - before sending it dry-runs the queue and checks each chosen file is readable (ffprobe, audio present, length matches the dataset);
    if any file fails it uploads nothing and says which one;
  - it writes ~/.local/state/daily-upload/status.json (counts, stock, last result) and one log per run. No tokens or message text are logged.

  python3 scripts/ops/daily_upload.py [--dry-run]     (--dry-run decides and checks, but uploads and posts nothing)
Needs GOOGLE_OAUTH_* in the environment (daily_upload.sh sources .env.local) and ~/.dcp1/config.json for the library import."""
import datetime as dt, fcntl, json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATE = os.path.join(os.environ.get("XDG_STATE_HOME", os.path.expanduser("~/.local/state")), "daily-upload")
SLOTS = int(os.environ.get("DAILY_UPLOAD_SLOTS", "6"))  # 6 per quota day; the env override exists only to test the dry-run path
os.makedirs(os.path.join(STATE, "runs"), exist_ok=True)
DRY = "--dry-run" in sys.argv

def quota_day_start(now):
    s = now.replace(hour=16, minute=0, second=0, microsecond=0)
    return s if now >= s else s - dt.timedelta(days=1)

def read_status():
    try: return json.load(open(os.path.join(STATE, "status.json")))
    except Exception: return {}

def write_status(**kw):
    st = read_status(); st.update(kw, updated=dt.datetime.now().isoformat(timespec="seconds"))
    tmp = os.path.join(STATE, "status.json.tmp"); json.dump(st, open(tmp, "w"), indent=1); os.replace(tmp, os.path.join(STATE, "status.json"))

def uploads_since(start):
    L = json.load(open(os.path.join(ROOT, "data/youtube/ledger.json")))
    return sum(1 for v in L.values() if isinstance(v, dict) and v.get("uploadedAt", "") >= start.isoformat(timespec="seconds"))

def stock():
    rows = json.load(open(os.path.join(ROOT, "data/youtube/video_dataset.json")))
    rows = rows if isinstance(rows, list) else rows.get("rows", [])
    ready = [r for r in rows if r.get("readyToPost") == "yes" and not r.get("youtubeId")]
    return len(ready), sum(1 for r in ready if r.get("level") == "A Level"), rows

def main():
    lock = open(os.path.join(STATE, "lock"), "w")
    try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("another run holds the lock; exiting"); return 0
    now = dt.datetime.now(); start = quota_day_start(now); day = start.date().isoformat()
    done = uploads_since(start); remaining = SLOTS - done
    n_ready, n_a, rows = stock()
    base = dict(quota_day=day, uploads_in_quota_day=done, stock_ready=n_ready, stock_a_level=n_a)
    st = read_status()
    if remaining <= 0:
        write_status(**base, last_result="all %d slots used" % SLOTS); print("quota day %s: all %d slots used" % (day, SLOTS)); return 0
    if st.get("quota_error_day") == day:
        write_status(**base, last_result="quota error seen earlier today; waiting for the next quota day"); print("quota error seen earlier today; skipping"); return 0
    if n_ready == 0:
        write_status(**base, last_result="NOTHING READY: stock is empty, %d slots unused" % remaining); print("stock empty"); return 4
    log_path = os.path.join(STATE, "runs", now.strftime("%Y%m%d-%H%M%S") + (".dry" if DRY else "") + ".log")
    log = open(log_path, "w")
    def say(*a):
        s = " ".join(str(x) for x in a); print(s); log.write(s + "\n"); log.flush()
    say("quota day %s | uploads so far %d | slots left %d | stock %d (A Level %d)" % (day, done, remaining, n_ready, n_a))
    # 1. what would go, and are those files readable?
    p = subprocess.run([sys.executable, os.path.join(ROOT, "scripts/ops/youtube_upload_ready.py"), "--dry-run", "--limit", str(remaining)], capture_output=True, text=True, cwd=ROOT, timeout=300)
    titles = [l[len("uploading "):].rsplit(" ", 2)[0].strip() for l in p.stdout.splitlines() if l.startswith("uploading ")]
    bad = []
    for t in titles:
        m = [r for r in rows if r.get("processedYouTubeTitle", "") == t and r.get("readyToPost") == "yes" and not r.get("youtubeId")]
        if len(m) != 1: bad.append((t, "not exactly one dataset row")); continue
        path = m[0].get("processedVideoPath", "")
        d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
        a = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
        try: ok = bool(d) and bool(a) and abs(float(d) - float(m[0]["processedDurationMin"]) * 60) < 90 and os.path.getsize(path) > 3e7
        except Exception: ok = False
        say(("OK  " if ok else "BAD ") + t[-60:])
        if not ok: bad.append((t, "unreadable, no audio, or length does not match the dataset"))
    if not titles or bad:
        why = "no files chosen" if not titles else "; ".join("%s (%s)" % (t[-40:], w) for t, w in bad)
        say("STOP, nothing uploaded:", why); write_status(**base, last_result="STOPPED before uploading: " + why); return 3
    if DRY:
        say("dry run: %d videos would be uploaded" % len(titles)); write_status(**base, last_result="dry run ok: %d would upload" % len(titles)); return 0
    # 2. upload
    r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts/ops/youtube_upload_ready.py"), "--limit", str(remaining)], capture_output=True, text=True, cwd=ROOT, timeout=3600)
    for l in r.stdout.splitlines():
        if l.startswith("uploading") or "->" in l or "rror" in l or "uota" in l: say(l[:160])
    for l in r.stderr.splitlines()[-6:]: say("stderr:", l[:160])
    got = uploads_since(start) - done
    quota = ("quota" in (r.stdout + r.stderr).lower()) and got < remaining
    say("uploaded %d of %d%s" % (got, remaining, " (quota error)" if quota else ""))
    if quota: write_status(quota_error_day=day)
    # 3. library import (only if something went up)
    imp = "skipped"
    if got > 0:
        i = subprocess.run([sys.executable, os.path.join(ROOT, "scripts/ops/recordings_import.py"), "--post"], capture_output=True, text=True, cwd=ROOT, timeout=300)
        imp = (i.stdout.strip().splitlines() or ["no output"])[-1][:120] if i.returncode == 0 else "FAILED: " + (i.stderr.strip().splitlines() or ["?"])[-1][:100]
        say("library import:", imp)
    n_ready, n_a, _ = stock()
    write_status(**{**base, "uploads_in_quota_day": done + got, "stock_ready": n_ready, "stock_a_level": n_a}, last_result="uploaded %d; import: %s" % (got, imp), last_run=now.isoformat(timespec="seconds"))
    return 0 if got == len(titles) else 5

if __name__ == "__main__":
    sys.exit(main())
