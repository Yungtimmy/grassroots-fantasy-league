"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      icon,
      iconRight,
      id,
      type = "text",
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-surface-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 h-4 w-4">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              "flex h-10 w-full rounded-lg bg-surface-900 border border-surface-600 px-3 py-2 text-sm text-surface-100",
              "placeholder:text-surface-500",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error &&
                "border-red-500/60 focus:ring-red-500/40 focus:border-red-500",
              icon && "pl-9",
              iconRight && "pr-9",
              className
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 h-4 w-4">
              {iconRight}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!error && hint && (
          <p className="text-xs text-surface-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
