/** Query keys, one place so invalidation after a change touches exactly the affected data. */
export const keys = {
  me: ["me"] as const,
  users: ["users"] as const,
  services: ["services"] as const,
  enrollments: ["enrollments"] as const,
  invoices: ["invoices"] as const,
  paychecks: ["paychecks"] as const,
  schedule: ["schedule"] as const,
  tickets: ["tickets"] as const,
  auditLog: (limit: number, offset: number) => ["auditlog", limit, offset] as const,
};
