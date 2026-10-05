"use client";

import { useMemo } from "react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { formatDateTime } from "@/lib/formatDate";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { useAuditLog, type AuditEntry } from "@/ui2/queries/audit";
import { useUsers } from "@/ui2/queries/users";
import "@/ui2/features/accounts/accounts.css";

export const ENTITY_TYPES = ["Service", "User", "Invoice", "Paycheck", "Enrollment", "RescheduleRequest", "ApiKey"];
export const PAGE_SIZES = [25, 50, 100, 200];

/** The log is read-only and paged on the server (the table grows without limit). Entity type and actor filters go to the server too. */
export function AuditView() {
  const [offset, setOffset] = useQueryState("offset", parseAsInteger.withDefault(0));
  const [size, setSize] = useQueryState("size", parseAsInteger.withDefault(50));
  const [entityType, setEntityType] = useQueryState("entity", parseAsString.withDefault(""));
  const [actor, setActor] = useQueryState("actor", parseAsString.withDefault(""));
  const limit = PAGE_SIZES.includes(size) ? size : 50;
  const log = useAuditLog(limit, offset, entityType, actor);
  const users = useUsers();
  const nameOf = useMemo(() => {
    const m = new Map((users.data ?? []).map((u) => [u.UserID, u.Name]));
    return (id?: string) => (id ? m.get(id) || id : "—");
  }, [users.data]);

  const entries = log.data?.entries ?? [];
  const total = log.data?.total ?? 0;
  const columns: Column<AuditEntry>[] = [
    { id: "when", header: "When", width: 140, cell: (e) => formatDateTime(e.Timestamp) as string },
    { id: "actor", header: "Actor", width: 160, tip: (e) => nameOf(e.ActorUserID), cell: (e) => nameOf(e.ActorUserID) },
    { id: "action", header: "Action", width: 120, cell: (e) => e.Action },
    { id: "entity", header: "Entity", width: 190, tip: (e) => `${e.EntityType}${e.EntityID ? ` · ${e.EntityID}` : ""}`, cell: (e) => `${e.EntityType}${e.EntityID ? ` · ${e.EntityID}` : ""}` },
    { id: "summary", header: "Summary", tip: (e) => e.Summary, cell: (e) => e.Summary },
  ];
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <section className="u2-accounts">
      <h1>Audit Log</h1>
      <div className="u2-toolbar">
        <div className="u2-minw">
          <Combobox aria-label="Entity type" value={entityType} onChange={(v) => { void setEntityType(v || null); void setOffset(null); }} placeholder="All entity types" options={ENTITY_TYPES.map((t) => ({ value: t, label: t }))} />
        </div>
        <div className="u2-minw">
          <Combobox aria-label="Actor" value={actor} onChange={(v) => { void setActor(v || null); void setOffset(null); }} placeholder="Any actor" options={(users.data ?? []).filter((u) => u.UserType === "Management" || u.UserType === "Staff").map((u) => ({ value: u.UserID, label: u.Name }))} />
        </div>
        <label className="u2-muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Rows per page
          <select className="u2-input" style={{ width: 80 }} value={limit} onChange={(e) => { void setSize(Number(e.target.value)); void setOffset(null); }}>
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      {log.error ? (
        <div role="alert" className="u2-errorbox">
          Could not load the audit log: {log.error.message}{" "}
          <Button size="sm" variant="ghost" onClick={() => void log.refetch()}>Try again</Button>
        </div>
      ) : (
        <DataTable caption="Audit log" rows={entries} columns={columns} rowKey={(e) => e.AuditID} loading={log.isPending} emptyText="No entries." />
      )}
      <div className="u2-toolbar">
        <span className="u2-muted" aria-live="polite">{total === 0 ? "0" : `${from}–${to}`} of {total}</span>
        <span className="u2-toolbar__new u2-rowactions">
          <Button variant="ghost" disabled={offset === 0} onClick={() => void setOffset(Math.max(0, offset - limit) || null)}>Previous</Button>
          <Button variant="ghost" disabled={offset + limit >= total} onClick={() => void setOffset(offset + limit)}>Next</Button>
        </span>
      </div>
    </section>
  );
}
