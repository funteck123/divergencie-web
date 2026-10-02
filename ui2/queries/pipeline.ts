"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { keys } from "./keys";
import type { Credentials, LeadRecord, PendingRequest, RegForm, ScheduleItem, UserRecord } from "./types";
import type { InterviewItem, TrialItem } from "@/ui2/features/pipeline/pipelineLogic";

export function useRegForms() {
  return useQuery({ queryKey: ["regforms"] as const, queryFn: async () => (await apiFetch<{ regForms: RegForm[] }>("/api/regforms")).regForms });
}
export function useAutoApprove() {
  return useQuery({ queryKey: ["register-settings"] as const, queryFn: async () => (await apiFetch<{ autoApprove: boolean }>("/api/register-settings")).autoApprove });
}
export function useSetAutoApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (autoApprove: boolean) => (await apiFetch<{ autoApprove: boolean }>("/api/register-settings", { method: "PATCH", body: { autoApprove } })).autoApprove,
    // Optimistic: the switch moves at once and snaps back if the server refuses.
    onMutate: async (autoApprove) => {
      await qc.cancelQueries({ queryKey: ["register-settings"] });
      const prev = qc.getQueryData<boolean>(["register-settings"]);
      qc.setQueryData(["register-settings"], autoApprove);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(["register-settings"], ctx?.prev),
    onSuccess: (v) => qc.setQueryData(["register-settings"], v),
  });
}
export function useActOnRegForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { regFormId: string; action: "approve" | "reject" }) => apiFetch<{ regForm: RegForm; credentials?: Credentials }>("/api/regforms", { method: "PATCH", body: v }),
    onSuccess: (res) => {
      qc.setQueryData<RegForm[]>(["regforms"], (rows) => rows?.map((r) => (r.RegFormID === res.regForm.RegFormID ? res.regForm : r)));
      if (res.credentials) void qc.invalidateQueries({ queryKey: keys.users });
    },
  });
}

export function useLeads() {
  return useQuery({ queryKey: ["leads"] as const, queryFn: async () => (await apiFetch<{ leads: LeadRecord[] }>("/api/leads")).leads });
}
export function usePendingRequests() {
  return useQuery({ queryKey: ["schedule-requests"] as const, queryFn: () => apiFetch<{ pendingTrials: PendingRequest[]; pendingInterviews: PendingRequest[] }>("/api/schedule/requests") });
}

interface MeBundle {
  trialItems?: TrialItem[];
  interviewItems?: InterviewItem[];
}

/** Trial and interview items of every pending account (one /api/me request per account, in parallel, cached per account). */
export function usePipelineItems(users: readonly UserRecord[]) {
  const trialAccs = users.filter((u) => u.UserType === "TrialAcc" || u.UserType === "TeacherInterviewAcc");
  const interviewAccs = users.filter((u) => ["TeacherInterviewAcc", "StaffInterviewAcc", "AmbassadorInterviewAcc"].includes(u.UserType));
  const ids = [...new Set([...trialAccs, ...interviewAccs].map((u) => u.UserID))];
  const results = useQueries({
    queries: ids.map((id) => ({ queryKey: ["me", id] as const, queryFn: () => apiFetch<MeBundle>(`/api/me?userId=${id}`) })),
  });
  const byId = new Map(ids.map((id, i) => [id, results[i]?.data] as const));
  return {
    loading: results.some((r) => r.isPending),
    trialItems: trialAccs.flatMap((u) => byId.get(u.UserID)?.trialItems ?? []),
    interviewItems: interviewAccs.flatMap((u) => byId.get(u.UserID)?.interviewItems ?? []),
  };
}

function useRefreshPipeline() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["me"] }), qc.invalidateQueries({ queryKey: ["schedule-requests"] }), qc.invalidateQueries({ queryKey: keys.schedule }), qc.invalidateQueries({ queryKey: keys.invoices }), qc.invalidateQueries({ queryKey: keys.users })]);
}

export function useAddTrialService() {
  const refresh = useRefreshPipeline();
  return useMutation({ mutationFn: (trialId: string) => apiFetch("/api/trial-enroll", { method: "POST", body: { trialId } }), onSuccess: refresh });
}
export function useInterviewOffer() {
  const refresh = useRefreshPipeline();
  return useMutation({
    mutationFn: (v: { interviewId: string; action: "send" | "waitlist" | "reject" | "unsend"; feedback?: string; offerLetterLink?: string }) => apiFetch("/api/interview-offer", { method: "POST", body: v }),
    onSuccess: refresh,
  });
}
export function useSendInterviewTask() {
  const refresh = useRefreshPipeline();
  return useMutation({ mutationFn: (interviewId: string) => apiFetch("/api/interview-task", { method: "PATCH", body: { interviewId } }), onSuccess: refresh });
}
/** Approve (with a slot) or reject a pending trial or interview request. */
export function useActOnRequest() {
  const refresh = useRefreshPipeline();
  return useMutation({
    mutationFn: (v: { type: string; id: string; action: "approve" | "reject"; scheduleId?: string }) => apiFetch("/api/schedule/requests", { method: "PATCH", body: v }),
    onSuccess: refresh,
  });
}
export function useCreateSlot() {
  return useMutation({
    mutationFn: async (v: { serviceType: string; serviceId: string; date: string; time: string; duration: number | string; facilitator: string }) => (await apiFetch<{ scheduleItem: ScheduleItem }>("/api/schedule", { method: "POST", body: v })).scheduleItem,
  });
}
