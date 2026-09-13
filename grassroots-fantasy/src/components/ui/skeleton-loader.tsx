"use client";

import { motion } from "framer-motion";

function SkeletonBlock({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-lg bg-white/[0.04] ${className ?? ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="absolute inset-0 shimmer" />
    </motion.div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      {/* GW card skeleton */}
      <SkeletonBlock className="h-40 w-full" />

      {/* Points row skeleton */}
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBlock className="h-24" delay={0.05} />
        <SkeletonBlock className="h-24" delay={0.1} />
        <SkeletonBlock className="h-24" delay={0.15} />
      </div>

      {/* Squad skeleton */}
      <SkeletonBlock className="h-64 w-full" delay={0.2} />

      {/* Leaderboard preview */}
      <SkeletonBlock className="h-48 w-full" delay={0.25} />
    </div>
  );
}

export function SquadSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-8 w-24" />
      </div>
      <div className="relative mx-auto aspect-[4/3] max-w-lg rounded-2xl bg-white/[0.02] p-4">
        <div className="grid grid-cols-5 gap-3 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={`f-${i}`} className="aspect-square rounded-full" delay={i * 0.03} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={`m-${i}`} className="aspect-square rounded-full" delay={0.15 + i * 0.03} />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-5 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={`d-${i}`} className="aspect-square rounded-full" delay={0.3 + i * 0.03} />
          ))}
        </div>
      </div>
      <SkeletonBlock className="h-32 w-full" delay={0.4} />
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <SkeletonBlock className="mx-auto h-8 w-64" />
      {/* Podium */}
      <div className="flex items-end justify-center gap-4 py-8">
        <SkeletonBlock className="h-28 w-24 rounded-t-xl" delay={0.05} />
        <SkeletonBlock className="h-36 w-24 rounded-t-xl" delay={0} />
        <SkeletonBlock className="h-20 w-24 rounded-t-xl" delay={0.1} />
      </div>
      {/* List */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-12 w-full" delay={0.15 + i * 0.03} />
        ))}
      </div>
    </div>
  );
}

export function GenericSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-64 w-full" delay={0.1} />
    </div>
  );
}
