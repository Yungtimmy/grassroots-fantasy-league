"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/layout/auth-provider"
import { Tabs } from "@/components/ui/tabs"
import { Select } from "@/components/ui/select"

interface GrassrootsEntry {
  rank: number
  playerName: string
  university: string
  points: number
  gwPoints: number
  movement: number
}

interface UniversityEntry {
  rank: number
  universityName: string
  totalPoints: number
  playerCount: number
  movement: number
}

interface GameweekEntry {
  rank: number
  playerName: string
  university: string
  gwPoints: number
  totalPoints: number
  movement: number
}

interface Season {
  id: string
  name: string
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("grassroots")
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState("")
  const [grassrootsData, setGrassrootsData] = useState<GrassrootsEntry[]>([])
  const [leagueData, setLeagueData] = useState<GrassrootsEntry[]>([])
  const [universityData, setUniversityData] = useState<UniversityEntry[]>([])
  const [gameweekData, setGameweekData] = useState<GameweekEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [gameweek, setGameweek] = useState("1")
  const [leagues, setLeagues] = useState<Array<{ id: string; name: string }>>([])
  const [selectedLeague, setSelectedLeague] = useState("")
  const perPage = 25

  const fetchGrassroots = useCallback(async (seasonId: string) => {
    const res = await fetch(`/api/leaderboard/grassroots?seasonId=${seasonId}&limit=${perPage}&offset=${(page - 1) * perPage}`)
    if (res.ok) {
      const data = await res.json()
      const items = data.data?.items ?? []
      setGrassrootsData(
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

  const fetchUniversityRankings = useCallback(async (seasonId: string) => {
    const res = await fetch(`/api/leaderboard/university-rankings?seasonId=${seasonId}`)
    if (res.ok) {
      const data = await res.json()
      const items = data.data ?? []
      setUniversityData(
        items.map((e: { rank: number; name: string; totalPoints: number; playerCount: number }) => ({
          rank: e.rank,
          universityName: e.name,
          totalPoints: e.totalPoints,
          playerCount: e.playerCount,
          movement: 0,
        }))
      )
    }
  }, [])

  const fetchGameweek = useCallback(async (seasonId: string, gw: string) => {
    const res = await fetch(`/api/leaderboard/gameweek?seasonId=${seasonId}&gameweek=${gw}`)
    if (res.ok) {
      const data = await res.json()
      setGameweekData(data.data?.leaderboard ?? [])
    }
  }, [])

  const fetchLeague = useCallback(async (leagueId: string) => {
    const res = await fetch(`/api/leaderboard/university/${leagueId}`)
    if (res.ok) {
      const data = await res.json()
      const items = data.data ?? []
      setLeagueData(
        items.map((e: { rank: number; name: string; totalPoints: number }) => ({
          rank: e.rank,
          playerName: e.name,
          university: "",
          points: e.totalPoints,
          gwPoints: 0,
          movement: 0,
        }))
      )
    }
  }, [])

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.leagues) {
          const userLeagues = data.data.leagues.map((m: any) => ({
            id: m.leagueId,
            name: m.league?.name || "My League",
          }))
          setLeagues(userLeagues)
          if (userLeagues.length > 0) {
            setSelectedLeague(userLeagues[0].id)
          }
        }
      })
      .catch(() => {})
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
    if (activeTab === "grassroots") {
      fetchGrassroots(selectedSeason).finally(() => setLoading(false))
    } else if (activeTab === "league") {
      if (selectedLeague) {
        fetchLeague(selectedLeague).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    } else if (activeTab === "university") {
      fetchUniversityRankings(selectedSeason).finally(() => setLoading(false))
    } else {
      fetchGameweek(selectedSeason, gameweek).finally(() => setLoading(false))
    }
  }, [selectedSeason, activeTab, page, gameweek, selectedLeague, fetchGrassroots, fetchUniversityRankings, fetchGameweek, fetchLeague])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
        <Select
          options={seasons.map((s) => ({ label: s.name, value: s.id }))}
          value={selectedSeason}
          onChange={setSelectedSeason}
          placeholder="Select season"
          className="w-48"
        />
      </div>

      <Tabs
        tabs={[
          { id: "grassroots", label: "Global" },
          { id: "league", label: "My League" },
          { id: "university", label: "University" },
          { id: "gameweek", label: "Gameweek" },
        ]}
        value={activeTab}
        onChange={(v) => { setActiveTab(v); setPage(1) }}
      />

      <div className="mt-6">
        {activeTab === "grassroots" && (
          <div>
            <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-surface-800 bg-surface-800/50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">Player</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">University</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-surface-400">Points</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-surface-400">GW Points</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase text-surface-400">Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-surface-400">Loading...</td>
                    </tr>
                  ) : grassrootsData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-surface-400">No data available.</td>
                    </tr>
                  ) : (
                    grassrootsData.map((entry) => (
                      <tr
                        key={entry.rank}
                        className={`border-b border-surface-800 transition-colors hover:bg-surface-800/30 ${
                          user && entry.playerName === user.name ? "bg-brand-500/10" : ""
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-medium">
                          {entry.rank <= 3 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
                              {entry.rank}
                            </span>
                          ) : (
                            <span className="text-surface-400">{entry.rank}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {entry.playerName}
                          {user && entry.playerName === user.name && (
                            <span className="ml-2 text-xs text-brand-400">(You)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-400">{entry.university}</td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-white">
                          {entry.points}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-brand-400">
                          {entry.gwPoints}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {entry.movement > 0 && <span className="text-xs text-green-400">▲ {entry.movement}</span>}
                          {entry.movement < 0 && <span className="text-xs text-red-400">▼ {Math.abs(entry.movement)}</span>}
                          {entry.movement === 0 && <span className="text-xs text-surface-500">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {grassrootsData.length >= perPage && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-surface-800 bg-surface-900 px-4 py-2 text-sm transition-colors hover:bg-surface-800 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-surface-400">Page {page}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={grassrootsData.length < perPage}
                  className="rounded-lg border border-surface-800 bg-surface-900 px-4 py-2 text-sm transition-colors hover:bg-surface-800 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "league" && (
          <div>
            {leagues.length > 1 && (
              <div className="mb-4">
                <Select
                  options={leagues.map((l) => ({ label: l.name, value: l.id }))}
                  value={selectedLeague}
                  onChange={setSelectedLeague}
                  placeholder="Select league"
                  className="w-64"
                />
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-surface-800 bg-surface-800/50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">Player</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-surface-400">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-surface-400">Loading...</td>
                    </tr>
                  ) : leagueData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-surface-400">No league data available.</td>
                    </tr>
                  ) : (
                    leagueData.map((entry) => (
                      <tr
                        key={entry.rank}
                        className={`border-b border-surface-800 transition-colors hover:bg-surface-800/30 ${
                          user && entry.playerName === user.name ? "bg-brand-500/10" : ""
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-medium">
                          {entry.rank <= 3 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
                              {entry.rank}
                            </span>
                          ) : (
                            <span className="text-surface-400">{entry.rank}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {entry.playerName}
                          {user && entry.playerName === user.name && (
                            <span className="ml-2 text-xs text-brand-400">(You)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-white">
                          {entry.points}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "university" && (
          <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-surface-800 bg-surface-800/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">University</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-surface-400">Total Points</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-surface-400">Players</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-surface-400">Movement</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-surface-400">Loading...</td>
                  </tr>
                ) : universityData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-surface-400">No data available.</td>
                  </tr>
                ) : (
                  universityData.map((entry) => (
                    <tr key={entry.rank} className="border-b border-surface-800 transition-colors hover:bg-surface-800/30">
                      <td className="px-6 py-4 text-sm font-medium">
                        {entry.rank <= 3 ? (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="text-surface-400">{entry.rank}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{entry.universityName}</td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-white">
                        {entry.totalPoints}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-surface-400">{entry.playerCount}</td>
                      <td className="px-6 py-4 text-center text-sm">
                        {entry.movement > 0 && <span className="text-xs text-green-400">▲ {entry.movement}</span>}
                        {entry.movement < 0 && <span className="text-xs text-red-400">▼ {Math.abs(entry.movement)}</span>}
                        {entry.movement === 0 && <span className="text-xs text-surface-500">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "gameweek" && (
          <div>
            <div className="mb-4">
              <Select
                options={Array.from({ length: 38 }, (_, i) => ({ label: `Gameweek ${i + 1}`, value: String(i + 1) }))}
                value={gameweek}
                onChange={setGameweek}
                placeholder="Gameweek"
                className="w-48"
              />
            </div>
            <div className="overflow-x-auto rounded-xl border border-surface-800 bg-surface-900">
              <table className="w-full min-w-[550px]">
                <thead>
                  <tr className="border-b border-surface-800 bg-surface-800/50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">Player</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-surface-400">University</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-surface-400">GW Points</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-surface-400">Total Points</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase text-surface-400">Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-surface-400">Loading...</td>
                    </tr>
                  ) : gameweekData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-surface-400">No gameweek data available.</td>
                    </tr>
                  ) : (
                    gameweekData.map((entry) => (
                      <tr key={entry.rank} className="border-b border-surface-800 transition-colors hover:bg-surface-800/30">
                        <td className="px-6 py-4 text-sm font-medium">
                          {entry.rank <= 3 ? (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
                              {entry.rank}
                            </span>
                          ) : (
                            <span className="text-surface-400">{entry.rank}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">{entry.playerName}</td>
                        <td className="px-6 py-4 text-sm text-surface-400">{entry.university}</td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-brand-400">
                          {entry.gwPoints}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-white">
                          {entry.totalPoints}
                        </td>
                        <td className="px-6 py-4 text-center text-sm">
                          {entry.movement > 0 && <span className="text-xs text-green-400">▲ {entry.movement}</span>}
                          {entry.movement < 0 && <span className="text-xs text-red-400">▼ {Math.abs(entry.movement)}</span>}
                          {entry.movement === 0 && <span className="text-xs text-surface-500">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
