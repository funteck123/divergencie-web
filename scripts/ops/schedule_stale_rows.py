#!/usr/bin/env python3
"""Remove stale schedule rows that make one slot show two sessions (TKT-0373).

An occurrence (a weekly slot of a batch) can change its day or time. The rows made for its old slot stay behind, so a week shows the real
session and a stale copy of it on the same slot. A row is STALE when its weekday or time no longer matches its occurrence's current Day and Time.
Only stale rows that sit in a slot with another session are considered, and a row that any attendance record, reschedule request, invoice or
paycheck mentions is never touched.

  python3 scripts/ops/schedule_stale_rows.py --plan     back up, list what would be deleted and why. Changes nothing.
  python3 scripts/ops/schedule_stale_rows.py --apply --only SCH-1 SCH-2 ...
                                                        do --plan, then delete exactly the listed rows one by one through DELETE /api/schedule
                                                        (audit-logged). Every id must be in the plan's stale set, or nothing is deleted.

Needs SUPABASE_ACCESS_TOKEN and V7_SUPABASE_URL in the environment (load .env.local) and the Management token in ~/.dcp1/config.json.
"""
import collections, datetime, json, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schedule_dedup as base  # sql(), backup(), referenced_ids(), CFG

CFG = base.CFG
API = CFG["baseUrl"].rstrip("/")
H = {"Authorization": "Bearer " + CFG["token"]}


def get(path, key):
    return json.load(urllib.request.urlopen(urllib.request.Request(API + path, headers=H), timeout=120)).get(key, [])


def occurrence_config(services):
    """{OccuranceID: (Day, Time)} from every batch and every service-level occurrence list."""
    out = {}
    for s in services:
        lists = [s.get("OccuranceList") or []]
        for comp in s.get("OptionalComponents") or []:
            for b in comp.get("Batches") or []:
                lists.append(b.get("OccuranceList") or [])
        for lst in lists:
            for o in lst:
                if o.get("OccuranceID"):
                    out[o["OccuranceID"]] = (o.get("Day"), o.get("Time"))
    return out


def plan():
    sched = get("/api/schedule", "scheduleItems")
    cfg = occurrence_config(get("/api/services", "services"))
    slots = collections.defaultdict(list)
    for s in sched:
        if s.get("OccuranceID"):
            slots[(s["ServiceID"], s.get("BatchID") or "", s.get("RescheduledDate") or s["Date"], s.get("RescheduledTime") or s["Time"])].append(s)
    stale, keep_note = [], []
    for slot, rows in slots.items():
        if len(rows) < 2:
            continue
        def is_current(r):
            day, time = cfg.get(r["OccuranceID"], (None, None))
            return day == datetime.date.fromisoformat(r["Date"]).strftime("%A") and time == r["Time"] and not r.get("RescheduledDate")
        current = [r for r in rows if is_current(r)]
        old = [r for r in rows if not is_current(r)]
        if len(current) == 1 and old:  # exactly one real session in the slot, the rest are leftovers
            stale += old
        else:
            keep_note.append((slot, [r["ScheduleID"] for r in rows], "cannot tell which row is the real one" if len(current) != 1 else ""))
    return stale, keep_note


def main():
    if "--plan" not in sys.argv and "--apply" not in sys.argv:
        sys.exit(__doc__)
    print("backup:"); folder = base.backup(); print("  ->", folder)
    stale, unclear = plan()
    ids = [r["ScheduleID"] for r in stale]
    print(f"{len(ids)} stale rows in doubled slots; slots left alone because the real row is unclear: {len(unclear)}")
    for r in sorted(stale, key=lambda r: (r["ServiceID"], r["Date"])):
        print(f"  {r['ScheduleID']} {r['ServiceID']} {r.get('BatchID') or '-'} {r['OccuranceID']} {r['Date']} {datetime.date.fromisoformat(r['Date']).strftime('%a')} {r['Time']}")
    for u in unclear:
        print("  unclear:", u)
    used = base.referenced_ids(ids) if ids else set()
    print("rows that something else mentions (never deleted):", sorted(used) or "none")
    todo = [i for i in ids if i not in used]
    if "--only" in sys.argv:
        wanted = [a for a in sys.argv[sys.argv.index("--only") + 1:] if a.startswith("SCH-")]
        outside = [w for w in wanted if w not in todo]
        if outside:
            sys.exit(f"STOP: these ids are not in the verified stale set, nothing deleted: {outside}")
        todo = wanted
    elif "--apply" in sys.argv:
        sys.exit("--apply needs --only <ids>, so the exact rows to delete are named by the caller")
    json.dump({"delete": todo, "mentioned": sorted(used), "unclear": [list(map(str, u)) for u in unclear]}, open(os.path.join(folder, "stale_plan.json"), "w"))
    if "--apply" not in sys.argv:
        return
    for n, sid in enumerate(todo, 1):
        req = urllib.request.Request(API + "/api/schedule", data=json.dumps({"scheduleId": sid}).encode(), method="DELETE", headers={**H, "Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=180).read()
        except Exception as e:
            sys.exit(f"STOP at {sid} ({n} of {len(todo)}): {e}. {n - 1} deleted so far; backup {folder}")
        print(f"  deleted {n} of {len(todo)}: {sid}", flush=True)
    left = len(plan()[0])
    print("stale rows left:", left)


if __name__ == "__main__":
    main()
