"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";

const signedInLinks = [
  { href: "/dashboard", label: "Dashboard" },
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

  const navLinks = user ? signedInLinks : [];
  const homeHref = user ? "/dashboard" : "/";

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

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={homeHref} className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-2xl font-bold text-transparent">
              GFL
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? "bg-surface-800 text-brand-400"
                    : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-surface-700" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-surface-800"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-sm font-medium text-brand-400">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden text-sm font-medium text-surface-200 lg:block">
                    {user.name}
                  </span>
                  <svg
                    className={cn("h-4 w-4 text-surface-500 transition-transform", dropdownOpen && "rotate-180")}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-surface-700 bg-surface-800 shadow-xl animate-slide-down">
                    <div className="border-b border-surface-700 px-4 py-3">
                      <p className="text-sm font-medium text-surface-200">{user.name}</p>
                      <p className="text-xs text-surface-500">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/squad"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-300 hover:bg-surface-700 hover:text-surface-100"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Squad
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-surface-300 hover:bg-surface-700 hover:text-surface-100"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                    </div>
                    <div className="border-t border-surface-700 py-1">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-surface-700"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200 md:hidden"
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-surface-900 md:hidden animate-fade-in">
          <div className="flex h-16 items-center justify-between border-b border-surface-800 px-4">
            <Link
              href={homeHref}
              className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-2xl font-bold text-transparent"
            >
              GFL
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-1 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                  pathname === link.href
                    ? "bg-brand-500/10 text-brand-400"
                    : "text-surface-300 hover:bg-surface-800 hover:text-surface-100"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-surface-800 p-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-surface-800 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 font-medium text-brand-400">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-surface-200">{user.name}</p>
                    <p className="text-xs text-surface-500">{user.email}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/profile"
                  className="block rounded-xl px-4 py-3 text-base font-medium text-surface-300 hover:bg-surface-800"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl px-4 py-3 text-left text-base font-medium text-red-400 hover:bg-surface-800"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full" size="lg">
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" className="w-full" size="lg">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
