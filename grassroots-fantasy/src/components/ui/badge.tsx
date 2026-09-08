"use client";

import React from "react";
import { cn } from "@/lib/utils";

const positionVariants: Record<string, string> = {
  GK: "bg-yellow-400/15 text-yellow-400 border border-yellow-400/30",
  DEF: "bg-blue-400/15 text-blue-400 border border-blue-400/30",
  MID: "bg-green-400/15 text-green-400 border border-green-400/30",
  FWD: "bg-red-400/15 text-red-400 border border-red-400/30",
};

const statusVariants: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border border-green-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  failed: "bg-red-500/15 text-red-400 border border-red-500/30",
  success: "bg-brand-500/15 text-brand-400 border border-brand-500/30",
  info: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  default: "bg-surface-700/50 text-surface-300 border border-surface-600/50",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof statusVariants | keyof typeof positionVariants;
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", dot = false, children, ...props }, ref) => {
    const isPosition = variant in positionVariants;
    const colorClass = isPosition
      ? positionVariants[variant]
      : statusVariants[variant] || statusVariants.default;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
          colorClass,
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isPosition
                ? "bg-current"
                : variant === "active" || variant === "success"
                ? "bg-green-400"
                : variant === "pending"
                ? "bg-yellow-400"
                : variant === "failed"
                ? "bg-red-400"
                : "bg-surface-400"
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
