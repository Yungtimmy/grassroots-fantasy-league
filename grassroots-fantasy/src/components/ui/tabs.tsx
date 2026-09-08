"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  value?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const tabSizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

function Tabs({ tabs, value, onChange, className, size = "md" }: TabsProps) {
  const [activeTab, setActiveTab] = useState(value || tabs[0]?.id || "");

  const activeId = value ?? activeTab;

  const handleChange = (tabId: string) => {
    if (!value) setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div
      role="tablist"
      className={cn("flex gap-1 rounded-xl bg-surface-900 p-1", className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            onClick={() => handleChange(tab.id)}
            className={cn(
              "relative flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900",
              "disabled:cursor-not-allowed disabled:opacity-40",
              tabSizes[size],
              isActive
                ? "bg-surface-700 text-surface-100 shadow-sm"
                : "text-surface-400 hover:text-surface-300 hover:bg-surface-800"
            )}
          >
            {tab.icon && (
              <span className="shrink-0 h-4 w-4">{tab.icon}</span>
            )}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  isActive
                    ? "bg-brand-500/20 text-brand-400"
                    : "bg-surface-600 text-surface-400"
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

Tabs.displayName = "Tabs";

export { Tabs };
