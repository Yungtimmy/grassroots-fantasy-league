"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, Shirt, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { navItems, isActive } from "./nav-items";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleLogout() {
    setDropdownOpen(false);
    logout();
    window.location.href = "/";
  }

  if (!user) return null;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black">
        {/* Top bar: logo + account */}
        <div className="bg-gradient-to-r from-accent-950 via-black to-black">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 md:h-16">
            <Link href="/dashboard" className="flex items-center gap-3">
              <img src="/logo.png" alt="GFL" className="h-8 w-auto md:h-10" />
              <span className="hidden font-display text-lg font-bold tracking-tight text-white sm:inline">
                Fantasy
              </span>
            </Link>

            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-white/15 py-1 pl-1 pr-3 text-sm text-white transition-colors hover:bg-white/10"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-400 text-xs font-bold text-black">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[10rem] truncate">{user.name}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", dropdownOpen && "rotate-180")} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl animate-slide-down">
                  <div className="border-b border-surface-700 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-xs text-surface-400">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/squad" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-300 hover:bg-surface-800">
                      <Shirt className="h-4 w-4" /> Squad
                    </Link>
                    <Link href="/dashboard/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-300 hover:bg-surface-800">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                  </div>
                  <div className="border-t border-surface-700 py-1">
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-surface-800">
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 text-white hover:bg-white/10 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* FPL-style tab row (desktop) */}
        <nav className="hidden border-t border-white/10 bg-surface-950 md:block">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors",
                    active ? "text-brand-400" : "text-surface-300 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {item.label}
                  <span className={cn("absolute inset-x-2 bottom-0 h-[3px] rounded-t-full", active ? "bg-brand-400" : "bg-transparent")} />
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Mobile slide-out menu with every tab */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl md:hidden animate-fade-in">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
            <img src="/logo.png" alt="GFL" className="h-8 w-auto" />
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-white hover:bg-white/10">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex flex-col px-2 py-2">
            {[...navItems, { href: "/dashboard/profile", label: "Profile", short: "Profile", icon: User }].map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 border-l-4 px-4 py-3.5 text-base font-semibold",
                    active ? "border-brand-400 bg-white/5 text-brand-400" : "border-transparent text-surface-300"
                  )}
                >
                  <Icon className="h-5 w-5" /> {item.label}
                </Link>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-400 font-bold text-black">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-surface-400">{user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-base font-medium text-red-400 hover:bg-white/5">
              <LogOut className="h-5 w-5" /> Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
