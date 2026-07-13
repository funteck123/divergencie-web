"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

const FEATURE_LABELS = {
  recordings: "Recordings",
  syllabus: "Syllabus",
  worksheets: "Worksheets",
  gcr: "Google Classroom",
  timesheet: "Timesheet",
  "progress-tracker": "Progress Tracker",
};

// Reachable from Student/Teacher/Staff/Ambassador's own Resources section —
// the in-app version of each feature is still "Coming soon", but if
// Management has set a real link for this Service (RecordingsLink/
// SyllabusLink/WorksheetsLink/GCRLink), an "Access <Feature>" button opens
// it directly in a new tab. Reached via serviceId/serviceName/link query
// params for the service-based features; user-based ones (Timesheet/
// Progress Tracker) have no service context.
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
  const link = searchParams.get("link") || "";
  // Only ever render an href that's actually http(s) — this value came
  // through a URL query param (ultimately from a Management-entered field),
  // so guard against anything else (e.g. a stray "javascript:" value)
  // ending up in an <a href>. No real link set yet for this Service/feature
  // falls back to a placeholder destination so the button is never hidden —
  // Management can set the real one anytime via the Service's edit form.
  const validLink = /^https?:\/\//i.test(link) ? link : "https://google.com";

  return (
    <div className="space-y-4">
      <button className="btn-ghost" onClick={() => router.back()}>
        ← Back
      </button>
      <div className="card space-y-3">
        <h2 className="font-semibold">
          {label}
          {serviceName ? ` — ${serviceName}` : ""}
        </h2>
        <p style={{ color: "var(--muted)" }}>In-app {label} is coming soon.</p>
        <a className="btn" href={validLink} target="_blank" rel="noreferrer">
          Access {label}
        </a>
      </div>
    </div>
  );
}
