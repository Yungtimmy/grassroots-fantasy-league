"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const selectSizes = {
  sm: "h-8 text-xs px-2.5",
  md: "h-10 text-sm px-3",
  lg: "h-12 text-base px-4",
};

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Select an option",
      disabled = false,
      label,
      error,
      className,
      size = "md",
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const listRef = useRef<HTMLUListElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value);

    const close = useCallback(() => {
      setOpen(false);
      setHighlightedIndex(-1);
    }, []);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          close();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [close]);

    useEffect(() => {
      if (highlightedIndex >= 0 && listRef.current) {
        const item = listRef.current.children[highlightedIndex] as HTMLElement;
        item?.scrollIntoView({ block: "nearest" });
      }
    }, [highlightedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (open && highlightedIndex >= 0) {
            const opt = options[highlightedIndex];
            if (!opt.disabled) {
              onChange?.(opt.value);
              close();
            }
          } else {
            setOpen(true);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!open) {
            setOpen(true);
            setHighlightedIndex(0);
          } else {
            setHighlightedIndex((prev) => {
              const next = prev + 1;
              return next >= options.length ? 0 : next;
            });
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? options.length - 1 : next;
          });
          break;
        case "Escape":
          close();
          buttonRef.current?.focus();
          break;
      }
    };

    return (
      <div ref={containerRef as any} className={cn("relative w-full", className)}>
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-surface-300">
            {label}
          </label>
        )}
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen(!open);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border bg-surface-900 transition-colors duration-200",
            "text-left",
            selectSizes[size],
            error
              ? "border-red-500/60 focus:ring-red-500/40"
              : "border-surface-600",
            open && !error && "ring-2 ring-brand-500/40 border-brand-500",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            selected ? "text-surface-100" : "text-surface-500"
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <svg
            className={cn(
              "h-4 w-4 shrink-0 text-surface-500 transition-transform duration-200",
              open && "rotate-180"
            )}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

        {open && (
          <ul
            ref={listRef}
            role="listbox"
            className={cn(
              "absolute z-50 mt-1.5 w-full overflow-auto rounded-lg border border-surface-700",
              "bg-surface-800 shadow-xl shadow-black/30",
              "max-h-60 animate-slide-down",
              "focus:outline-none"
            )}
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-surface-500">
                No options available
              </li>
            ) : (
              options.map((opt, i) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  aria-disabled={opt.disabled}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange?.(opt.value);
                      close();
                      buttonRef.current?.focus();
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-center px-3 py-2 text-sm transition-colors",
                    opt.disabled && "cursor-not-allowed opacity-40",
                    opt.value === value && "bg-brand-500/15 text-brand-400",
                    opt.value !== value &&
                      !opt.disabled &&
                      "text-surface-200 hover:bg-surface-700",
                    highlightedIndex === i &&
                      opt.value !== value &&
                      "bg-surface-700"
                  )}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.value === value && (
                    <svg
                      className="ml-2 h-4 w-4 shrink-0 text-brand-500"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
