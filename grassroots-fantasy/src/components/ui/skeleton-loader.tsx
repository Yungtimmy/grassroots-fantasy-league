"use client";

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="skeleton h-40 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
      <div className="skeleton h-64 w-full" />
      <div className="skeleton h-48 w-full" />
    </div>
  );
}

export function SquadSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-8 w-24" />
      </div>
      <div className="skeleton h-[300px] w-full rounded-2xl" />
      <div className="skeleton h-32 w-full" />
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="skeleton mx-auto h-8 w-64" />
      <div className="flex items-end justify-center gap-4 py-8">
        <div className="skeleton h-28 w-24 rounded-t-xl" />
        <div className="skeleton h-36 w-24 rounded-t-xl" />
        <div className="skeleton h-20 w-24 rounded-t-xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function GenericSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-64 w-full" />
    </div>
  );
}
