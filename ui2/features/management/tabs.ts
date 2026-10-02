import type { ShellTab } from "@/ui2/components/AppShell";

/** The ten Management sections, in the classic order. `built` flips as each phase ships. */
export const MANAGEMENT_SECTIONS = [
  { slug: "applications", label: "Applications", built: false },
  { slug: "pipeline", label: "Pipeline", built: false },
  { slug: "accounts", label: "Accounts", built: true },
  { slug: "services", label: "Services", built: true },
  { slug: "schedule", label: "Schedule", built: false },
  { slug: "enrollments", label: "Enrollments", built: true },
  { slug: "billing", label: "Billing", built: true },
  { slug: "guides", label: "Guides", built: true },
  { slug: "tickets", label: "Tickets", built: false },
  { slug: "audit-log", label: "Audit Log", built: true },
] as const;

export const MANAGEMENT_TABS: readonly ShellTab[] = MANAGEMENT_SECTIONS.map((s) => ({ href: `/v2/management/${s.slug}`, label: s.label }));
