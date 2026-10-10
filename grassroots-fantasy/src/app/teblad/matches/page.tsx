"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";

interface Match {
  id: string;
  gameweekId: string;
  gameweekNumber?: number;
  homeTeam: { id: string; name: string; shortName: string; logo: string | null };
  awayTeam: { id: string; name: string; shortName: string; logo: string | null };
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  time: string | null;
  venue: string | null;
  status: string;
}

interface GameweekOption {
  id: string;
  number: number;
  name: string;
  status: string;
}

interface TeamOption {
  id: string;
  name: string;
  shortName: string;
}

interface PlayerInMatch {
  id: string;
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  isHome: boolean;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  saves: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltyMiss: number;
  penaltySave: number;
  goalsConceded: number;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameweeks, setGameweeks] = useState<GameweekOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [statsModal, setStatsModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    gameweekId: "",
    homeTeamId: "",
    awayTeamId: "",
    date: "",
    time: "",
    venue: "",
  });
  const [resultForm, setResultForm] = useState({ homeScore: 0, awayScore: 0 });
  const [playerStats, setPlayerStats] = useState<PlayerInMatch[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [matchScores, setMatchScores] = useState<{ homeScore: number | null; awayScore: number | null }>({ homeScore: null, awayScore: null });
  const [formError, setFormError] = useState("");
  const [statsError, setStatsError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [matchesRes, gwRes, teamsRes] = await Promise.all([
        fetch("/api/admin/matches"),
        fetch("/api/admin/gameweeks"),
        fetch("/api/admin/teams"),
      ]);
      if (matchesRes.ok) {
        const data = await matchesRes.json();
        setMatches(data.data ?? []);
      }
      if (gwRes.ok) {
        const data = await gwRes.json();
        setGameweeks(data.data ?? []);
      }
      if (teamsRes.ok) {
        const data = await teamsRes.json();
        setTeams(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s to pick up live/finished status changes
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function openCreate() {
    setForm({ gameweekId: "", homeTeamId: "", awayTeamId: "", date: "", time: "", venue: "" });
    setFormError("");
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.gameweekId || !form.homeTeamId || !form.awayTeamId || !form.date) {
      setFormError("Gameweek, teams, and date are required");
      return;
    }
    if (form.homeTeamId === form.awayTeamId) {
      setFormError("Home and away teams must be different");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchData();
      } else {
        setFormError(data.error || "Failed to create match");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function openResult(match: Match) {
    setSelectedMatch(match);
    setResultForm({
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
    });
    setResultModal(true);
  }

  async function handleResult(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatch) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/matches/${selectedMatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultForm),
      });
      const data = await res.json();
      if (data.success) {
        setResultModal(false);
        fetchData();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function openStats(match: Match) {
    setSelectedMatch(match);
    setStatsModal(true);
    setStatsLoading(true);
    setStatsError("");
    setActiveAction(null);
    try {
      const res = await fetch(`/api/admin/matches/${match.id}/stats`);
      if (res.ok) {
        const data = await res.json();
        setPlayerStats(data.data ?? []);
        setMatchScores(data.match ?? { homeScore: null, awayScore: null });
      }
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }

  async function saveStats() {
    if (!selectedMatch) return;
    setSaving(true);
    setStatsError("");
    try {
      const res = await fetch(`/api/admin/matches/${selectedMatch.id}/stats`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats: playerStats }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setStatsError(data.error || `Save failed (${res.status}). Points were not changed.`);
        return;
      }
      setStatsModal(false);
      setActiveAction(null);
    } catch {
      setStatsError("Network error. Points were not changed.");
    } finally {
      setSaving(false);
    }
  }

  function updateStat(index: number, field: keyof PlayerInMatch, value: number | boolean) {
    setPlayerStats((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleQuickAction(index: number) {
    if (!activeAction) return;
    setPlayerStats((prev) => {
      const next = [...prev];
      const player = { ...next[index] };
      switch (activeAction) {
        case "appearance":
          player.minutes = player.minutes > 0 ? player.minutes : 90;
          break;
        case "goal":
          player.goals += 1;
          break;
        case "assist":
          player.assists += 1;
          break;
        case "penaltySave":
          player.penaltySave += 1;
          break;
      }
      next[index] = player;
      return next;
    });
  }

  function autoCleanSheet() {
    setPlayerStats((prev) => {
      const homeScore = matchScores.homeScore ?? 0;
      const awayScore = matchScores.awayScore ?? 0;
      return prev.map((ps) => {
        if (ps.position !== "GK" && ps.position !== "DEF") return ps;
        if (ps.minutes <= 0) {
          return { ...ps, cleanSheet: false, goalsConceded: 0 };
        }
        const conceded = ps.isHome ? awayScore : homeScore;
        if (conceded === 0) {
          return { ...ps, cleanSheet: true, goalsConceded: 0 };
        }
        return { ...ps, cleanSheet: false, goalsConceded: conceded };
      });
    });
  }

  // Group players by team
  const homePlayers = playerStats.filter((ps) => ps.isHome);
  const awayPlayers = playerStats.filter((ps) => !ps.isHome);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fixtures</h1>
          <p className="text-surface-400 mt-1">
            Manually enter gameweek, club vs club, date and time. These show on the Fixtures page.
          </p>
        </div>
        <Button onClick={openCreate}>Add Fixture</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">
              No fixtures yet. Create a gameweek and clubs first, then add club vs club here.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Gameweek</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Home</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-surface-400">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Away</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3 text-surface-400">GW{m.gameweekNumber ?? "?"}</td>
                    <td className="px-6 py-3 font-medium text-surface-200">{m.homeTeam.shortName}</td>
                    <td className="px-6 py-3 text-center">
                      {m.homeScore !== null ? (
                        <span className="font-bold text-white">
                          {m.homeScore} - {m.awayScore}
                        </span>
                      ) : (
                        <span className="text-surface-500">vs</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-medium text-surface-200">{m.awayTeam.shortName}</td>
                    <td className="px-6 py-3 text-surface-400">{formatDate(m.date)}</td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          m.status === "finished" ? "success" : m.status === "live" ? "pending" : "info"
                        }
                        dot
                      >
                        {m.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openResult(m)}>
                          Result
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => openStats(m)}>
                          Stats
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            if (!confirm("Delete this fixture?")) return;
                            await fetch(`/api/admin/matches/${m.id}`, { method: "DELETE" });
                            fetchData();
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Create Match Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Match" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Gameweek"
            value={form.gameweekId}
            onChange={(v) => setForm({ ...form, gameweekId: v })}
            options={gameweeks.map((g) => ({
              label: `GW${g.number} - ${g.name}`,
              value: g.id,
            }))}
            placeholder="Select gameweek"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Home club"
              value={form.homeTeamId}
              onChange={(v) => setForm({ ...form, homeTeamId: v })}
              options={teams.map((t) => ({ label: t.name, value: t.id }))}
              placeholder="Select home club"
            />
            <Select
              label="Away club"
              value={form.awayTeamId}
              onChange={(v) => setForm({ ...form, awayTeamId: v })}
              options={teams.map((t) => ({ label: t.name, value: t.id }))}
              placeholder="Select away club"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Input
              label="Time"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
          <Input
            label="Venue"
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
            placeholder="Stadium name"
          />
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create Match
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Update Result Modal */}
      <Modal open={resultModal} onClose={() => setResultModal(false)} title="Update Result" size="sm">
        <form onSubmit={handleResult} className="space-y-4">
          <p className="text-surface-300 text-sm">
            {selectedMatch?.homeTeam.shortName} vs {selectedMatch?.awayTeam.shortName}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Home (${selectedMatch?.homeTeam.shortName})`}
              type="number"
              min={0}
              value={resultForm.homeScore}
              onChange={(e) => setResultForm({ ...resultForm, homeScore: parseInt(e.target.value) || 0 })}
            />
            <Input
              label={`Away (${selectedMatch?.awayTeam.shortName})`}
              type="number"
              min={0}
              value={resultForm.awayScore}
              onChange={(e) => setResultForm({ ...resultForm, awayScore: parseInt(e.target.value) || 0 })}
            />
          </div>
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setResultModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Result
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Player Stats Modal */}
      <Modal open={statsModal} onClose={() => { setStatsModal(false); setActiveAction(null); }} title={`${selectedMatch?.homeTeam.shortName} vs ${selectedMatch?.awayTeam.shortName} — Player Stats`} size="xl">
        {statsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={20} width="100%" />
            ))}
          </div>
        ) : playerStats.length === 0 ? (
          <p className="text-surface-400 text-sm">No players found for this match.</p>
        ) : (
          <div className="space-y-4">
            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-surface-500 self-center mr-1">Quick assign:</span>
              {[
                { key: "appearance", label: "Appearance", icon: "⚽", color: "bg-blue-500/20 border-blue-500/40 text-blue-400" },
                { key: "goal", label: "Goal", icon: "🥅", color: "bg-green-500/20 border-green-500/40 text-green-400" },
                { key: "assist", label: "Assist", icon: "👟", color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400" },
                { key: "penaltySave", label: "Penalty Saved", icon: "🧤", color: "bg-purple-500/20 border-purple-500/40 text-purple-400" },
              ].map((action) => (
                <button
                  key={action.key}
                  onClick={() => setActiveAction(activeAction === action.key ? null : action.key)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    activeAction === action.key
                      ? `${action.color} ring-1 ring-white/20`
                      : "border-surface-600 bg-surface-800 text-surface-400 hover:bg-surface-700"
                  }`}
                >
                  <span>{action.icon}</span>
                  {action.label}
                  {activeAction === action.key && <span className="ml-1 text-[10px] opacity-70">(click players)</span>}
                </button>
              ))}
              <button
                onClick={autoCleanSheet}
                className="flex items-center gap-1.5 rounded-lg border border-surface-600 bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-400 hover:bg-surface-700"
              >
                🧹 Auto Clean Sheet
              </button>
            </div>

            {activeAction && (
              <p className="text-xs text-lime-400/80">
                Click any player below to assign <strong>{activeAction === "appearance" ? "Appearance" : activeAction === "goal" ? "Goal" : activeAction === "assist" ? "Assist" : "Penalty Saved"}</strong>. Click the button again to cancel.
              </p>
            )}

            {/* Home Team */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
                {selectedMatch?.homeTeam.name} (Home)
              </h4>
              <div className="overflow-x-auto max-h-[250px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-800">
                    <tr className="border-b border-surface-700/50">
                      <th className="px-3 py-2 text-left text-surface-400">Player</th>
                      <th className="px-3 py-2 text-center text-surface-400">Min</th>
                      <th className="px-3 py-2 text-center text-surface-400">G</th>
                      <th className="px-3 py-2 text-center text-surface-400">A</th>
                      <th className="px-3 py-2 text-center text-surface-400">CS</th>
                      <th className="px-3 py-2 text-center text-surface-400">PS</th>
                      <th className="px-3 py-2 text-center text-surface-400">YC</th>
                      <th className="px-3 py-2 text-center text-surface-400">RC</th>
                      <th className="px-3 py-2 text-center text-surface-400">OG</th>
                      <th className="px-3 py-2 text-center text-surface-400">PM</th>
                      <th className="px-3 py-2 text-center text-surface-400">GC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homePlayers.map((ps) => {
                      const i = playerStats.findIndex((p) => p.playerId === ps.playerId);
                      return (
                        <tr
                          key={ps.playerId}
                          onClick={() => handleQuickAction(i)}
                          className={`border-b border-surface-700/30 ${
                            activeAction ? "cursor-pointer hover:bg-lime-500/10" : ""
                          } ${ps.minutes > 0 ? "bg-surface-800/50" : ""}`}
                        >
                          <td className="px-3 py-2">
                            <p className="text-surface-200 font-medium">{ps.playerName}</p>
                            <p className="text-surface-500">{ps.position}</p>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} max={120} value={ps.minutes}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "minutes", parseInt(e.target.value) || 0)}
                              className="w-14 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.goals}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "goals", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.assists}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "assists", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={ps.cleanSheet}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "cleanSheet", e.target.checked)}
                              className="rounded border-surface-600" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.penaltySave}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "penaltySave", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.yellowCards}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "yellowCards", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.redCards}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "redCards", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.ownGoals}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "ownGoals", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.penaltyMiss}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "penaltyMiss", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.goalsConceded}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "goalsConceded", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Away Team */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
                {selectedMatch?.awayTeam.name} (Away)
              </h4>
              <div className="overflow-x-auto max-h-[250px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface-800">
                    <tr className="border-b border-surface-700/50">
                      <th className="px-3 py-2 text-left text-surface-400">Player</th>
                      <th className="px-3 py-2 text-center text-surface-400">Min</th>
                      <th className="px-3 py-2 text-center text-surface-400">G</th>
                      <th className="px-3 py-2 text-center text-surface-400">A</th>
                      <th className="px-3 py-2 text-center text-surface-400">CS</th>
                      <th className="px-3 py-2 text-center text-surface-400">PS</th>
                      <th className="px-3 py-2 text-center text-surface-400">YC</th>
                      <th className="px-3 py-2 text-center text-surface-400">RC</th>
                      <th className="px-3 py-2 text-center text-surface-400">OG</th>
                      <th className="px-3 py-2 text-center text-surface-400">PM</th>
                      <th className="px-3 py-2 text-center text-surface-400">GC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awayPlayers.map((ps) => {
                      const i = playerStats.findIndex((p) => p.playerId === ps.playerId);
                      return (
                        <tr
                          key={ps.playerId}
                          onClick={() => handleQuickAction(i)}
                          className={`border-b border-surface-700/30 ${
                            activeAction ? "cursor-pointer hover:bg-lime-500/10" : ""
                          } ${ps.minutes > 0 ? "bg-surface-800/50" : ""}`}
                        >
                          <td className="px-3 py-2">
                            <p className="text-surface-200 font-medium">{ps.playerName}</p>
                            <p className="text-surface-500">{ps.position}</p>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} max={120} value={ps.minutes}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "minutes", parseInt(e.target.value) || 0)}
                              className="w-14 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.goals}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "goals", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.assists}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "assists", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={ps.cleanSheet}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "cleanSheet", e.target.checked)}
                              className="rounded border-surface-600" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.penaltySave}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "penaltySave", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.yellowCards}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "yellowCards", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.redCards}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "redCards", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.ownGoals}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "ownGoals", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.penaltyMiss}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "penaltyMiss", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} value={ps.goalsConceded}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateStat(i, "goalsConceded", parseInt(e.target.value) || 0)}
                              className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-1 text-center text-surface-100" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {statsError && (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {statsError}
              </p>
            )}
            <p className="text-xs text-surface-500">
              Saving again replaces this gameweek&apos;s points. It does not add a second copy.
            </p>
            <ModalFooter>
              <Button variant="ghost" onClick={() => { setStatsModal(false); setActiveAction(null); setStatsError(""); }}>
                Cancel
              </Button>
              <Button onClick={saveStats} loading={saving}>
                Save Statistics
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}
