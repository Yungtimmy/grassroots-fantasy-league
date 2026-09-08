"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/layout/auth-provider"

interface TeamPlayer {
  name: string
  position: string
  points: number
  isCaptain: boolean
  isViceCaptain: boolean
  team: string
}

interface TeamData {
  formation: string
  totalPoints: number
  players: TeamPlayer[]
}

const formationLayout: Record<string, number[]> = {
  "4-4-2": [1, 4, 4, 2],
  "4-3-3": [1, 4, 3, 3],
  "3-5-2": [1, 3, 5, 2],
  "3-4-3": [1, 3, 4, 3],
  "5-3-2": [1, 5, 3, 2],
  "5-4-1": [1, 5, 4, 1],
  "4-5-1": [1, 4, 5, 1],
  "4-2-3-1": [1, 4, 2, 3, 1],
}

export default function TeamPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [team, setTeam] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      fetch("/api/teams")
        .then((res) => res.json())
        .then((payload) => {
          if (!payload.success) {
            setError(payload.error || "Failed to load team")
            return
          }
          const team = payload.data
          if (!team) {
            setTeam(null)
            return
          }
          setTeam({
            formation: team.formation,
            totalPoints: team.totalPoints,
            players: (team.players ?? []).map((tp: {
              isCaptain: boolean
              isViceCaptain: boolean
              position: string
              player: { name: string; position: string; totalPoints: number; realTeam?: { shortName: string } }
            }) => ({
              name: tp.player.name,
              position: tp.player.position,
              points: tp.player.totalPoints,
              isCaptain: tp.isCaptain,
              isViceCaptain: tp.isViceCaptain,
              team: tp.player.realTeam?.shortName ?? "",
            })),
          })
        })
        .catch(() => setError("Failed to load team data"))
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

  const formation = team?.formation || "4-4-2"
  const rows = formationLayout[formation] || [1, 4, 4, 2]

  const positionOrder = ["GK", "DEF", "MID", "FWD"]
  const grouped: Record<string, TeamPlayer[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  }
  team?.players.forEach((p) => {
    if (grouped[p.position]) grouped[p.position].push(p)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Team</h1>
        <Link
          href="/squad"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Edit Team
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : !team || team.players.length === 0 ? (
        <div className="rounded-xl bg-surface-900 border border-surface-800 p-12 text-center">
          <p className="text-surface-400 text-lg mb-4">You haven&apos;t created your team yet.</p>
          <Link
            href="/squad"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Build Your Team
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-surface-900 border border-surface-800 p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-400">Formation</span>
              <span className="font-mono text-lg font-bold text-brand-400">{formation}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-surface-400">Total Points</span>
              <span className="font-mono text-lg font-bold text-white">{team.totalPoints}</span>
            </div>
          </div>

          <div className="rounded-xl bg-green-900/20 border border-green-500/20 p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 41px)"
              }} />
            </div>

            <div className="relative space-y-4">
              {rows.map((count, rowIndex) => {
                const position = positionOrder[rowIndex] || positionOrder[positionOrder.length - 1]
                const players = grouped[position] || []
                return (
                  <div key={rowIndex} className="flex justify-center gap-3 flex-wrap">
                    {Array.from({ length: count }).map((_, i) => {
                      const player = players[i]
                      if (!player) return (
                        <div key={i} className="h-16 w-24 rounded-lg border border-dashed border-surface-600 flex items-center justify-center">
                          <span className="text-xs text-surface-500">{position}</span>
                        </div>
                      )
                      return (
                        <div
                          key={i}
                          className={`h-16 w-24 rounded-lg flex flex-col items-center justify-center text-center ${
                            player.isCaptain
                              ? "bg-yellow-500/20 border border-yellow-500/50"
                              : "bg-surface-800/90 border border-surface-700"
                          }`}
                        >
                          {player.isCaptain && (
                            <span className="text-[10px] font-bold text-yellow-400">C</span>
                          )}
                          {player.isViceCaptain && !player.isCaptain && (
                            <span className="text-[10px] font-bold text-surface-400">VC</span>
                          )}
                          <span className="text-xs font-medium leading-tight px-1 truncate w-full">
                            {player.name.split(" ").pop()}
                          </span>
                          <span className="text-[10px] text-surface-400">{player.points} pts</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
            <div className="px-6 py-3 bg-surface-800/50 border-b border-surface-800">
              <h3 className="text-sm font-semibold">Full Squad</h3>
            </div>
            <div className="divide-y divide-surface-800">
              {team.players.map((player, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <span className="text-sm text-surface-400 w-6">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{player.name}</span>
                  <span className="text-xs text-surface-400 w-10 text-center">{player.position}</span>
                  <span className="text-xs text-surface-500 w-20 text-center">{player.team}</span>
                  <span className="text-sm font-mono text-brand-400 w-12 text-right">{player.points}</span>
                  {player.isCaptain && (
                    <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">C</span>
                  )}
                  {player.isViceCaptain && !player.isCaptain && (
                    <span className="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] font-bold text-surface-300">VC</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
