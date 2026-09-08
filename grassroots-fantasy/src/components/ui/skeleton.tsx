"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

const variantClasses = {
  text: "rounded-md",
  circular: "rounded-full",
  rectangular: "rounded-none",
  rounded: "rounded-xl",
};

function Skeleton({
  className,
  variant = "text",
  width,
  height,
  lines = 1,
  animate = true,
  style,
  ...props
}: SkeletonProps) {
  const baseStyle = {
    width: width,
    height: height,
    ...style,
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2.5" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "bg-surface-700/60",
              variantClasses[variant],
              animate && "animate-pulse",
              i === lines - 1 && "w-3/4",
              className
            )}
            style={{
              height: height || 14,
              width: i === lines - 1 ? undefined : width,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-surface-700/60",
        variantClasses[variant],
        animate && "animate-pulse",
        className
      )}
      style={baseStyle}
      {...props}
    />
  );
}

/* ─── Preset Compositions ─── */

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-surface-700/50 bg-surface-800/80 p-6 space-y-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton lines={3} />
    </div>
  );
}

function SkeletonList({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-surface-700/50 bg-surface-800/80 p-4"
        >
          <Skeleton variant="circular" width={36} height={36} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={13} />
            <Skeleton width="45%" height={11} />
          </div>
          <Skeleton variant="rounded" width={56} height={28} />
        </div>
      ))}
    </div>
  );
}

function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-4 rounded-t-xl bg-surface-800/60 p-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} height={12} width={`${100 / cols}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-surface-700/30 p-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`c-${r}-${c}`} height={14} width={`${100 / cols}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonList, SkeletonTable };
