"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  captain?: boolean;
  online?: boolean;
}

const avatarSizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-xl",
};

const ringSizes = {
  xs: "ring-1 ring-offset-1 ring-offset-surface-800",
  sm: "ring-1 ring-offset-1 ring-offset-surface-800",
  md: "ring-2 ring-offset-2 ring-offset-surface-800",
  lg: "ring-2 ring-offset-2 ring-offset-surface-800",
  xl: "ring-2 ring-offset-2 ring-offset-surface-800",
};

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const colors = [
  "bg-brand-600",
  "bg-blue-600",
  "bg-purple-600",
  "bg-orange-600",
  "bg-pink-600",
  "bg-teal-600",
  "bg-yellow-600",
];

function getColorFromName(name?: string): string {
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt,
      name,
      size = "md",
      captain = false,
      online,
      ...props
    },
    ref
  ) => {
    const [hasError, setHasError] = React.useState(false);
    const showImage = src && !hasError;

    return (
      <div ref={ref} className={cn("relative inline-flex shrink-0", className)} {...props}>
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full overflow-hidden select-none",
            avatarSizes[size],
            captain && ringSizes[size],
            captain && "ring-brand-500",
            !showImage && getColorFromName(name)
          )}
        >
          {showImage ? (
            <img
              src={src}
              alt={alt || name || "Avatar"}
              className="h-full w-full object-cover"
              onError={() => setHasError(true)}
            />
          ) : (
            <span className="font-semibold text-white/90 leading-none">
              {getInitials(name)}
            </span>
          )}
        </div>

        {online !== undefined && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-surface-800",
              online ? "bg-green-400" : "bg-surface-500",
              size === "xs" || size === "sm" ? "h-2 w-2" : "h-3 w-3"
            )}
          />
        )}

        {captain && (
          <span
            className={cn(
              "absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-brand-500 text-white",
              size === "xs" || size === "sm" ? "h-3.5 w-3.5 text-[8px]" : "h-4 w-4 text-[10px]"
            )}
          >
            C
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export { Avatar };
