"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

const FEATURE_LABELS = {
  recordings: "Recordings",
  syllabus: "Syllabus",
  notes: "Notes",
  worksheets: "Worksheets",
  gcr: "GCR",
  timesheet: "Timesheet",
  "progress-tracker": "Progress Tracker",
};

// Reachable from Student/Teacher/Staff/Ambassador's own Resources section —
// placeholder for now (each feature's real content comes later); the point
// right now is just the navigation shell: one URL per feature (+ optional
// serviceId/serviceName for the service-based ones), with a Back button.
export default function ResourceFeaturePage() {
  return (
    <DashboardShell allowedType={["Student", "Teacher", "Staff", "Ambassador"]}>
      {(user) => <Body user={user} />}
    </DashboardShell>
  );
}

function Body() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const feature = params.feature;
  const label = FEATURE_LABELS[feature] || feature;
  const serviceName = searchParams.get("serviceName");

  return (
    <div className="space-y-4">
      <button className="btn-ghost" onClick={() => router.back()}>
        ← Back
      </button>
      <div className="card">
        <h2 className="font-semibold mb-2">
          {label}
          {serviceName ? ` — ${serviceName}` : ""}
        </h2>
        <p style={{ color: "var(--muted)" }}>Coming soon.</p>
      </div>
    </div>
  );
}
