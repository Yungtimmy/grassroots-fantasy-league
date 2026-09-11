"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/layout/auth-provider"
import { Select } from "@/components/ui/select"

interface LeaderboardEntry {
  rank: number
  playerName: string
  university: string
  points: number
  movement: number
}

interface Season {
  id: string
  name: string
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState("")
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const perPage = 25

  const fetchData = useCallback(async (seasonId: string) => {
    const res = await fetch(`/api/leaderboard/grassroots?seasonId=${seasonId}&limit=100&offset=0`)
    if (res.ok) {
      const json = await res.json()
      const items = json.data?.items ?? []
      setData(
        items.map((e: { rank: number; name: string; university: string; totalPoints: number; movement: number }) => ({
          rank: e.rank,
          playerName: e.name,
          university: e.university,
          points: e.totalPoints,
          movement: e.movement ?? 0,
        }))
      )
    }
  }, [])

  useEffect(() => {
    fetch("/api/seasons")
      .then((res) => res.json())
      .then((data) => {
        const list = data.data ?? data.seasons ?? []
        setSeasons(list)
        if (list.length > 0) {
          setSelectedSeason(list[0].id)
        }
      })
  }, [])

  useEffect(() => {
    if (!selectedSeason) return
    setLoading(true)
    fetchData(selectedSeason).finally(() => setLoading(false))
  }, [selectedSeason, fetchData])

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)
  const paginatedRest = rest.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold text-white">Leaderboard</h1>
        <Select
          options={seasons.map((s) => ({ label: s.name, value: s.id }))}
          value={selectedSeason}
          onChange={setSelectedSeason}
          placeholder="Select season"
          className="w-48"
        />
      </div>

      {/* Podium */}
      {loading ? (
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-white/10 animate-pulse" />
              <div className="mx-auto mb-2 h-4 w-20 rounded bg-white/10 animate-pulse" />
              <div className="mx-auto h-3 w-12 rounded bg-white/10 animate-pulse" />
            </div>
          ))}
        </div>
      ) : top3.length > 0 ? (
        <div className="mb-8 grid grid-cols-3 gap-4">
          {/* 2nd */}
          <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-300/20 text-2xl font-bold text-gray-300">
              2
            </div>
            <p className="text-sm font-semibold text-white">{top3[1]?.playerName ?? "—"}</p>
            <p className="mt-0.5 text-xs text-gray-400">{top3[1]?.university ?? ""}</p>
            <p className="mt-2 font-display text-xl font-bold text-white">{top3[1]?.points ?? 0}</p>
            <p className="text-[10px] uppercase text-gray-500">points</p>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6 text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400/20 text-3xl font-bold text-yellow-400">
              1
            </div>
            <p className="text-sm font-semibold text-white">{top3[0]?.playerName ?? "—"}</p>
            <p className="mt-0.5 text-xs text-gray-400">{top3[0]?.university ?? ""}</p>
            <p className="mt-2 font-display text-2xl font-bold text-yellow-400">{top3[0]?.points ?? 0}</p>
            <p className="text-[10px] uppercase text-gray-500">points</p>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-600/20 text-2xl font-bold text-amber-600">
              3
            </div>
            <p className="text-sm font-semibold text-white">{top3[2]?.playerName ?? "—"}</p>
            <p className="mt-0.5 text-xs text-gray-400">{top3[2]?.university ?? ""}</p>
            <p className="mt-2 font-display text-xl font-bold text-white">{top3[2]?.points ?? 0}</p>
            <p className="text-[10px] uppercase text-gray-500">points</p>
          </div>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Manager</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-400">Total Points</th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-400">Trend</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="px-6 py-4"><div className="h-4 w-6 rounded bg-white/10 animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-28 rounded bg-white/10 animate-pulse" /></td>
                  <td className="px-6 py-4 text-right"><div className="h-4 w-10 ml-auto rounded bg-white/10 animate-pulse" /></td>
                  <td className="px-6 py-4 text-center"><div className="h-4 w-6 mx-auto rounded bg-white/10 animate-pulse" /></td>
                </tr>
              ))
            ) : paginatedRest.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  {data.length === 0 ? "No data available." : "No more entries."}
                </td>
              </tr>
            ) : (
              paginatedRest.map((entry) => {
                const isYou = user && entry.playerName === user.name
                return (
                  <tr
                    key={entry.rank}
                    className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                      isYou ? "bg-brand-500/10" : ""
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-400">{entry.rank}</td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {entry.playerName}
                      {isYou && (
                        <span className="ml-2 text-xs text-brand-400">(You)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-white">
                      {entry.points}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      {entry.movement > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                          {entry.movement}
                        </span>
                      )}
                      {entry.movement < 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                          {Math.abs(entry.movement)}
                        </span>
                      )}
                      {entry.movement === 0 && (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {rest.length > perPage && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-400">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * perPage >= rest.length}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
