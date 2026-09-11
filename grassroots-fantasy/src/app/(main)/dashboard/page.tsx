"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/layout/auth-provider"

interface DashboardData {
  authenticated: boolean
  user?: { name: string; email: string } | null
  points: number
  gameweekPoints: number
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
    startDate: string
  } | null
  leagues: Array<{
    id: string
    name: string
    university: { name: string; shortName: string; slug: string }
    memberCount: number
  }>
  nearbyPlayers: Array<{
    rank: number
    name: string
    points: number
    isYou: boolean
  }>
  rankChange?: number
}

function CountdownTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    function calculate() {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      }
    }
    setTimeLeft(calculate())
    const timer = setInterval(() => setTimeLeft(calculate()), 1000)
    return () => clearInterval(timer)
  }, [deadline])

  return (
    <div className="flex gap-1.5">
      {[
        { value: timeLeft.days, label: "D" },
        { value: timeLeft.hours, label: "H" },
        { value: timeLeft.minutes, label: "M" },
        { value: timeLeft.seconds, label: "S" },
      ].map((item) => (
        <div key={item.label} className="text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-xs font-bold">
            {String(item.value).padStart(2, "0")}
          </div>
          <p className="mt-0.5 text-[8px] uppercase text-white/60">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/user/dashboard")
      .then((res) => res.json())
      .then((d) => {
        if (!d.error) setData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 py-6">
        <div className="mx-auto max-w-lg space-y-6">
          {/* Gameweek skeleton */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded-lg bg-white/10 animate-pulse" />
                <div className="h-3 w-40 rounded-lg bg-white/5 animate-pulse" />
              </div>
              <div className="flex gap-1.5">
                {[1,2,3,4].map(i => <div key={i} className="h-8 w-8 rounded-lg bg-white/10 animate-pulse" />)}
              </div>
            </div>
            <div className="h-px bg-white/10 mb-5" />
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="text-center space-y-1">
                  <div className="h-2 w-12 mx-auto rounded bg-white/5 animate-pulse" />
                  <div className="h-7 w-14 mx-auto rounded bg-white/10 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          {/* Squad skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1,2,3,4,5].map(i => <div key={i} className="aspect-square rounded bg-white/5 animate-pulse" />)}
            </div>
          </div>
          {/* Leaderboard skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-14 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-1">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                  <div className="w-6 h-4 rounded bg-white/10 animate-pulse" />
                  <div className="h-7 w-7 rounded-full bg-white/10 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                  </div>
                  <div className="h-3 w-8 rounded bg-white/10 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const rankChange = data?.rankChange ?? 0

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="font-display text-lg font-bold text-white">
              Grassroots Fantasy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{user?.name?.split(" ")[0]}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Main Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          {/* Gameweek Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-white">
                  Gameweek {data?.nextGameweek?.number ?? "—"}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              {data?.nextGameweek && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(data.nextGameweek.startDate).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {new Date(data.nextGameweek.startDate).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  –{" "}
                  {new Date(data.nextGameweek.deadline).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  {new Date(data.nextGameweek.deadline).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
            {data?.nextGameweek && (
              <CountdownTimer deadline={data.nextGameweek.deadline} />
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 mb-5" />

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <p className="text-[10px] uppercase text-gray-500 mb-1">GW Points</p>
              <p className="font-display text-2xl font-bold text-brand-400">
                {data?.gameweekPoints ?? 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-gray-500 mb-1">Overall</p>
              <p className="font-display text-2xl font-bold text-white">
                {data?.points ?? 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase text-gray-500 mb-1">Rank</p>
              <p className="font-display text-2xl font-bold text-white">
                #{data?.universityRank ?? "—"}
              </p>
            </div>
          </div>

          {/* Rank Change */}
          {rankChange !== 0 && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-2.5">
              {rankChange > 0 ? (
                <>
                  <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="text-sm text-green-400 font-medium">Up by {rankChange}</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-sm text-red-400 font-medium">Down by {Math.abs(rankChange)}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* My Squad */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">My Squad</h2>
            <Link href="/squad" className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
              View Squad
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {["GK", "DEF", "MID", "MID", "FWD"].map((pos, i) => {
              const player = data?.teamPlayers?.find((p) => p.position === pos)
              return (
                <div
                  key={`${pos}-${i}`}
                  className="aspect-square flex flex-col items-center justify-center bg-white/5 border border-white/10"
                >
                  {player ? (
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-[10px] font-bold text-brand-400">
                        {player.name.split(" ").pop()?.charAt(0) || pos.charAt(0)}
                      </div>
                      <span className="mt-1 text-[8px] text-gray-500 text-center leading-tight truncate w-full px-1">
                        {player.name.split(" ").pop() || pos}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-gray-600">{pos}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">Leaderboard Preview</h2>
            <Link href="/leaderboard" className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
              View All
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {data?.nearbyPlayers && data.nearbyPlayers.length > 0 ? (
              <>
                {/* User's rank at top */}
                {(() => {
                  const you = data.nearbyPlayers.find((p) => p.isYou)
                  if (!you) return null
                  return (
                    <div className="flex items-center gap-3 px-4 py-3 bg-brand-500/10 border-b border-white/10">
                      <span className="w-6 text-center text-xs font-bold text-brand-400">
                        {you.rank}
                      </span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                        {you.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-400 truncate">{you.name} (You)</p>
                      </div>
                      <span className="text-sm font-bold text-white">{you.points}</span>
                      <span className="text-[10px] text-gray-500">pts</span>
                    </div>
                  )
                })()}

                {/* Ranks below */}
                {data.nearbyPlayers
                  .filter((p) => !p.isYou)
                  .slice(0, 4)
                  .map((player) => (
                    <div
                      key={player.rank}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0"
                    >
                      <span className="w-6 text-center text-xs font-medium text-gray-500">
                        {player.rank}
                      </span>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-gray-400">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">{player.name}</p>
                      </div>
                      <span className="text-sm font-semibold text-white">{player.points}</span>
                      <span className="text-[10px] text-gray-500">pts</span>
                    </div>
                  ))}
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">No leaderboard data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
