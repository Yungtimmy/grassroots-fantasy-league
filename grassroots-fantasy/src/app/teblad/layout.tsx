"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/teblad", icon: "📊" },
  { label: "Leagues", href: "/teblad/leagues", icon: "🏆" },
  { label: "Universities", href: "/teblad/universities", icon: "🏫" },
  { label: "Seasons", href: "/teblad/seasons", icon: "📅" },
  { label: "Clubs", href: "/teblad/clubs", icon: "🛡️" },
  { label: "Players", href: "/teblad/players", icon: "⚽" },
  { label: "Gameweeks", href: "/teblad/gameweeks", icon: "📆" },
  { label: "Fixtures", href: "/teblad/matches", icon: "🏟️" },
  { label: "Scoring", href: "/teblad/scoring", icon: "🎯" },
  { label: "Payments", href: "/teblad/payments", icon: "💰" },
  { label: "Users", href: "/teblad/users", icon: "👥" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => setUnlocked(Boolean(data.unlocked)))
      .catch(() => setUnlocked(false))
      .finally(() => setChecking(false));
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setUnlocked(true);
        setPassword("");
      } else {
        setError(data.error || "Wrong password");
      }
    } catch {
      setError("Could not unlock admin");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLock() {
    await fetch("/api/admin/lock", { method: "POST" });
    setUnlocked(false);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
        <form
          onSubmit={handleUnlock}
          className="w-full max-w-sm rounded-2xl border border-surface-800 bg-surface-900 p-8"
        >
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              GFL
            </div>
            <h1 className="text-xl font-bold text-white">Admin</h1>
            <p className="mt-1 text-sm text-surface-400">Enter the admin password. No account needed.</p>
          </div>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <Button type="submit" className="mt-5 w-full" loading={submitting}>
            Unlock
          </Button>
          <p className="mt-4 text-center text-xs text-surface-500">
            <Link href="/" className="hover:text-surface-300">
              Back to site
            </Link>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-surface-900 border-r border-surface-800 flex flex-col transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-800">
          <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
            GFL
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-surface-500">Password access</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/teblad" ? pathname === "/teblad" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-500/15 text-brand-400"
                    : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-surface-800 p-4">
          <button
            onClick={handleLock}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-surface-800"
          >
            Lock admin
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center gap-4 px-4 border-b border-surface-800 bg-surface-900/50 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
          <div className="flex-1" />
          <Link href="/" className="text-sm text-surface-400 hover:text-surface-200 transition-colors">
            View Site
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
