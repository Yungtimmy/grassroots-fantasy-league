"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface GameweekOption {
  id: string;
  number: number;
  name: string;
  status: string;
}

interface PlayerDetail {
  id: string;
  name: string;
  position: string;
  realTeam: { shortName: string } | null;
}

interface MostSelectedEntry {
  playerId: string;
  player: PlayerDetail | undefined;
  selectedCount: number;
}

interface TopScorerEntry {
  playerId: string;
  player: PlayerDetail | undefined;
  totalPoints: number;
}

export default function GameweekStatsPage() {
  const [gameweeks, setGameweeks] = useState<GameweekOption[]>([]);
  const [selectedGw, setSelectedGw] = useState("");
  const [mostSelected, setMostSelected] = useState<MostSelectedEntry[]>([]);
  const [topScorers, setTopScorers] = useState<TopScorerEntry[]>([]);
  const [loadingGws, setLoadingGws] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    fetch("/api/admin/gameweek-stats")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const weeks: GameweekOption[] = d.data.gameweeks ?? [];
        setGameweeks(weeks);
        const defaultId = typeof d.data.defaultGameweekId === "string" ? d.data.defaultGameweekId : "";
        if (defaultId && weeks.some((gw) => gw.id === defaultId)) {
          setSelectedGw(defaultId);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingGws(false));
  }, []);

  useEffect(() => {
    if (!selectedGw) {
      setMostSelected([]);
      setTopScorers([]);
      return;
    }
    setLoadingStats(true);
    fetch(`/api/admin/gameweek-stats?gameweekId=${selectedGw}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMostSelected(d.data.mostSelected ?? []);
          setTopScorers(d.data.topScorers ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [selectedGw]);

  const selectedWeek = gameweeks.find((gw) => gw.id === selectedGw);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Gameweek Stats</h1>
        <p className="text-surface-400 mt-1">Per-gameweek player statistics</p>
      </div>

      <Card>
        <div className="min-w-0 p-4">
          {loadingGws ? (
            <Skeleton height={16} width={200} />
          ) : gameweeks.length === 0 ? (
            <p className="text-sm text-surface-400">No gameweeks in the active season.</p>
          ) : (
            <div className="min-w-0">
              <p id="gw-stats-selector-label" className="mb-2 text-sm font-medium text-surface-300">
                Select Gameweek
              </p>
              <div
                role="group"
                aria-labelledby="gw-stats-selector-label"
                className="flex max-w-full flex-wrap gap-2"
              >
                {gameweeks.map((gw) => {
                  const selected = gw.id === selectedGw;
                  return (
                    <button
                      key={gw.id}
                      type="button"
                      aria-pressed={selected}
                      title={`${gw.name} (${gw.status})`}
                      onClick={() => setSelectedGw(gw.id)}
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        selected
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-surface-600 bg-surface-900 text-surface-200 hover:border-surface-500"
                      )}
                    >
                      GW{gw.number}
                    </button>
                  );
                })}
              </div>
              {selectedWeek && (
                <p className="mt-3 text-xs text-surface-400">
                  {selectedWeek.name} ({selectedWeek.status})
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {loadingStats ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} height={16} width="100%" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : selectedGw ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Card className="min-w-0">
            <div className="p-4 border-b border-surface-700/50">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Most Selected Players</h2>
            </div>
            <div className="overflow-x-auto">
              {mostSelected.length === 0 ? (
                <p className="p-6 text-surface-400 text-sm">No data available.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Pos</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Team</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostSelected.map((entry, idx) => (
                      <tr key={entry.playerId} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                        <td className="px-4 py-3 text-surface-300 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-surface-200">{entry.player?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-surface-400">{entry.player?.position ?? "—"}</td>
                        <td className="px-4 py-3 text-surface-400">{entry.player?.realTeam?.shortName ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-brand-400">{entry.selectedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <Card className="min-w-0">
            <div className="p-4 border-b border-surface-700/50">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Top Scorers</h2>
            </div>
            <div className="overflow-x-auto">
              {topScorers.length === 0 ? (
                <p className="p-6 text-surface-400 text-sm">No data available.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Pos</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Team</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topScorers.map((entry, idx) => (
                      <tr key={entry.playerId} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                        <td className="px-4 py-3 text-surface-300 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-surface-200">{entry.player?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-surface-400">{entry.player?.position ?? "—"}</td>
                        <td className="px-4 py-3 text-surface-400">{entry.player?.realTeam?.shortName ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-brand-400">{entry.totalPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <p className="p-6 text-surface-400 text-sm text-center">Select a gameweek to view stats.</p>
        </Card>
      )}
    </div>
  );
}
