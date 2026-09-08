"use client";

import React, { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

function Modal({
  open,
  onClose,
  children,
  className,
  title,
  description,
  size = "md",
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full mx-4",
          "bg-surface-800 border border-surface-700/60 rounded-2xl shadow-2xl shadow-black/40",
          "animate-slide-up",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="px-6 pt-6 pb-0">
            {title && (
              <h2 className="text-lg font-semibold text-surface-100">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-surface-400">{description}</p>
            )}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 p-1.5 rounded-lg text-surface-500",
            "hover:bg-surface-700 hover:text-surface-300 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          )}
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 px-6 pb-6 pt-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export { Modal, ModalFooter };
