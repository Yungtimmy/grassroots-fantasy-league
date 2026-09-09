"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layout/auth-provider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Gameweek {
  id: string;
  number: number;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  deadline: string;
}

interface Match {
  id: string;
  homeTeam: { id: string; name: string; shortName: string; logo: string | null };
  awayTeam: { id: string; name: string; shortName: string; logo: string | null };
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  time: string | null;
  venue: string | null;
  status: string;
}

interface PlayerBreakdown {
  name: string;
  position: string;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  yellowCards: number;
  redCards: number;
  points: number;
}

type Tab = "overview" | "fixtures" | "live" | "ended";

export default function GameweekPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([]);
  const [selectedGW, setSelectedGW] = useState<Gameweek | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPoints, setMyPoints] = useState(0);
  const [overallPoints, setOverallPoints] = useState(0);
  const [leagueRank, setLeagueRank] = useState(0);
  const [rankChange, setRankChange] = useState(0);
  const [playerBreakdown, setPlayerBreakdown] = useState<PlayerBreakdown[]>([]);

  useEffect(() => {
    fetchGameweeks();
  }, []);

  useEffect(() => {
    if (selectedGW) {
      fetchMatches(selectedGW.id);
      if (user) fetchMyPoints(selectedGW.id);
    }
  }, [selectedGW, user]);

  async function fetchGameweeks() {
    try {
      const res = await fetch("/api/admin/gameweeks");
      const data = await res.json();
      const gws = data.data ?? [];
      setGameweeks(gws);
      const active = gws.find((g: Gameweek) => g.status === "active") || gws[0];
      if (active) setSelectedGW(active);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function fetchMatches(gwId: string) {
    try {
      const res = await fetch(`/api/admin/matches?gameweekId=${gwId}`);
      const data = await res.json();
      setMatches(data.data ?? []);
    } catch {
      setMatches([]);
    }
  }

  async function fetchMyPoints(gwId: string) {
    try {
      const res = await fetch(`/api/leaderboard/gameweek?gameweekId=${gwId}`);
      const data = await res.json();
      const board = data.data?.leaderboard ?? [];
      const me = board.find((e: any) => e.userId === user?.id);
      if (me) {
        setMyPoints(me.gwPoints ?? 0);
        setOverallPoints(me.totalPoints ?? 0);
        setLeagueRank(me.rank ?? 0);
        setRankChange(me.movement ?? 0);
      }
    } catch {
      // silent
    }
  }

  const liveMatches = matches.filter((m) => m.status === "live");
  const finishedMatches = matches.filter((m) => m.status === "finished" || m.status === "completed");
  const upcomingMatches = matches.filter((m) => m.status === "upcoming");

  const gwStatus = selectedGW?.status === "active" ? "LIVE" : selectedGW?.status === "finished" ? "ENDED" : "UPCOMING";

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="font-display text-sm font-semibold text-surface-900 dark:text-white">
              Gameweek {selectedGW?.number ?? "—"}
            </span>
          </div>
          {gwStatus === "LIVE" && (
            <Badge variant="success" className="text-[10px]">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </Badge>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* GW Selector */}
        {gameweeks.length > 0 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {gameweeks.map((gw) => (
              <button
                key={gw.id}
                onClick={() => setSelectedGW(gw)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  selectedGW?.id === gw.id
                    ? "bg-brand-500 text-white"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
                }`}
              >
                GW{gw.number}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-xl bg-surface-100 dark:bg-surface-800 p-1">
          {(["overview", "fixtures", "live", "ended"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm"
                  : "text-surface-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* GW Info Card */}
        {selectedGW && (
          <div className="mb-4 rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-surface-900 dark:text-white">
                    Gameweek {selectedGW.number}
                  </h2>
                  {gwStatus === "LIVE" && (
                    <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-surface-500">
                  {new Date(selectedGW.startDate).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(selectedGW.endDate).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-3 text-center">
                <p className="text-[10px] uppercase text-surface-500">Your Points</p>
                <p className="mt-1 font-display text-2xl font-bold text-brand-500">{myPoints}</p>
              </div>
              <div className="rounded-xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-3 text-center">
                <p className="text-[10px] uppercase text-surface-500">Overall Points</p>
                <p className="mt-1 font-display text-2xl font-bold text-surface-900 dark:text-white">{overallPoints}</p>
              </div>
              <div className="rounded-xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-3 text-center">
                <p className="text-[10px] uppercase text-surface-500">League Rank</p>
                <p className="mt-1 font-display text-2xl font-bold text-surface-900 dark:text-white">#{leagueRank || "—"}</p>
              </div>
              <div className="rounded-xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-3 text-center">
                <p className="text-[10px] uppercase text-surface-500">Rank Change</p>
                <div className="mt-1 flex items-center justify-center gap-1">
                  {rankChange > 0 ? (
                    <span className="font-display text-2xl font-bold text-green-500">↑{rankChange}</span>
                  ) : rankChange < 0 ? (
                    <span className="font-display text-2xl font-bold text-red-500">↓{Math.abs(rankChange)}</span>
                  ) : (
                    <span className="font-display text-2xl font-bold text-surface-400">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Fixtures Summary */}
            <div className="rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-4">
              <h3 className="mb-3 font-display text-sm font-semibold text-surface-900 dark:text-white">
                Fixtures & Matches
              </h3>
              {matches.length === 0 ? (
                <p className="text-center text-sm text-surface-400 py-4">No matches scheduled</p>
              ) : (
                <div className="space-y-2">
                  {matches.slice(0, 5).map((match) => (
                    <MatchCard key={match.id} match={match} compact />
                  ))}
                </div>
              )}
            </div>

            {/* Player Points Breakdown */}
            {playerBreakdown.length > 0 && (
              <div className="rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-4">
                <h3 className="mb-3 font-display text-sm font-semibold text-surface-900 dark:text-white">
                  Player Points Breakdown
                </h3>
                <div className="space-y-2">
                  {playerBreakdown.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-surface-50 dark:bg-surface-900/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={p.position as any} className="text-[10px]">{p.position}</Badge>
                        <span className="text-sm text-surface-900 dark:text-white">{p.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-brand-500">{p.points} pts</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-surface-200 dark:border-surface-700 pt-3">
                  <span className="text-sm font-semibold text-surface-900 dark:text-white">Total</span>
                  <span className="text-lg font-bold text-brand-500">{myPoints}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fixtures Tab */}
        {activeTab === "fixtures" && (
          <div className="space-y-2">
            {matches.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-surface-800/80 p-8 text-center">
                <p className="text-sm text-surface-400">No matches scheduled for this gameweek.</p>
              </div>
            ) : (
              matches.map((match) => <MatchCard key={match.id} match={match} />)
            )}
          </div>
        )}

        {/* Live Tab */}
        {activeTab === "live" && (
          <div className="space-y-2">
            {liveMatches.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-surface-800/80 p-8 text-center">
                <p className="text-sm text-surface-400">No live matches right now.</p>
              </div>
            ) : (
              liveMatches.map((match) => <MatchCard key={match.id} match={match} />)
            )}
          </div>
        )}

        {/* Ended Tab */}
        {activeTab === "ended" && (
          <div className="space-y-2">
            {finishedMatches.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-surface-800/80 p-8 text-center">
                <p className="text-sm text-surface-400">No finished matches yet.</p>
              </div>
            ) : (
              finishedMatches.map((match) => <MatchCard key={match.id} match={match} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished" || match.status === "completed";
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <div className={`rounded-xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-3">
        {/* Home Team */}
        <div className="flex-1 text-right">
          <p className={`font-medium text-surface-900 dark:text-white ${compact ? "text-xs" : "text-sm"}`}>
            {match.homeTeam.shortName}
          </p>
        </div>

        {/* Score */}
        <div className="shrink-0">
          {hasScore ? (
            <div className={`flex items-center gap-2 rounded-lg bg-surface-100 dark:bg-surface-700 ${compact ? "px-3 py-1.5" : "px-4 py-2"}`}>
              <span className={`font-mono font-bold text-surface-900 dark:text-white ${compact ? "text-base" : "text-lg"}`}>
                {match.homeScore}
              </span>
              <span className="text-surface-400">-</span>
              <span className={`font-mono font-bold text-surface-900 dark:text-white ${compact ? "text-base" : "text-lg"}`}>
                {match.awayScore}
              </span>
            </div>
          ) : (
            <span className="text-xs uppercase tracking-widest text-surface-400">vs</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 text-left">
          <p className={`font-medium text-surface-900 dark:text-white ${compact ? "text-xs" : "text-sm"}`}>
            {match.awayTeam.shortName}
          </p>
        </div>

        {/* Status */}
        <div className="w-12 shrink-0 text-right">
          {isLive && (
            <Badge variant="success" className="text-[9px]">
              <span className="mr-0.5 h-1 w-1 rounded-full bg-green-400 animate-pulse" />
              {isFinished ? "FT" : "LIVE"}
            </Badge>
          )}
          {isFinished && !isLive && (
            <span className="text-[10px] font-medium text-surface-500">FT</span>
          )}
          {!isLive && !isFinished && match.time && (
            <span className="text-[10px] text-surface-500">{match.time}</span>
          )}
        </div>
      </div>
    </div>
  );
}
