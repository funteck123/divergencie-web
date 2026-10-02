"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { rateById } from "@/lib/billing";
import { roleGroupOf } from "@/lib/client";
import { formatDate } from "@/lib/formatDate";
import { Button } from "@/ui2/components/Button";
import { ConfirmDialog } from "@/ui2/components/ConfirmDialog";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { useDeleteEnrollment, useEnrollments } from "@/ui2/queries/enrollments";
import { useServices } from "@/ui2/queries/services";
import type { EnrollmentRecord, ServiceRecord, UserRecord } from "@/ui2/queries/types";
import { useUsers } from "@/ui2/queries/users";
import "@/ui2/features/accounts/accounts.css";
import { ALL_GROUPS } from "@/ui2/features/services/serviceForm";
import { batchesFor } from "./enrollLogic";
import { EnrollmentEditSheet } from "./EnrollmentEditSheet";
import { EnrollSheet } from "./EnrollSheet";

interface Row extends EnrollmentRecord {
  _person: string;
  _service: string;
  _batch: string;
  _rate: string;
}

export function EnrollmentsView() {
  const users = useUsers();
  const services = useServices();
  const enrollments = useEnrollments();
  const del = useDeleteEnrollment();
  const [group, setGroup] = useQueryState("group", parseAsString.withDefault("Student"));
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
  const deferredQ = useDeferredValue(q);
  const [enrolling, setEnrolling] = useState(false);
  const [editing, setEditing] = useState<EnrollmentRecord | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);

  const g = (ALL_GROUPS as readonly string[]).includes(group) ? group : "Student";
  const people = useMemo<UserRecord[]>(() => (users.data ?? []).filter((u) => (ALL_GROUPS as readonly string[]).includes(roleGroupOf(u) as string)), [users.data]);
  const svcList = useMemo<ServiceRecord[]>(() => services.data ?? [], [services.data]);

  const nameOf = (id: string) => people.find((u) => u.UserID === id)?.Name || id;
  const serviceOf = (id: string) => svcList.find((s) => s.ServiceID === id);

  const rows = useMemo<Row[]>(() => {
    const inGroup = new Set(people.filter((u) => roleGroupOf(u) === g).map((u) => u.UserID));
    const needle = deferredQ.trim().toLowerCase();
    return (enrollments.data ?? [])
      .filter((e) => inGroup.has(e.UserID))
      .map<Row>((e) => {
        const svc = serviceOf(e.ServiceID);
        const batch = batchesFor(svc).find((b) => b.BatchID === e.BatchID);
        const rate = e.Currency ? `${e.Currency} ${(rateById(svc, e.BatchID, e.RateID) as { Rate?: number | string } | undefined)?.Rate ?? ""}` : "";
        return { ...e, _person: nameOf(e.UserID), _service: svc?.Name ?? e.ServiceID, _batch: batch?.BatchName || e.BatchID || "—", _rate: rate };
      })
      .filter((r) => !needle || r._person.toLowerCase().includes(needle) || r._service.toLowerCase().includes(needle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments.data, people, svcList, g, deferredQ]);

  const columns = useMemo<Column<Row>[]>(
    () => [
      { id: "person", header: "Person", width: 170, sortValue: (r) => r._person, tip: (r) => r._person, cell: (r) => <strong className="u2-strong">{r._person}</strong> },
      { id: "service", header: "Service", sortValue: (r) => r._service, tip: (r) => r._service, cell: (r) => r._service },
      { id: "batch", header: "Batch", width: 90, sortValue: (r) => r._batch, cell: (r) => r._batch },
      { id: "rate", header: "Rate", width: 110, numeric: true, sortValue: (r) => r._rate, cell: (r) => r._rate || "—" },
      { id: "start", header: "Start", width: 110, numeric: true, sortValue: (r) => r.StartDate ?? "", cell: (r) => (r.StartDate ? (formatDate(r.StartDate) as string) : "—") },
      { id: "end", header: "End", width: 110, numeric: true, sortValue: (r) => r.EndDate ?? "", cell: (r) => (r.EndDate ? (formatDate(r.EndDate) as string) : "—") },
      {
        id: "actions", header: "", title: "Actions", width: 130,
        cell: (r) => (
          <span className="u2-rowactions">
            <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" className="u2-danger-text" onClick={() => setRemoving(r)}>
              Delete
            </Button>
          </span>
        ),
      },
    ],
    [],
  );

  const loading = users.isPending || services.isPending || enrollments.isPending;
  const failed = users.error ?? services.error ?? enrollments.error;
  const counts = useMemo(() => {
    const byUser = new Map(people.map((u) => [u.UserID, roleGroupOf(u) as string]));
    const m = new Map<string, number>();
    for (const e of enrollments.data ?? []) m.set(byUser.get(e.UserID) ?? "", (m.get(byUser.get(e.UserID) ?? "") ?? 0) + 1);
    return m;
  }, [people, enrollments.data]);

  return (
    <section className="u2-accounts">
      <h1>Enrollments</h1>
      <div className="u2-seg" role="tablist" aria-label="Enrollment group">
        {ALL_GROUPS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={name === g} className="u2-seg__btn" onClick={() => void setGroup(name)}>
            {name}
            <span className="u2-seg__count">{counts.get(name) ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="u2-toolbar">
        <input type="search" className="u2-search" placeholder={`Search ${g.toLowerCase()} enrollments…`} aria-label="Search enrollments" value={q} onChange={(e) => void setQ(e.target.value || null)} />
        <span className="u2-muted" aria-live="polite">
          {rows.length} enrollments
        </span>
        <Button variant="primary" className="u2-toolbar__new" onClick={() => setEnrolling(true)}>
          Enroll a {g}
        </Button>
      </div>

      {failed ? (
        <div role="alert" className="u2-errorbox">
          Could not load enrollments: {failed.message}
        </div>
      ) : (
        <DataTable caption={`${g} enrollments`} rows={rows} columns={columns} rowKey={(r) => r.EnrolmentID} loading={loading} initialSort={{ id: "person", dir: "asc" }} emptyText={`No ${g.toLowerCase()} enrollments yet.`} />
      )}

      <EnrollSheet open={enrolling} group={g} people={people.filter((u) => roleGroupOf(u) === g)} services={svcList} onClose={() => setEnrolling(false)} />
      <EnrollmentEditSheet enrollment={editing} users={people} services={svcList} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove enrollment?"
        description={removing ? `Remove ${removing._person}'s enrollment in ${removing._service}?` : ""}
        confirmLabel="Yes, remove"
        danger
        onConfirm={async () => {
          if (!removing) return;
          await del.mutateAsync(removing.EnrolmentID);
          toast.success("Enrollment removed.");
        }}
      />
    </section>
  );
}
