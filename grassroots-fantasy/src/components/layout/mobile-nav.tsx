"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { navItems, isActive } from "./nav-items";

const items = [
  ...navItems.filter((i) => i.mobile),
  { href: "/dashboard/profile", label: "Profile", short: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname() ?? "";
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-xl md:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors",
                active ? "text-brand-400" : "text-surface-400 hover:text-surface-200"
              )}
            >
              <span className={cn("absolute inset-x-4 top-0 h-[3px] rounded-b-full", active ? "bg-brand-400" : "bg-transparent")} />
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="text-[10px] font-semibold leading-none">{item.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
