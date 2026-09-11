"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  registeredUsers: number;
  activeUniversities: number;
  revenue: number;
  activeSeason: string | null;
  currentGameweek: string | null;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  username: string;
  createdAt: string;
}

const statCards = [
  { key: "totalUsers", label: "Total Users", icon: "👥", color: "text-blue-400" },
  { key: "registeredUsers", label: "Registered Users", icon: "✅", color: "text-green-400" },
  { key: "activeUniversities", label: "Active Universities", icon: "🏫", color: "text-purple-400" },
  { key: "revenue", label: "Revenue", icon: "💰", color: "text-yellow-400" },
  { key: "activeSeason", label: "Active Season", icon: "📅", color: "text-brand-400" },
  { key: "currentGameweek", label: "Current Gameweek", icon: "📆", color: "text-red-400" },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  async function handleResetTest() {
    if (!window.confirm("This will delete ALL squads, fixtures, gameweeks, scoring data, and match stats. Your account and league membership will remain. Proceed?")) return;
    setResetting(true);
    setResetMessage("");
    try {
      const res = await fetch("/api/admin/reset-test", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const d = data.details;
        setResetMessage(`Done! Cleared: ${d.pointTransactions} transactions, ${d.teams} teams, ${d.matches} matches, ${d.gameweeks} gameweeks.`);
      } else {
        setResetMessage("Error: " + (data.error || "Unknown error"));
      }
    } catch {
      setResetMessage("Error: Could not reach server");
    } finally {
      setResetting(false);
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, usersRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/users?limit=10&sort=createdAt&order=desc"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data);
        } else {
          setStats({
            totalUsers: 0,
            registeredUsers: 0,
            activeUniversities: 0,
            revenue: 0,
            activeSeason: null,
            currentGameweek: null,
          });
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setRecentUsers(usersData.data?.items ?? usersData.data ?? []);
        }
      } catch {
        setStats({
          totalUsers: 0,
          registeredUsers: 0,
          activeUniversities: 0,
          revenue: 0,
          activeSeason: null,
          currentGameweek: null,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin</h1>
        <p className="text-surface-400 mt-1">
          Operator console. Add universities, clubs, players, gameweeks and fixtures here — nothing is mocked.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton height={20} width="60%" className="mb-3" />
                <Skeleton height={32} width="40%" />
              </Card>
            ))
          : statCards.map((card) => (
              <Card key={card.key} className="p-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{card.icon}</span>
                  <div>
                    <p className="text-xs text-surface-400 font-medium uppercase tracking-wider">
                      {card.label}
                    </p>
                    <p className={cn("text-2xl font-bold mt-1", card.color)}>
                      {card.key === "revenue"
                        ? formatCurrency(stats?.revenue ?? 0)
                        : card.key === "activeSeason"
                        ? stats?.activeSeason ?? "None"
                        : card.key === "currentGameweek"
                        ? stats?.currentGameweek ?? "None"
                        : (stats?.[card.key as keyof Stats] as number) ?? 0}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <div className="px-6 py-4 border-b border-surface-700/50">
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/seasons">
              <Button variant="primary" size="sm">1. Season</Button>
            </Link>
            <Link href="/admin/universities">
              <Button variant="secondary" size="sm">2. Universities</Button>
            </Link>
            <Link href="/admin/clubs">
              <Button variant="secondary" size="sm">3. Clubs</Button>
            </Link>
            <Link href="/admin/players">
              <Button variant="secondary" size="sm">4. Players</Button>
            </Link>
            <Link href="/admin/gameweeks">
              <Button variant="outline" size="sm">5. Gameweeks</Button>
            </Link>
            <Link href="/admin/matches">
              <Button variant="outline" size="sm">6. Fixtures</Button>
            </Link>
          </div>
          <div className="mt-6 pt-6 border-t border-surface-700/50">
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                loading={resetting}
                onClick={handleResetTest}
                className="bg-red-600 hover:bg-red-700"
              >
                {resetting ? "Resetting..." : "Reset Test Data"}
              </Button>
              <p className="text-xs text-surface-500">Clears all squads, fixtures, gameweeks, points & match stats</p>
            </div>
            {resetMessage && (
              <p className={`mt-2 text-sm ${resetMessage.startsWith("Done") ? "text-green-400" : "text-red-400"}`}>
                {resetMessage}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Recent Registrations */}
      <Card>
        <div className="px-6 py-4 border-b border-surface-700/50">
          <h2 className="text-lg font-semibold text-white">Recent Registrations</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">No users yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3 text-surface-200 font-medium">{u.name}</td>
                    <td className="px-6 py-3 text-surface-400">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant="info">{u.username}</Badge>
                    </td>
                    <td className="px-6 py-3 text-surface-400">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
