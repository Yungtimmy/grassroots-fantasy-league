"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

export function Footer() {
  const { user } = useAuth();

  const footerLinks = user
    ? [
        { href: "/squad", label: "Squad" },
        { href: "/fixtures", label: "Fixtures" },
        { href: "/leaderboard", label: "Leaderboard" },
      ]
    : [
        { href: "/auth/login", label: "Login" },
        { href: "/auth/register", label: "Register" },
      ];

  return (
    <footer className="border-t border-surface-800 bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-xl font-bold text-transparent">
              GFL
            </span>
            <p className="text-sm text-surface-500">Built for university football fans</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-surface-400 transition-colors hover:text-surface-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-surface-800 pt-6 text-center">
          <p className="text-xs text-surface-600">
            &copy; {new Date().getFullYear()} Grassroots Fantasy League. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
