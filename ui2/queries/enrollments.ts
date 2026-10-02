"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { keys } from "./keys";
import type { EnrollmentRecord, ServiceRecord } from "./types";

export function useEnrollments() {
  return useQuery({
    queryKey: keys.enrollments,
    queryFn: async () => (await apiFetch<{ enrollments: EnrollmentRecord[] }>("/api/enrollments")).enrollments,
  });
}

export interface EnrollRow {
  serviceId: string;
  batchId: string;
  rateId: string;
}
export interface EnrollResult {
  created: EnrollmentRecord[];
  failures: { serviceId: string; message: string }[];
}

/**
 * Enroll one person into several services. One request per service, one after the other, so a refusal (for example a
 * duplicate) does not stop the rest. The result lists what was created and what failed, as the classic form reports it.
 */
export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, rows, startDate, endDate }: { userId: string; rows: readonly EnrollRow[]; startDate: string; endDate: string }): Promise<EnrollResult> => {
      const created: EnrollmentRecord[] = [];
      const failures: EnrollResult["failures"] = [];
      for (const row of rows) {
        try {
          const { enrollment } = await apiFetch<{ enrollment: EnrollmentRecord }>("/api/enrollments", { method: "POST", body: { userId, serviceId: row.serviceId, batchId: row.batchId, rateId: row.rateId, startDate, endDate } });
          created.push(enrollment);
        } catch (e) {
          failures.push({ serviceId: row.serviceId, message: e instanceof Error ? e.message : "failed" });
        }
      }
      return { created, failures };
    },
    onSuccess: ({ created }) => {
      if (created.length) qc.setQueryData<EnrollmentRecord[]>(keys.enrollments, (rows) => [...(rows ?? []), ...created]);
    },
  });
}

export function useUpdateEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrolmentId, patch }: { enrolmentId: string; patch: Record<string, unknown> }) =>
      (await apiFetch<{ enrollment: EnrollmentRecord }>("/api/enrollments", { method: "PATCH", body: { enrolmentId, ...patch } })).enrollment,
    onSuccess: (enrollment) => {
      qc.setQueryData<EnrollmentRecord[]>(keys.enrollments, (rows) => rows?.map((e) => (e.EnrolmentID === enrollment.EnrolmentID ? enrollment : e)));
    },
  });
}

export function useDeleteEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrolmentId: string) => apiFetch("/api/enrollments", { method: "DELETE", body: { enrolmentId } }),
    onSuccess: (_r, enrolmentId) => {
      qc.setQueryData<EnrollmentRecord[]>(keys.enrollments, (rows) => rows?.filter((e) => e.EnrolmentID !== enrolmentId));
    },
  });
}

export interface NewRate {
  currency: string;
  rate: string;
  description: string;
  billingType: string;
}

/** A rate made on the spot for one batch. The reply carries the whole updated service, which replaces the cached one. */
export function useAddRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceId, batchId, rate }: { serviceId: string; batchId: string; rate: NewRate }) =>
      apiFetch<{ rate: { RateID: string }; service: ServiceRecord }>("/api/services/rates", { method: "POST", body: { serviceId, batchId, ...rate } }),
    onSuccess: ({ service }) => {
      qc.setQueryData<ServiceRecord[]>(keys.services, (rows) => rows?.map((s) => (s.ServiceID === service.ServiceID ? service : s)));
    },
  });
}
