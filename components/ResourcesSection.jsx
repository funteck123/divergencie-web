"use client";

import Link from "next/link";

// Service-based: apply per enrolled Service (a recording/syllabus/etc. is
// specific to that class). User-based: apply once to the account overall,
// not per service.
const SERVICE_FEATURES = [
  { slug: "recordings", label: "Recordings" },
  { slug: "syllabus", label: "Syllabus" },
  { slug: "notes", label: "Notes" },
  { slug: "worksheets", label: "Worksheets" },
  { slug: "gcr", label: "GCR" },
];
const USER_FEATURES = [
  { slug: "timesheet", label: "Timesheet" },
  { slug: "progress-tracker", label: "Progress Tracker" },
];

// `services` should be the enrolled Service objects (ServiceID + Name are
// all this needs) — same list each dashboard already builds for its "My
// Enrollments" table.
export default function ResourcesSection({ services }) {
  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Resources</h2>

      <div className="flex gap-2 flex-wrap mb-4">
        {USER_FEATURES.map((f) => (
          <Link key={f.slug} className="btn-ghost" href={`/dashboard/resources/${f.slug}`}>
            {f.label}
          </Link>
        ))}
      </div>

      {(services || []).length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No enrollments yet.</p>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.ServiceID} className="p-3 rounded" style={{ background: "var(--panel-2)" }}>
              <div className="font-medium mb-2">{s.Name}</div>
              <div className="flex gap-2 flex-wrap">
                {SERVICE_FEATURES.map((f) => (
                  <Link
                    key={f.slug}
                    className="btn-ghost"
                    href={`/dashboard/resources/${f.slug}?serviceId=${encodeURIComponent(s.ServiceID)}&serviceName=${encodeURIComponent(s.Name)}`}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
