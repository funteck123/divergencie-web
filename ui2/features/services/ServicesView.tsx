"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { Button } from "@/ui2/components/Button";
import { ConfirmDialog } from "@/ui2/components/ConfirmDialog";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import type { ServiceRecord } from "@/ui2/queries/types";
import { useDeleteService, useServices } from "@/ui2/queries/services";
import { useUsers } from "@/ui2/queries/users";
import "@/ui2/features/accounts/accounts.css";
import { ExpandList } from "./ExpandList";
import { ALL_GROUPS } from "./serviceForm";
import { ServiceSheet, type SheetTarget } from "./ServiceSheet";
import { ServiceTree } from "./ServiceTree";
import { groupLabel, inGroup, leavesOf, occurrenceText, rateText } from "./serviceSummary";
import "./services.css";

export function ServicesView() {
  const { data: services, error, isPending, refetch } = useServices();
  const { data: users } = useUsers();
  const del = useDeleteService();
  const [group, setGroup] = useQueryState("group", parseAsString.withDefault("Student"));
  const [view, setView] = useQueryState("view", parseAsString.withDefault("tree"));
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const deferredQ = useDeferredValue(q);
  const [sheet, setSheet] = useState<SheetTarget>(null);
  const [deleting, setDeleting] = useState<ServiceRecord | null>(null);

  const all = useMemo(() => services ?? [], [services]);
  const g = (ALL_GROUPS as readonly string[]).includes(group) ? group : "Student";
  const rows = useMemo(() => {
    const needle = deferredQ.trim().toLowerCase();
    return all.filter((s) => inGroup(s, g)).filter((s) => (s.Name || "").toLowerCase().includes(needle));
  }, [all, g, deferredQ]);
  const countOf = (name: string) => all.filter((s) => inGroup(s, name)).length;

  const columns = useMemo<Column<ServiceRecord>[]>(() => {
    const cohort = g === "Student" || g === "Teacher";
    return [
      { id: "id", header: "ID", width: 84, sortValue: (s) => s.ServiceID, cell: (s) => <span className="u2-mono">{s.ServiceID}</span> },
      { id: "name", header: "Name", sortValue: (s) => s.Name, tip: (s) => s.Name, cell: (s) => <strong className="u2-strong">{s.Name}</strong> },
      { id: "group", header: "Group", width: 120, sortValue: (s) => groupLabel(s), cell: (s) => groupLabel(s) },
      { id: "type", header: "Type", width: 100, sortValue: (s) => s.Type, cell: (s) => s.Type },
      ...(cohort
        ? ([
            { id: "board", header: "Board", width: 90, sortValue: (s) => s.Board ?? "", cell: (s) => s.Board || "—" },
            { id: "course", header: "Course", width: 90, sortValue: (s) => s.Course ?? "", cell: (s) => s.Course || "—" },
            { id: "subject", header: "Subject", width: 130, sortValue: (s) => s.SubjectName ?? "", tip: (s) => s.SubjectName, cell: (s) => s.SubjectName || "—" },
            { id: "batches", header: "Batches", width: 130, sortValue: (s) => leavesOf(s).length, cell: (s) => { const l = leavesOf(s); return l.length === 1 ? l[0]?.batchName || "—" : `${l.length} batches`; } },
          ] satisfies Column<ServiceRecord>[])
        : ([
            { id: "role", header: "Role", width: 150, sortValue: (s) => s.Role ?? "", cell: (s) => s.Role || "—" },
            { id: "department", header: "Department", width: 110, sortValue: (s) => s.Department ?? "", cell: (s) => s.Department || "—" },
          ] satisfies Column<ServiceRecord>[])),
      { id: "rates", header: "Rate", width: 170, cell: (s) => { const l = leavesOf(s); return l.length === 1 ? <ExpandList items={l[0]?.rates.map(rateText) ?? []} label="rates" /> : "—"; } },
      { id: "occ", header: "Occurrences", width: 190, cell: (s) => { const l = leavesOf(s); return l.length === 1 ? <ExpandList items={l[0]?.occurrences.map(occurrenceText) ?? []} label="occurrences" /> : "—"; } },
      {
        id: "actions", header: "", title: "Actions", width: 120,
        cell: (s) => (
          <span className="u2-rowactions">
            <Button size="sm" variant="ghost" onClick={() => setSheet({ mode: "edit", service: s })}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" className="u2-danger-text" onClick={() => setDeleting(s)}>
              Delete
            </Button>
          </span>
        ),
      },
    ];
  }, [g]);

  return (
    <section className="u2-accounts">
      <h1>Services</h1>
      <div className="u2-seg" role="tablist" aria-label="Service group">
        {ALL_GROUPS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={name === g} className="u2-seg__btn" onClick={() => void setGroup(name)}>
            {name}
            <span className="u2-seg__count">{countOf(name)}</span>
          </button>
        ))}
      </div>
      <div className="u2-toolbar">
        <input type="search" className="u2-search" placeholder="Search services by name…" aria-label="Search services" value={q} onChange={(e) => void setQ(e.target.value || null)} />
        <div className="u2-seg" role="group" aria-label="View">
          <button type="button" className="u2-seg__btn" aria-pressed={view !== "table"} data-on={view !== "table"} onClick={() => void setView("tree")}>
            Tree
          </button>
          <button type="button" className="u2-seg__btn" aria-pressed={view === "table"} data-on={view === "table"} onClick={() => void setView("table")}>
            Table
          </button>
        </div>
        <Button variant="primary" className="u2-toolbar__new" onClick={() => setSheet({ mode: "create" })}>
          New service
        </Button>
      </div>

      {error ? (
        <div role="alert" className="u2-errorbox">
          Could not load services: {error.message}{" "}
          <Button size="sm" variant="ghost" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : isPending ? (
        <DataTable caption="Services" rows={[]} columns={columns} rowKey={(s) => s.ServiceID} loading />
      ) : view === "table" ? (
        <DataTable caption={`${g} services`} rows={rows} columns={columns} rowKey={(s) => s.ServiceID} initialSort={{ id: "id", dir: "asc" }} emptyText="No services." />
      ) : (
        <ServiceTree groupName={g} services={rows} onEdit={(s) => setSheet({ mode: "edit", service: s })} onDelete={setDeleting} />
      )}

      <ServiceSheet target={sheet} users={users ?? []} onClose={() => setSheet(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.Name ?? "service"}?`}
        description="Only possible if no enrollment has ever referenced it. If one has, the server refuses and says so here."
        confirmLabel="Delete service"
        danger
        onConfirm={async () => {
          if (!deleting) return;
          await del.mutateAsync(deleting.ServiceID);
          toast.success(`Deleted ${deleting.Name}.`);
        }}
      />
    </section>
  );
}
