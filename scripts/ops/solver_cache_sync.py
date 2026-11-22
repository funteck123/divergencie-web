#!/usr/bin/env python3
"""TKT-0420: keep a saved copy of Question Solver worksheets in the private Supabase bucket "solver-cache", so they open when the owner's machine is off.

For each chosen worksheet it asks the LOCAL Question Solver (http://localhost:5178) for the exact reply the page gets (questions, answers, answer-key warnings),
re-encodes every question image from PNG to AVIF (quality 45, full width, measured: about 23 percent of the PNG size, text and thin lines intact),
and stores it as papers/<qpId>.json, then rewrites index.json (which papers are saved, and the library shape for the picker).

  python3 scripts/ops/solver_cache_sync.py --pilot --dry-run          # one worksheet, nothing leaves this machine, files go to data/ops-work/t420/out/
  python3 scripts/ops/solver_cache_sync.py --pilot --create-bucket    # create the private bucket if missing, upload the pilot
  python3 scripts/ops/solver_cache_sync.py --two-per-chapter          # 2 worksheets per chapter of every subject
  python3 scripts/ops/solver_cache_sync.py --all                      # every MCQ worksheet (about 100 MB as AVIF)
  python3 scripts/ops/solver_cache_sync.py --paper <qpId> ...         # named worksheets

Safe to re-run: a paper whose reply has not changed (same hash) is skipped; a changed one is replaced, so no stale copy stays. Only the bucket "solver-cache" is touched.
The service key is read from .env.local (V7_SUPABASE_URL, V7_SUPABASE_SERVICE_ROLE_KEY) and never printed."""
import argparse, base64, hashlib, io, json, os, re, sys, time, urllib.error, urllib.request
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BUCKET = "solver-cache"; LOCAL = os.environ.get("SOLVER_LOCAL", "http://localhost:5178")
OUT = os.path.join(ROOT, "data", "ops-work", "t420", "out")

def load_env():
    env = dict(os.environ)
    try:
        for line in open(os.path.join(ROOT, ".env.local"), encoding="utf8"):
            m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
            if m and m.group(1) not in env: env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    except OSError: pass
    return env

def http(method, url, headers=None, data=None, timeout=300):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r: return r.status, r.read()
    except urllib.error.HTTPError as e: return e.code, e.read()

def local_json(path, body=None):
    st, raw = http("POST" if body is not None else "GET", LOCAL + path, {"Content-Type": "application/json"}, json.dumps(body).encode() if body is not None else None)
    if st != 200: raise SystemExit(f"local Question Solver answered {st} for {path}")
    return json.loads(raw)

def png_to_avif_uri(uri, quality):
    head, b64 = uri.split(",", 1)
    im = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB"); buf = io.BytesIO(); im.save(buf, "AVIF", quality=quality, speed=6)
    back = Image.open(io.BytesIO(buf.getvalue())); assert back.size == im.size, "AVIF size differs from the original"
    return "data:image/avif;base64," + base64.b64encode(buf.getvalue()).decode(), im.size, len(base64.b64decode(b64)), len(buf.getvalue())

def walk(lib):
    for board, subs in lib.items():
        for subject, comps in subs.items():
            for comp, papers in comps.items():
                for p in papers: yield board, subject, comp, p

def chapter_of(title):
    m = re.search(r"Ch\s*([\d.]+)", title, re.I) or re.match(r"^([\d.]+)-", title); return m.group(1) if m else "?"
def worksheet_of(title):
    m = re.search(r"Worksheet\s*(\d+)", title, re.I); return int(m.group(1)) if m else 0

def choose(lib, a):
    allp = list(walk(lib)); chosen = {}
    if a.paper:
        for b, s, c, p in allp:
            if p["qpId"] in a.paper: chosen[p["qpId"]] = (b, s, c, p)
    if a.pilot:
        for b, s, c, p in allp:
            if b == "IGCSE" and s == "Physics" and re.search(r"Ch1\.1\b", p["title"]) and worksheet_of(p["title"]) == 1: chosen[p["qpId"]] = (b, s, c, p); break
    if a.two_per_chapter:
        groups = {}
        for b, s, c, p in allp: groups.setdefault((b, s, chapter_of(p["title"])), []).append((b, s, c, p))
        for g in groups.values():
            for b, s, c, p in sorted(g, key=lambda t: (worksheet_of(t[3]["title"]), t[3]["title"]))[:2]: chosen[p["qpId"]] = (b, s, c, p)
    if a.all:
        for b, s, c, p in allp: chosen[p["qpId"]] = (b, s, c, p)
    return chosen

class Store:
    def __init__(self, env, dry):
        self.dry = dry; self.url = (env.get("V7_SUPABASE_URL") or "").rstrip("/"); self.key = env.get("V7_SUPABASE_SERVICE_ROLE_KEY") or ""
        if not dry and not (self.url and self.key): raise SystemExit("V7_SUPABASE_URL / V7_SUPABASE_SERVICE_ROLE_KEY missing in .env.local")
    def h(self, extra=None): return {"Authorization": "Bearer " + self.key, "apikey": self.key, **(extra or {})}
    def bucket_exists(self): return http("GET", f"{self.url}/storage/v1/bucket/{BUCKET}", self.h())[0] == 200
    def create_bucket(self):
        body = json.dumps({"id": BUCKET, "name": BUCKET, "public": False, "file_size_limit": 10 * 1024 * 1024, "allowed_mime_types": ["application/json"]}).encode()
        st, raw = http("POST", f"{self.url}/storage/v1/bucket", self.h({"Content-Type": "application/json"}), body); print("create bucket:", st, raw[:120].decode("utf8", "replace")); return st in (200, 201)
    def get(self, path):
        if self.dry: p = os.path.join(OUT, path.replace("/", "__")); return open(p, "rb").read() if os.path.exists(p) else None
        st, raw = http("GET", f"{self.url}/storage/v1/object/authenticated/{BUCKET}/{path}", self.h()); return raw if st == 200 else None
    def put(self, path, data):
        if self.dry: os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, path.replace("/", "__")), "wb").write(data); return True
        st, raw = http("POST", f"{self.url}/storage/v1/object/{BUCKET}/{path}", self.h({"Content-Type": "application/json", "x-upsert": "true"}), data)
        if st not in (200, 201): print("  upload failed", path, st, raw[:160].decode("utf8", "replace"))
        return st in (200, 201)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--pilot", action="store_true"); ap.add_argument("--two-per-chapter", action="store_true"); ap.add_argument("--all", action="store_true")
    ap.add_argument("--paper", nargs="*"); ap.add_argument("--quality", type=int, default=45); ap.add_argument("--dry-run", action="store_true"); ap.add_argument("--create-bucket", action="store_true")
    a = ap.parse_args()
    if not (a.pilot or a.two_per_chapter or a.all or a.paper): ap.error("choose --pilot, --two-per-chapter, --all or --paper")
    store = Store(load_env(), a.dry_run)
    if not a.dry_run and not store.bucket_exists():
        if not a.create_bucket: raise SystemExit(f'bucket "{BUCKET}" does not exist yet; run once with --create-bucket')
        if not store.create_bucket(): raise SystemExit("could not create the bucket")
    lib = local_json("/api/library"); chosen = choose(lib, a); print(f"chosen {len(chosen)} worksheet(s)")
    raw_index = store.get("index.json"); index = json.loads(raw_index) if raw_index else {"version": 1, "papers": {}}
    tot_png = tot_avif = tot_json = done = skipped = 0
    for qp, (board, subject, comp, p) in chosen.items():
        t0 = time.time(); reply = local_json("/api/fetch-and-digitize", {"qpId": p["qpId"], "msId": p.get("msId", "")})
        h = hashlib.sha256((json.dumps(reply, sort_keys=True) + f"|q{a.quality}").encode()).hexdigest()[:16]
        if index["papers"].get(qp, {}).get("hash") == h: skipped += 1; print(f"  same   {p['title'][:60]}"); continue
        qs = []; png = avif = 0
        for q in reply["questions"]:
            q = dict(q)
            if isinstance(q.get("image"), str) and q["image"].startswith("data:image/png"):
                q["image"], size, bp, ba = png_to_avif_uri(q["image"], a.quality); png += bp; avif += ba
            qs.append(q)
        stored = {**{k: v for k, v in reply.items() if k != "questions"}, "questions": qs, "savedCopy": {"format": "avif", "quality": a.quality, "hash": h, "savedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}}
        data = json.dumps(stored, separators=(",", ":")).encode()
        if not store.put(f"papers/{qp}.json", data): continue
        index["papers"][qp] = {"board": board, "subject": subject, "component": comp, "title": p["title"], "qpId": qp, "msId": p.get("msId"), "qpName": p.get("qpName"), "msName": p.get("msName"), "questions": len(qs), "bytes": len(data), "hash": h}
        done += 1; tot_png += png; tot_avif += avif; tot_json += len(data)
        print(f"  saved  {p['title'][:56]:56} {len(qs):3} q  PNG {png/1e3:7.0f} KB -> AVIF {avif/1e3:6.0f} KB  json {len(data)/1e3:6.0f} KB  {time.time()-t0:4.1f}s")
    # rebuild the library shape from every saved paper
    library = {}
    for e in index["papers"].values():
        library.setdefault(e["board"], {}).setdefault(e["subject"], {}).setdefault(e["component"], []).append({k: e[k] for k in ("title", "qpId", "qpName", "msId", "msName") if e.get(k)} | {"cached": True})
    index["library"] = library; index["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()); index["totalBytes"] = sum(e["bytes"] for e in index["papers"].values())
    store.put("index.json", json.dumps(index, separators=(",", ":")).encode())
    print(f"done: saved {done}, unchanged {skipped} | PNG {tot_png/1e6:.1f} MB -> AVIF {tot_avif/1e6:.1f} MB, stored {tot_json/1e6:.2f} MB | bucket now holds {len(index['papers'])} paper(s), {index['totalBytes']/1e6:.1f} MB")

if __name__ == "__main__": main()
