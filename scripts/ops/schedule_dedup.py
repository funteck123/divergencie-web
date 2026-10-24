#!/usr/bin/env python3
"""Remove duplicate schedule rows (TKT-0373): several scheduleitems rows for one Occurrence and Date.

Two concurrent requests to ensureScheduleGenerated() could each insert the same class (lib/scheduleGen.js). Until the unique index in
data/tmp/migration_dedup_schedule_generation.sql exists, the duplicates come back and the index cannot be built over existing ones.

  python3 scripts/ops/schedule_dedup.py --plan     back up the tables, list what would be deleted, check nothing references it. Changes nothing.
  python3 scripts/ops/schedule_dedup.py --apply    do --plan, then delete the extra rows one by one through DELETE /api/schedule (audit-logged)

Keeps, for each (OccuranceID, Date), the copy that has attendance records, else a copy that another record points at, else the lowest ScheduleID. Refuses to delete a row that any
attendance record, reschedule request, invoice or paycheck mentions. Backup goes to backups/schedule-dedup-<time>/ first, always.
Needs SUPABASE_ACCESS_TOKEN and V7_SUPABASE_URL in the environment (load .env.local) and the Management token in ~/.dcp1/config.json.
"""
import collections, json, os, re, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = re.search(r"https://([a-z0-9]+)\.supabase\.co", os.environ["V7_SUPABASE_URL"]).group(1)
CFG = json.load(open(os.path.expanduser("~/.dcp1/config.json")))
BACKED_UP = ["scheduleitems", "attendanceitems", "reschedulerequests", "invoices", "paychecks"]


def sql(query):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{REF}/database/query", data=json.dumps({"query": query}).encode(),
                                 headers={"Authorization": "Bearer " + os.environ["SUPABASE_ACCESS_TOKEN"], "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=180))


def backup():
    folder = os.path.join(REPO, "backups", "schedule-dedup-" + time.strftime("%Y%m%d-%H%M%S"))
    os.makedirs(folder)
    for t in BACKED_UP:
        rows = sql(f"select id, data, updated_at from {t} order by id")
        json.dump(rows, open(os.path.join(folder, t + ".json"), "w"), ensure_ascii=False)
        print(f"  backed up {t}: {len(rows)} rows")
    return folder


def referenced_ids(ids):
    """Which of these ScheduleIDs are mentioned by a record in another table (attendance, reschedule request, invoice, paycheck)."""
    pattern = "|".join(re.escape(i) + '"' for i in ids)
    hit = set()
    for t in BACKED_UP[1:]:
        for r in sql(f"select data::text as t from {t} where data::text ~ '{pattern}'"):
            hit |= {i for i in ids if i + '"' in r["t"]}
    return hit


def plan():
    rows = sql("""
      with d as (select data->>'OccuranceID' o, data->>'Date' dt from scheduleitems where data->>'OccuranceID' is not null group by 1,2 having count(*) > 1)
      select s.id, s.data->>'OccuranceID' o, s.data->>'Date' dt,
             (select count(*) from attendanceitems a where a.data->>'ScheduleItemID' = s.id) att
      from scheduleitems s join d on d.o = s.data->>'OccuranceID' and d.dt = s.data->>'Date'""")
    groups = collections.defaultdict(list)
    for r in rows:
        groups[(r["o"], r["dt"])].append(r)
    used = referenced_ids([r["id"] for g in groups.values() for r in g])
    keep, drop = [], []
    for g in groups.values():
        # keep the copy with attendance, else a copy something else points at, else the lowest ScheduleID
        best = sorted(g, key=lambda r: (-int(r["att"]), r["id"] not in used, int(r["id"].split("-")[1])))[0]
        keep.append(best["id"])
        drop += [r["id"] for r in g if r["id"] != best["id"]]
    return groups, keep, drop


def references(ids):
    pattern = "|".join(re.escape(i) + '"' for i in ids)
    found = {}
    for t in BACKED_UP[1:]:
        n = sql(f"select count(*) as n from {t} where data::text ~ '{pattern}'")[0]["n"]
        if int(n):
            found[t] = int(n)
    return found


def main():
    if "--plan" not in sys.argv and "--apply" not in sys.argv:
        sys.exit(__doc__)
    print("backup:"); folder = backup(); print("  ->", folder)
    groups, keep, drop = plan()
    print(f"{len(groups)} duplicate groups, {sum(len(g) for g in groups.values())} rows: keep {len(keep)}, delete {len(drop)}")
    refs = references(drop)
    print("rows that mention a row to delete:", refs or "none")
    json.dump({"keep": keep, "delete": drop}, open(os.path.join(folder, "plan.json"), "w"))
    if refs:
        sys.exit("STOP: something references a row that would be deleted. Nothing was changed.")
    if "--apply" not in sys.argv:
        return
    base = CFG["baseUrl"].rstrip("/")
    for n, sid in enumerate(drop, 1):
        req = urllib.request.Request(base + "/api/schedule", data=json.dumps({"scheduleId": sid}).encode(), method="DELETE",
                                     headers={"Authorization": "Bearer " + CFG["token"], "Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=180).read()
        except Exception as e:
            sys.exit(f"STOP at {sid} ({n} of {len(drop)}): {e}. {n - 1} rows deleted so far; the backup is {folder}")
        if n % 10 == 0 or n == len(drop):
            print(f"  deleted {n} of {len(drop)}")
    left = sql("select count(*) as n from (select 1 from scheduleitems where data->>'OccuranceID' is not null group by data->>'OccuranceID', data->>'Date' having count(*) > 1) t")[0]["n"]
    print("duplicate groups left:", left)


if __name__ == "__main__":
    main()
