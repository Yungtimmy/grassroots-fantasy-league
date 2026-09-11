"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/layout/auth-provider"
import { Select } from "@/components/ui/select"

interface LeaderboardEntry {
  rank: number
  playerName: string
  university: string
  points: number
  gwPoints: number
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
    const res = await fetch(`/api/leaderboard/grassroots?seasonId=${seasonId}&limit=${perPage}&offset=${(page - 1) * perPage}`)
    if (res.ok) {
      const json = await res.json()
      const items = json.data?.items ?? []
      setData(
        items.map((e: { rank: number; name: string; university: string; totalPoints: number; gameweekPoints: number; movement: number }) => ({
          rank: e.rank,
          playerName: e.name,
          university: e.university,
          points: e.totalPoints,
          gwPoints: e.gameweekPoints,
          movement: e.movement ?? 0,
        }))
      )
    }
  }, [page])

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

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Manager</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-400">Total Points</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-400">GW Points</th>
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
                  <td className="px-6 py-4 text-right"><div className="h-4 w-8 ml-auto rounded bg-white/10 animate-pulse" /></td>
                  <td className="px-6 py-4 text-center"><div className="h-4 w-6 mx-auto rounded bg-white/10 animate-pulse" /></td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No data available.</td>
              </tr>
            ) : (
              data.map((entry) => {
                const isYou = user && entry.playerName === user.name
                return (
                  <tr
                    key={entry.rank}
                    className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                      isYou ? "bg-brand-500/10" : ""
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-medium">
                      {entry.rank <= 3 ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
                          {entry.rank}
                        </span>
                      ) : (
                        <span className="text-gray-400">{entry.rank}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {entry.playerName}
                      {isYou && (
                        <span className="ml-2 text-xs text-brand-400">(You)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-white">
                      {entry.points}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-brand-400">
                      {entry.gwPoints}
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

      {data.length >= perPage && (
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
            disabled={data.length < perPage}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
