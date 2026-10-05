"use client";

import { Skeleton } from "@/ui2/components/Skeleton";
import { useMemo } from "react";
import { useBillActions } from "@/ui2/queries/portalActions";
import { useMe, useReloadMe } from "@/ui2/queries/me";
import type { SessionUser } from "@/ui2/components/RequireUser";
import { BillsCard } from "./BillsCard";
import { EnrollmentsCard, GuidesCard, MyInfoCard, ResourcesCard, StaffResourcesCard } from "./Cards";
import { enrolledServices } from "./portalLogic";
import { ScheduleCard } from "./ScheduleCard";

export type PortalRole = "Student" | "Teacher" | "Staff" | "Ambassador";

/** The five-card dashboard Student, Teacher, Staff and Ambassador share. What differs (resources, attendance, bills) is chosen by role. */
export function RolePortal({ role, user }: { role: PortalRole; user: SessionUser }) {
  const me = useMe(user.UserID);
  const reload = useReloadMe(user.UserID);
  const actions = useBillActions(user.UserID);
  const data = me.data;
  const services = useMemo(() => enrolledServices(data?.enrollments, data?.services), [data]);

  if (me.error) return <p role="alert" className="u2-errorbox">Could not load your dashboard: {me.error.message}</p>;
  if (!data) return <Skeleton height={240} />;
  const u = data.user;
  const student = role === "Student";
  const allServices = data.services ?? [];

  return (
    <div className="u2-accounts">
      <MyInfoCard user={u} />
      <EnrollmentsCard services={services} />
      {role === "Staff" ? <StaffResourcesCard user={u} /> : <ResourcesCard services={services} user={u} showExternalTools={student} />}
      <GuidesCard guides={data.guides} />
      <ScheduleCard
        user={{ UserID: user.UserID, Name: user.Name, UserType: role, Timezone: u.Timezone }}
        services={services}
        scheduleItems={data.scheduleItems ?? []}
        attendance={data.attendanceItems ?? []}
        rescheduleRequests={data.rescheduleRequests ?? []}
        rangeMode={student || role === "Teacher" ? "select" : "past"}
        attendanceMode={student || role === "Teacher" ? "panel" : "quick"}
        showImage={role !== "Ambassador"}
        showDay={student}
        onChanged={() => void reload()}
      />
      {student ? (
        <BillsCard kind="invoice" title="My Invoices" bills={data.invoices} services={allServices} currency={u.Currency || "INR"} email={u.Email} onMarkUnpaid={actions.markUnpaid} onConfirmPaid={actions.confirmPaid} />
      ) : (
        <BillsCard kind="paycheck" title="My Paychecks" bills={data.paychecks} services={allServices} currency={u.Currency || "INR"} onMarkReceived={actions.markReceived} />
      )}
    </div>
  );
}
