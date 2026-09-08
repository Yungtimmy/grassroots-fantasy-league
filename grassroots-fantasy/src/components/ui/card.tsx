"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ─── Card Root ─── */
const CardRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-surface-700/50 bg-surface-800/80 backdrop-blur-sm shadow-lg shadow-black/10",
      className
    )}
    {...props}
  />
));
CardRoot.displayName = "Card";

/* ─── Card Header ─── */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-6 py-4 border-b border-surface-700/50", className)}
    {...props}
  />
));
CardHeader.displayName = "Card.Header";

/* ─── Card Content ─── */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-6 py-5", className)} {...props} />
));
CardContent.displayName = "Card.Content";

/* ─── Card Footer ─── */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-6 py-4 border-t border-surface-700/50 flex items-center",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "Card.Footer";

/* ─── Compound Export ─── */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
});
