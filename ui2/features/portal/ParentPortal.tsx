"use client";

import { useMemo } from "react";
import { formatDate } from "@/lib/formatDate";
import { Badge } from "@/ui2/components/Badge";
import { DataTable, type Column } from "@/ui2/components/DataTable";
import { useBillActions } from "@/ui2/queries/portalActions";
import { useMe, useReloadMe } from "@/ui2/queries/me";
import type { SessionUser } from "@/ui2/components/RequireUser";
import type { AttendanceItem, MeBundle } from "@/ui2/queries/types";
import { BillsCard } from "./BillsCard";
import { Card, GuidesCard, MyInfoCard } from "./Cards";
import { enrolledServices } from "./portalLogic";
import { ScheduleCard } from "./ScheduleCard";

type Child = NonNullable<MeBundle["children"]>[number];

/** A parent sees each linked child's schedule (read only, with reschedule requests), attendance and invoices, and can mark an invoice paid. */
export function ParentPortal({ user }: { user: SessionUser }) {
  const me = useMe(user.UserID);
  const reload = useReloadMe(user.UserID);
  const actions = useBillActions(user.UserID);
  const data = me.data;
  if (me.error) return <p role="alert" className="u2-errorbox">Could not load your dashboard: {me.error.message}</p>;
  if (!data) return <div className="u2-skeleton" style={{ height: 240 }} aria-busy="true" />;
  const children = data.children ?? [];
  return (
    <div className="u2-accounts">
      <MyInfoCard user={data.user} linkedChildren={children.map((c) => c.student).filter((s): s is NonNullable<typeof s> => !!s)} />
      <GuidesCard guides={data.guides} />
      {children.length === 0 ? <Card title="Children"><p className="u2-muted">No children linked to this account yet.</p></Card> : children.map((c) => <ChildSection key={c.student?.UserID} child={c} data={data} parent={user} actions={actions} onChanged={() => void reload()} />)}
    </div>
  );
}

function ChildSection({ child, data, parent, actions, onChanged }: { child: Child; data: MeBundle; parent: SessionUser; actions: ReturnType<typeof useBillActions>; onChanged: () => void }) {
  const student = child.student;
  const services = useMemo(() => enrolledServices(child.enrollments, data.services), [child.enrollments, data.services]);
  const sessionOf = (id: string) => child.schedule.find((s) => s.ScheduleID === id);
  const cols: Column<AttendanceItem>[] = [
    { id: "service", header: "Service", cell: (a) => sessionOf(a.ScheduleItemID)?.ServiceName || "—" },
    { id: "date", header: "Date", width: 96, cell: (a) => formatDate(a.Date) as string },
    { id: "time", header: "Time", width: 70, cell: (a) => sessionOf(a.ScheduleItemID)?.Time || "—" },
    { id: "who", header: "Instructor", width: 140, cell: (a) => sessionOf(a.ScheduleItemID)?.Facilitator || "—" },
    { id: "status", header: "Status", width: 90, cell: (a) => <Badge kind={a.Status === "Present" ? "success" : a.Status === "Late" ? "warning" : "error"}>{a.Status}</Badge> },
    { id: "hrs", header: "Hours", width: 60, numeric: true, cell: (a) => a.LoggedDuration },
  ];
  return (
    <>
      <ScheduleCard
        user={{ UserID: parent.UserID, Name: parent.Name, UserType: "Parent", Timezone: undefined }}
        subject={student ? { UserID: student.UserID, Name: student.Name } : undefined}
        services={services}
        scheduleItems={child.schedule}
        attendance={child.attendance}
        rescheduleRequests={child.rescheduleRequests ?? []}
        readOnly
        rangeMode="past"
        attendanceMode="none"
        ownTimezone={false}
        onChanged={onChanged}
      />
      <Card title={`Attendance: ${student?.Name ?? ""}`}>
        <DataTable caption="Attendance" rows={child.attendance} columns={cols} rowKey={(a) => a.AttendanceID} emptyText="No attendance logged." />
      </Card>
      <BillsCard kind="invoice" title={`Invoices: ${student?.Name ?? ""}`} bills={child.invoices} services={data.services ?? []} currency={student?.Currency || "INR"} onMarkUnpaid={actions.markUnpaid} onConfirmPaid={actions.confirmPaid} />
    </>
  );
}
