"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { keys } from "./keys";
import type { AttendanceItem, RescheduleRequest, RosterPerson, ScheduleItem } from "./types";

export interface ScheduleData {
  scheduleItems: ScheduleItem[];
  openPoolSlotIds: string[];
}

/** The unfiltered schedule (every service's sessions plus the open trial/interview pool). */
export function useSchedule() {
  return useQuery({ queryKey: keys.schedule, queryFn: () => apiFetch<ScheduleData>("/api/schedule") });
}
export function useRescheduleRequests() {
  return useQuery({ queryKey: ["reschedule-requests"] as const, queryFn: async () => (await apiFetch<{ rescheduleRequests: RescheduleRequest[] }>("/api/schedule/reschedule-requests")).rescheduleRequests });
}
export function useAllAttendance() {
  return useQuery({ queryKey: ["attendance", "all"] as const, queryFn: async () => (await apiFetch<{ attendanceItems: AttendanceItem[] }>("/api/attendance")).attendanceItems });
}

/** Everyone in one session and what was logged for them. */
export function useSessionAttendance(scheduleId: string) {
  return useQuery({
    queryKey: ["attendance", scheduleId] as const,
    queryFn: () => apiFetch<{ roster: RosterPerson[]; attendanceItems: AttendanceItem[] }>(`/api/attendance?scheduleItemId=${scheduleId}`),
  });
}

/** Logging or correcting attendance changes billing inputs and conflicts, so every attendance view is refreshed. */
function useRefreshAttendance() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["attendance"] });
}

export function useLogAttendance() {
  const refresh = useRefreshAttendance();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch("/api/attendance", { method: "POST", body }),
    onSuccess: refresh,
  });
}
export function usePatchAttendance() {
  const refresh = useRefreshAttendance();
  return useMutation({
    mutationFn: (body: { attendanceId: string; status?: string; loggedDuration?: number | string }) => apiFetch("/api/attendance", { method: "PATCH", body }),
    onSuccess: refresh,
  });
}

function patchItem(qc: ReturnType<typeof useQueryClient>, item: ScheduleItem) {
  qc.setQueryData<ScheduleData>(keys.schedule, (d) => (d ? { ...d, scheduleItems: d.scheduleItems.map((i) => (i.ScheduleID === item.ScheduleID ? item : i)) } : d));
}

/** Move one session to another date and time (both empty clears the move). Management only. */
export function useDirectReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { scheduleId: string; rescheduledDate: string; rescheduledTime: string }) => (await apiFetch<{ scheduleItem: ScheduleItem }>("/api/schedule", { method: "PATCH", body: v })).scheduleItem,
    onSuccess: (item) => patchItem(qc, item),
  });
}

export function useReviewReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { requestId: string; action: "approve" | "reject" }) => apiFetch<{ rescheduleRequest: RescheduleRequest; scheduleItem?: ScheduleItem }>("/api/schedule/reschedule-requests", { method: "PATCH", body: v }),
    onSuccess: (res) => {
      qc.setQueryData<RescheduleRequest[]>(["reschedule-requests"], (rows) => rows?.filter((r) => r.RescheduleRequestID !== res.rescheduleRequest.RescheduleRequestID));
      if (res.scheduleItem) patchItem(qc, res.scheduleItem);
    },
  });
}

export function useOfferSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { serviceType: string; serviceId: string; date: string; time: string; duration: number | string; facilitator: string }) => (await apiFetch<{ scheduleItem: ScheduleItem }>("/api/schedule", { method: "POST", body: v })).scheduleItem,
    onSuccess: (item) =>
      qc.setQueryData<ScheduleData>(keys.schedule, (d) => (d ? { scheduleItems: [...d.scheduleItems, item], openPoolSlotIds: [...d.openPoolSlotIds, item.ScheduleID] } : d)),
  });
}
