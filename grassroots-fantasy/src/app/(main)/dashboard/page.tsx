"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/layout/auth-provider"

interface DashboardData {
  points: number
  universityRank: number
  grassrootsRank: number
  universityName: string
  formation: string
  teamPlayers: Array<{
    name: string
    position: string
    points: number
  }>
  nextGameweek: {
    number: number
    deadline: string
  } | null
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      fetch("/api/user/dashboard")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error)
          } else {
            setData(data)
          }
        })
        .catch(() => setError("Failed to load dashboard data"))
        .finally(() => setLoading(false))
    }
  }, [user])

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back, {user.name?.split(" ")[0] || "Player"}
        </h1>
        <p className="mt-2 text-surface-400">{data?.universityName || "Your Dashboard"}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-surface-900 border border-surface-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            <span className="text-sm text-surface-400">Total Points</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {loading ? "—" : data?.points ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-surface-900 border border-surface-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-sm text-surface-400">University Rank</span>
          </div>
          <p className="text-3xl font-bold text-white">
            #{loading ? "—" : data?.universityRank ?? "—"}
          </p>
        </div>
        <div className="rounded-xl bg-surface-900 border border-surface-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-sm text-surface-400">Grassroots Rank</span>
          </div>
          <p className="text-3xl font-bold text-white">
            #{loading ? "—" : data?.grassrootsRank ?? "—"}
          </p>
        </div>
      </div>

      {data?.nextGameweek && (
        <div className="rounded-xl bg-brand-500/10 border border-brand-500/30 p-6 mb-8">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div>
              <p className="text-sm text-brand-300">Next Gameweek: {data.nextGameweek.number}</p>
              <p className="text-xs text-brand-400/70">
                Deadline: {new Date(data.nextGameweek.deadline).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-surface-900 border border-surface-800 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Team</h2>
          {data?.formation && (
            <span className="rounded-md bg-surface-800 px-3 py-1 text-xs font-mono text-surface-300">
              {data.formation}
            </span>
          )}
        </div>
        {data?.teamPlayers && data.teamPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.teamPlayers.map((player, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-surface-800 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-700 text-xs font-medium">
                  {player.position}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{player.name}</p>
                  <p className="text-xs text-surface-400">{player.points} pts</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-surface-400 mb-4">You haven&apos;t created your team yet.</p>
            <Link
              href="/squad"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Build Your Team
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/squad"
          className="flex items-center gap-3 rounded-xl bg-surface-900 border border-surface-800 p-5 hover:border-brand-500/50 transition-all"
        >
          <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          <div>
            <p className="text-sm font-semibold">Edit Team</p>
            <p className="text-xs text-surface-400">Manage your squad</p>
          </div>
        </Link>
        <Link
          href="/leaderboard"
          className="flex items-center gap-3 rounded-xl bg-surface-900 border border-surface-800 p-5 hover:border-brand-500/50 transition-all"
        >
          <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          <div>
            <p className="text-sm font-semibold">Leaderboard</p>
            <p className="text-xs text-surface-400">See rankings</p>
          </div>
        </Link>
        <Link
          href="/fixtures"
          className="flex items-center gap-3 rounded-xl bg-surface-900 border border-surface-800 p-5 hover:border-brand-500/50 transition-all"
        >
          <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <div>
            <p className="text-sm font-semibold">Fixtures</p>
            <p className="text-xs text-surface-400">View matches</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
