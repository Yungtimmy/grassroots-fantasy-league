"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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

type Tab = "fixtures" | "live" | "ended";

export default function GameweekPage() {
  const [activeTab, setActiveTab] = useState<Tab>("fixtures");
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([]);
  const [selectedGW, setSelectedGW] = useState<Gameweek | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGameweeks = useCallback(async () => {
    try {
      const res = await fetch("/api/gameweeks");
      const data = await res.json();
      const gws = data.data ?? [];
      setGameweeks(gws);
      return gws;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMatches = useCallback(async (gwId: string) => {
    try {
      const res = await fetch(`/api/matches?gameweekId=${gwId}`);
      const data = await res.json();
      setMatches(data.data ?? []);
    } catch {
      setMatches([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchGameweeks().then((gws) => {
      const active = gws.find((g: Gameweek) => g.status === "active") || gws[0];
      if (active) setSelectedGW(active);
    });
  }, [fetchGameweeks]);

  // Fetch matches when gameweek selected
  useEffect(() => {
    if (selectedGW) {
      fetchMatches(selectedGW.id);
    }
  }, [selectedGW, fetchMatches]);

  // Auto-refresh every 30s to pick up live/finished status changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedGW) fetchMatches(selectedGW.id);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedGW, fetchMatches]);

  const liveMatches = matches.filter((m) => m.status === "live");
  const finishedMatches = matches.filter((m) => m.status === "finished" || m.status === "completed");
  const upcomingMatches = matches.filter((m) => m.status === "upcoming");

  const gwStatus = selectedGW?.status === "active" ? "LIVE" : selectedGW?.status === "finished" ? "ENDED" : "UPCOMING";

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 py-4">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="flex gap-2">
            {[1,2,3,4].map(i => <div key={i} className="h-8 flex-1 rounded-xl bg-white/10 animate-pulse" />)}
          </div>
          <div className="h-px bg-white/10" />
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
                <div className="h-3 w-12 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
                </div>
                <div className="h-4 w-8 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
                </div>
                <div className="h-4 w-8 rounded bg-white/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

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
          {(["fixtures", "live", "ended"] as Tab[]).map((tab) => (
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
                  {new Date(selectedGW.startDate).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(selectedGW.endDate).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  {new Date(selectedGW.endDate).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
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
          {!isLive && !isFinished && (
            <div className="text-right">
              {match.time && (
                <span className="text-[10px] font-medium text-surface-400">{match.time}</span>
              )}
              <span className="block text-[9px] text-surface-500">
                {new Date(match.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
