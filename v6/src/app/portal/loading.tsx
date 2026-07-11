// Portal-level loading state — shown while the portal shell data fetches.
// Next.js streams the static layout immediately and replaces this with
// real content as soon as the server component resolves.
export default function PortalLoading() {
  return (
    <div className="flex-1 p-8 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-64 bg-[var(--border-subtle)] rounded-xl" />
      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-[var(--border-subtle)] rounded-2xl" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="h-64 bg-[var(--border-subtle)] rounded-2xl" />
    </div>
  );
}
