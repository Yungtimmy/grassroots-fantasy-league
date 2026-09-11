"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";


const signedInLinks = [
  { href: "/dashboard", label: "Home" },
  { href: "/squad", label: "Squad" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navLinks = signedInLinks;
  const homeHref = "/dashboard";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    router.push("/");
  }

  if (!user) return null;

  return (
    <>
      {/* Desktop Nav - Floating Glassmorphic */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 hidden md:block">
        <nav className="flex items-center gap-1 rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 px-2 py-1.5 shadow-xl shadow-black/5 backdrop-blur-xl">
          <Link href={homeHref} className="flex items-center gap-2 px-4 py-1.5">
            <img src="/logo.png" alt="GFL" className="h-8 w-auto" />
          </Link>

          <div className="mx-1 h-5 w-px bg-surface-300 dark:bg-surface-600" />

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-4 py-1.5 text-sm font-medium transition-all",
                pathname === link.href || pathname.startsWith(`${link.href}/`)
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                  : "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-white/10 hover:text-surface-900 dark:hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}

          <div className="mx-1 h-5 w-px bg-surface-300 dark:bg-surface-600" />

          <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-surface-100 dark:hover:bg-white/10"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <svg
                  className={cn("h-3.5 w-3.5 text-surface-500 transition-transform", dropdownOpen && "rotate-180")}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-2xl animate-slide-down">
                  <div className="border-b border-surface-100 dark:border-surface-700 px-4 py-3">
                    <p className="text-sm font-semibold text-surface-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-surface-500">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/squad"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Squad
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                  </div>
                  <div className="border-t border-surface-100 dark:border-surface-700 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-surface-50 dark:hover:bg-surface-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
        </nav>
      </div>

      {/* Mobile Nav - Floating Glassmorphic */}
      <div className="fixed top-4 left-4 right-4 z-50 md:hidden">
        <nav className="flex items-center justify-between rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/40 px-3 py-2 shadow-xl shadow-black/5 backdrop-blur-xl">
          <Link href={homeHref} className="flex items-center gap-2">
            <img src="/logo.png" alt="GFL" className="h-7 w-auto" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-xl p-2 text-surface-600 dark:text-surface-400 transition-colors hover:bg-surface-100 dark:hover:bg-white/10"
            >
              {mobileOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-white/95 dark:bg-black/95 backdrop-blur-xl md:hidden animate-fade-in">
          <div className="flex h-20 items-center justify-between px-6">
            <Link
              href={homeHref}
              className="flex items-center gap-2"
              onClick={() => setMobileOpen(false)}
            >
              <img src="/logo.png" alt="GFL" className="h-8 w-auto" />
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-xl p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-1 px-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                  pathname === link.href
                    ? "bg-brand-500/10 text-brand-500"
                    : "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 border-t border-surface-200 dark:border-surface-700 p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-surface-100 dark:bg-surface-800 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-surface-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-surface-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full rounded-xl px-4 py-3 text-left text-base font-medium text-red-500 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
