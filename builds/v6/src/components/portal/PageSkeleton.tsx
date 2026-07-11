// Reusable loading skeleton for portal pages
// Used by loading.tsx files throughout the portal
export function PageSkeleton({ rows = 4, cards = 3 }: { rows?: number; cards?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-[var(--border-subtle)] rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="h-28 bg-[var(--border-subtle)] rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--border-subtle)] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
