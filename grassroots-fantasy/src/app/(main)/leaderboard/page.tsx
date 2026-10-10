"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/layout/auth-provider"
import { Select } from "@/components/ui/select"
import { ManagerSquadDialog, type SquadManager } from "@/components/leaderboard/manager-squad-dialog"

interface LeaderboardEntry {
  rank: number
  userId: string
  teamId: string
  playerName: string
  university: string
  points: number
  movement: number
}

interface RawEntry {
  rank: number
  userId: string
  teamId: string
  name: string
  university: string
  totalPoints: number
  movement: number
}

function mapEntries(items: RawEntry[]): LeaderboardEntry[] {
  return items.map((entry) => ({
    rank: entry.rank,
    userId: entry.userId,
    teamId: entry.teamId,
    playerName: entry.name,
    university: entry.university,
    points: entry.totalPoints,
    movement: entry.movement ?? 0,
  }))
}

interface Season {
  id: string
  name: string
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState("")
  const [board, setBoard] = useState<"national" | "university">("national")
  const [universities, setUniversities] = useState<Array<{ universityId: string; shortName: string; name: string }>>([])
  const [universityId, setUniversityId] = useState("")
  const [viewerUniversityId, setViewerUniversityId] = useState("")
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedManager, setSelectedManager] = useState<SquadManager | null>(null)
  const perPage = 25

  const fetchData = useCallback(async () => {
    if (!selectedSeason) return
    if (board === "university") {
      if (!universityId) return
      // Route param is the university id (the handler filters league.universityId).
      const res = await fetch(`/api/leaderboard/university/${universityId}?seasonId=${selectedSeason}`)
      if (!res.ok) {
        setData([])
        return
      }
      const json = await res.json()
      setData(mapEntries(Array.isArray(json.data) ? json.data : []))
      return
    }

    const res = await fetch(`/api/leaderboard/grassroots?seasonId=${selectedSeason}&limit=5000&offset=0`)
    if (!res.ok) {
      setData([])
      return
    }
    const json = await res.json()
    const items = json.data?.items
    setData(mapEntries(Array.isArray(items) ? items : []))
  }, [board, selectedSeason, universityId])

  function openManager(entry: LeaderboardEntry | undefined) {
    if (!entry?.userId) return
    setSelectedManager({
      userId: entry.userId,
      teamId: entry.teamId,
      name: entry.playerName,
      university: entry.university,
    })
  }

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
    if (!user) {
      setViewerUniversityId("")
      return
    }
    let cancelled = false
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return
        setViewerUniversityId(json?.data?.leagueMembership?.league?.university?.id ?? "")
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (board !== "university" || !selectedSeason) return
    let cancelled = false
    fetch(`/api/leaderboard/university-rankings?seasonId=${selectedSeason}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return
        setUniversities(json?.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setUniversities([])
      })
    return () => {
      cancelled = true
    }
  }, [board, selectedSeason])

  useEffect(() => {
    if (board !== "university") return
    if (universities.length === 0) {
      setUniversityId("")
      return
    }
    setUniversityId((current) => {
      if (current && universities.some((uni) => uni.universityId === current)) return current
      if (viewerUniversityId && universities.some((uni) => uni.universityId === viewerUniversityId)) {
        return viewerUniversityId
      }
      return universities[0].universityId
    })
  }, [board, universities, viewerUniversityId])

  useEffect(() => {
    setPage(1)
    setSelectedManager(null)
  }, [selectedSeason, board, universityId])

  useEffect(() => {
    if (!selectedSeason) return
    if (board === "university" && !universityId) {
      setData([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchData().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [selectedSeason, board, universityId, fetchData])

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)
  const totalPages = Math.ceil(rest.length / perPage)
  const paginatedRest = rest.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Leaderboard</h1>
          <div className="mt-3 flex gap-2" role="tablist" aria-label="Leaderboard">
            {([
              ["national", "National"],
              ["university", "University"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={board === value}
                onClick={() => setBoard(value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  board === value ? "bg-brand-500 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Select
            options={seasons.map((s) => ({ label: s.name, value: s.id }))}
            value={selectedSeason}
            onChange={setSelectedSeason}
            placeholder="Select season"
            className="w-48"
          />
          {board === "university" && universities.length > 0 && (
            <Select
              options={universities.map((uni) => ({ label: uni.shortName || uni.name, value: uni.universityId }))}
              value={universityId}
              onChange={setUniversityId}
              placeholder="Select university"
              className="w-48"
            />
          )}
        </div>
      </div>

      {/* Podium */}
      {loading ? (
        <div className="mb-10 flex items-end justify-center gap-3">
          <div className="w-28 rounded-t-2xl border border-white/10 bg-white/5 p-5 text-center" style={{ height: 140 }}>
            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-white/10 animate-pulse" />
            <div className="mx-auto mb-1 h-3 w-16 rounded bg-white/10 animate-pulse" />
            <div className="mx-auto h-4 w-10 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="w-32 rounded-t-2xl border border-white/10 bg-white/5 p-5 text-center" style={{ height: 180 }}>
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-white/10 animate-pulse" />
            <div className="mx-auto mb-1 h-3 w-16 rounded bg-white/10 animate-pulse" />
            <div className="mx-auto h-4 w-10 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="w-28 rounded-t-2xl border border-white/10 bg-white/5 p-5 text-center" style={{ height: 110 }}>
            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-white/10 animate-pulse" />
            <div className="mx-auto mb-1 h-3 w-16 rounded bg-white/10 animate-pulse" />
            <div className="mx-auto h-4 w-10 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      ) : top3.length > 0 ? (
        <div className="mb-10 flex items-end justify-center gap-2 sm:gap-3">
          {/* 2nd — Silver (left) */}
          {top3[1] && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => openManager(top3[1])}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  openManager(top3[1])
                }
              }}
              className="flex cursor-pointer flex-col items-center w-28 sm:w-32"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-400 text-2xl font-black text-gray-800 shadow-lg shadow-gray-500/20">
                2
              </div>
              <span className="block text-xs sm:text-sm font-semibold text-white text-center truncate w-full">{top3[1].playerName}</span>
              <span className="block text-[10px] sm:text-xs text-gray-500 text-center">{top3[1].university}</span>
              <span className="mt-1 block font-display text-lg sm:text-xl font-bold text-gray-300">{top3[1].points}</span>
              <span className="mt-2 block w-full rounded-t-xl bg-gradient-to-t from-gray-500/30 to-gray-400/10 border border-gray-500/20 border-b-0 px-3 py-3 text-center" style={{ height: 80 }}>
                <span className="text-[10px] uppercase tracking-wider text-gray-400">2nd</span>
              </span>
            </div>
          )}
          {/* 1st — Gold (center, tallest) */}
          {top3[0] && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => openManager(top3[0])}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  openManager(top3[0])
                }
              }}
              className="flex cursor-pointer flex-col items-center w-32 sm:w-36"
            >
              <span className="mb-1 block text-2xl">👑</span>
              <span className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 text-3xl font-black text-yellow-900 shadow-lg shadow-yellow-500/30">
                1
              </span>
              <span className="block text-sm sm:text-base font-bold text-white text-center truncate w-full">{top3[0].playerName}</span>
              <span className="block text-xs text-gray-500 text-center">{top3[0].university}</span>
              <span className="mt-1 block font-display text-2xl sm:text-3xl font-black text-yellow-400">{top3[0].points}</span>
              <span className="mt-2 block w-full rounded-t-xl bg-gradient-to-t from-yellow-500/30 to-yellow-400/10 border border-yellow-500/20 border-b-0 px-3 py-3 text-center" style={{ height: 120 }}>
                <span className="text-[10px] uppercase tracking-wider text-yellow-400">Champion</span>
              </span>
            </div>
          )}
          {/* 3rd — Bronze (right) */}
          {top3[2] && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => openManager(top3[2])}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  openManager(top3[2])
                }
              }}
              className="flex cursor-pointer flex-col items-center w-28 sm:w-32"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-2xl font-black text-amber-100 shadow-lg shadow-amber-600/20">
                3
              </div>
              <span className="block text-xs sm:text-sm font-semibold text-white text-center truncate w-full">{top3[2].playerName}</span>
              <span className="block text-[10px] sm:text-xs text-gray-500 text-center">{top3[2].university}</span>
              <span className="mt-1 block font-display text-lg sm:text-xl font-bold text-amber-600">{top3[2].points}</span>
              <span className="mt-2 block w-full rounded-t-xl bg-gradient-to-t from-amber-600/30 to-amber-500/10 border border-amber-600/20 border-b-0 px-3 py-3 text-center" style={{ height: 60 }}>
                <span className="text-[10px] uppercase tracking-wider text-amber-600">3rd</span>
              </span>
            </div>
          )}
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
                const isYou = user && entry.userId === user.id
                return (
                  <tr
                    key={`${entry.userId}-${entry.rank}`}
                    onClick={() => openManager(entry)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        openManager(entry)
                      }
                    }}
                    tabIndex={0}
                    aria-label={`View ${entry.playerName}'s squad`}
                    className={`cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5 ${
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
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {!loading && data.length > 0 && (
        <p className="mt-4 text-center text-xs text-gray-600">
          {data.length} player{data.length !== 1 ? "s" : ""} registered. Select a manager to view their squad.
        </p>
      )}

      <ManagerSquadDialog
        manager={selectedManager}
        seasonId={selectedSeason}
        onClose={() => setSelectedManager(null)}
      />
    </div>
  )
}
