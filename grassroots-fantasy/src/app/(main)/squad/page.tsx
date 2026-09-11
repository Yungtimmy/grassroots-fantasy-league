"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layout/auth-provider";
import { FANTASY_BUDGET, formatFantasyPrice, getPositionColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MarketPlayer {
  id: string;
  name: string;
  position: string;
  price: number;
  totalPoints: number;
  photo?: string | null;
  realTeam: { id: string; name: string; shortName: string };
}

interface Slot {
  player: MarketPlayer | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
  position: string;
}

const FORMATIONS: Record<string, string[]> = {
  "4-4-2": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD"],
  "4-3-3": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"],
  "3-5-2": ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD"],
  "3-4-3": ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD"],
  "5-3-2": ["GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD"],
  "5-4-1": ["GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD"],
  "4-5-1": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD"],
  "4-2-3-1": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD"],
};

const SUB_COUNT = 5;

function emptyStarting(formation: string): Slot[] {
  return (FORMATIONS[formation] || FORMATIONS["4-4-2"]).map((position) => ({
    player: null,
    isCaptain: false,
    isViceCaptain: false,
    isStarting: true,
    position,
  }));
}

function emptySubs(): Slot[] {
  return Array.from({ length: SUB_COUNT }, () => ({
    player: null,
    isCaptain: false,
    isViceCaptain: false,
    isStarting: false,
    position: "SUB",
  }));
}

function groupStarting(slots: Slot[]) {
  const rows: { label: string; items: Slot[] }[] = [
    { label: "FWD", items: slots.filter((s) => s.position === "FWD") },
    { label: "MID", items: slots.filter((s) => s.position === "MID") },
    { label: "DEF", items: slots.filter((s) => s.position === "DEF") },
    { label: "GK", items: slots.filter((s) => s.position === "GK") },
  ];
  return rows.filter((r) => r.items.length > 0);
}

function PlayerAvatar({ player, size = "md" }: { player: MarketPlayer | null; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
  };

  if (!player) {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-surface-200 dark:bg-surface-700`}>
        <svg className="h-1/2 w-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-brand-500/20 font-bold text-brand-600 dark:text-brand-400`}>
      {player.name.charAt(0)}
    </div>
  );
}

export default function SquadPage() {
  const { user } = useAuth();
  const [formation, setFormation] = useState("4-4-2");
  const [starters, setStarters] = useState<Slot[]>(() => emptyStarting("4-4-2"));
  const [subs, setSubs] = useState<Slot[]>(() => emptySubs());
  const [market, setMarket] = useState<MarketPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [marketLoading, setMarketLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamLoading, setTeamLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeSlot, setActiveSlot] = useState<{ area: "start" | "sub"; index: number } | null>(null);
  const [gameweekLocked, setGameweekLocked] = useState(false);
  const [activeGwNumber, setActiveGwNumber] = useState<number | null>(null);

  const squad = useMemo(() => [...starters, ...subs], [starters, subs]);
  const usedBudget = squad.reduce((sum, s) => sum + (s.player?.price ?? 0), 0);
  const remaining = FANTASY_BUDGET - usedBudget;
  const selectedIds = new Set(squad.filter((s) => s.player).map((s) => s.player!.id));
  const playerCount = squad.filter((s) => s.player).length;

  function changeFormation(nextFormation: string) {
    if (gameweekLocked) return;
    const next = emptyStarting(nextFormation);
    const pool = starters.filter((s) => s.player).map((s) => s.player!);
    for (const slot of next) {
      const idx = pool.findIndex((p) => p.position === slot.position);
      if (idx >= 0) slot.player = pool.splice(idx, 1)[0];
    }
    const leftover = pool;
    const nextSubs = emptySubs();
    const fill = [...leftover, ...subs.filter((s) => s.player).map((s) => s.player!)];
    for (const slot of nextSubs) {
      if (fill.length === 0) break;
      slot.player = fill.shift()!;
    }
    setFormation(nextFormation);
    setStarters(next);
    setSubs(nextSubs);
  }

  function clearAll() {
    if (gameweekLocked) return;
    setStarters(emptyStarting(formation));
    setSubs(emptySubs());
    setError("");
    setSuccess("");
  }

  useEffect(() => {
    if (!user) return;
    fetch("/api/user/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (data.nextGameweek?.status === "active") {
          setGameweekLocked(true);
          setActiveGwNumber(data.nextGameweek.number);
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => {
        const team = data.data;
        if (!team?.players?.length) return;
        if (team.formation) setFormation(team.formation);
        const startingSlots = emptyStarting(team.formation || "4-4-2");
        const subSlots = emptySubs();
        const startingPlayers = team.players.filter((p: { isStarting: boolean }) => p.isStarting);
        const benchPlayers = team.players.filter((p: { isStarting: boolean }) => !p.isStarting);

        for (const tp of startingPlayers) {
          const player: MarketPlayer = {
            id: tp.player.id,
            name: tp.player.name,
            position: tp.player.position,
            price: tp.player.price,
            totalPoints: tp.player.totalPoints,
            photo: tp.player.photo,
            realTeam: tp.player.realTeam,
          };
          const idx = startingSlots.findIndex((s) => s.position === player.position && !s.player);
          if (idx >= 0) {
            startingSlots[idx] = {
              ...startingSlots[idx],
              player,
              isCaptain: tp.isCaptain,
              isViceCaptain: tp.isViceCaptain,
            };
          }
        }

        benchPlayers.forEach((tp: { player: MarketPlayer; isCaptain: boolean; isViceCaptain: boolean }, i: number) => {
          if (i >= subSlots.length) return;
          subSlots[i] = {
            ...subSlots[i],
            player: {
              id: tp.player.id,
              name: tp.player.name,
              position: tp.player.position,
              price: tp.player.price,
              totalPoints: tp.player.totalPoints,
              photo: tp.player.photo,
              realTeam: tp.player.realTeam,
            },
            isCaptain: tp.isCaptain,
            isViceCaptain: tp.isViceCaptain,
          };
        });

        setStarters(startingSlots);
        setSubs(subSlots);
      })
      .catch(() => undefined)
      .finally(() => setTeamLoading(false));
  }, [user]);

  const fetchMarket = useCallback(async () => {
    setMarketLoading(true);
    const params = new URLSearchParams({ sort: "points", limit: "80" });
    if (posFilter !== "ALL") params.set("position", posFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/players?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMarket(data.data?.items ?? []);
    }
    setMarketLoading(false);
  }, [posFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchMarket, 250);
    return () => clearTimeout(t);
  }, [fetchMarket]);

  function placePlayer(player: MarketPlayer) {
    if (gameweekLocked) return;
    if (selectedIds.has(player.id)) return;
    if (remaining < player.price) {
      setError("Not enough budget for this player.");
      return;
    }
    setError("");

    if (activeSlot) {
      const list = activeSlot.area === "start" ? [...starters] : [...subs];
      const slot = list[activeSlot.index];
      if (slot.isStarting && slot.position !== player.position) {
        setError(`This slot needs a ${slot.position}.`);
        return;
      }
      list[activeSlot.index] = { ...slot, player, isCaptain: false, isViceCaptain: false };
      if (activeSlot.area === "start") setStarters(list);
      else setSubs(list);
      setActiveSlot(null);
      return;
    }

    const startIdx = starters.findIndex((s) => !s.player && s.position === player.position);
    if (startIdx >= 0) {
      const next = [...starters];
      next[startIdx] = { ...next[startIdx], player };
      setStarters(next);
      return;
    }
    const subIdx = subs.findIndex((s) => !s.player);
    if (subIdx >= 0) {
      const next = [...subs];
      next[subIdx] = { ...next[subIdx], player };
      setSubs(next);
      return;
    }
    setError("No empty slot for this player. Remove someone first.");
  }

  function removeFrom(area: "start" | "sub", index: number) {
    if (gameweekLocked) return;
    if (area === "start") {
      const next = [...starters];
      next[index] = { ...next[index], player: null, isCaptain: false, isViceCaptain: false };
      setStarters(next);
    } else {
      const next = [...subs];
      next[index] = { ...next[index], player: null, isCaptain: false, isViceCaptain: false };
      setSubs(next);
    }
  }

  function setCaptain(area: "start" | "sub", index: number) {
    if (gameweekLocked) return;
    if (area === "sub") return;
    setStarters((prev) =>
      prev.map((s, i) => ({
        ...s,
        isCaptain: i === index,
        isViceCaptain: i === index ? false : s.isViceCaptain,
      }))
    );
  }

  function setVice(area: "start" | "sub", index: number) {
    if (gameweekLocked) return;
    if (area === "sub") return;
    setStarters((prev) =>
      prev.map((s, i) => ({
        ...s,
        isViceCaptain: i === index,
        isCaptain: i === index ? false : s.isCaptain,
      }))
    );
  }

  async function saveSquad() {
    const filled = squad.filter((s) => s.player);
    if (filled.length !== 16) {
      setError("Pick a starting 11 and 5 substitutes.");
      return;
    }
    if (!starters.some((s) => s.isCaptain && s.player)) {
      setError("Choose a captain from your starting 11.");
      return;
    }
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation,
          players: filled.map((s) => ({
            playerId: s.player!.id,
            isCaptain: s.isCaptain,
            isViceCaptain: s.isViceCaptain,
            isStarting: s.isStarting,
          })),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Could not save squad");
      } else {
        setSuccess("Squad saved.");
      }
    } catch {
      setError("Could not save squad");
    } finally {
      setSaving(false);
    }
  }

  if (teamLoading) {
    return (
      <div className="min-h-screen bg-black px-4 py-4">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-8 w-24 rounded bg-white/10 animate-pulse" />
            <div className="h-8 w-24 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 flex-1 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-10 w-16 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-10 w-20 rounded-xl bg-white/10 animate-pulse" />
          </div>
          <div className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
          <div className="grid grid-cols-5 gap-2">
            {[1,2,3,4,5].map(i => <div key={i} className="aspect-square rounded bg-white/5 animate-pulse" />)}
          </div>
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
              My Team
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Gameweek Locked Banner */}
        {gameweekLocked && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-400">Squad Locked</p>
                <p className="text-xs text-red-400/70">Gameweek {activeGwNumber} is active. You can edit your squad after it finishes.</p>
              </div>
            </div>
          </div>
        )}

        {/* Budget & Controls */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase text-surface-500">Budget</p>
            <p className="font-display text-lg font-bold text-surface-900 dark:text-white">
              {formatFantasyPrice(remaining)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-surface-500">Remaining</p>
            <p className="font-display text-lg font-bold text-brand-500">
              {formatFantasyPrice(remaining)}
            </p>
          </div>
        </div>

        {/* Formation & Actions */}
        <div className="mb-4 flex items-center gap-2">
          <select
            value={formation}
            onChange={(e) => changeFormation(e.target.value)}
            disabled={gameweekLocked}
            className="flex-1 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2.5 text-sm text-surface-900 dark:text-white disabled:opacity-50"
          >
            {Object.keys(FORMATIONS).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={clearAll} disabled={gameweekLocked}>
            Clear
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={saveSquad} disabled={gameweekLocked}>
            {gameweekLocked ? "Locked" : "Save Team"}
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 px-4 py-3 text-sm text-brand-600 dark:text-brand-400">
            {success}
          </div>
        )}

        {/* Pitch */}
        <div
          className="relative rounded-2xl border border-surface-200 dark:border-surface-700/40 bg-green-600 p-4 bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: "url('/pitch.jpg'), linear-gradient(to bottom, #16a34a, #15803c)" }}
        >
          <div className="absolute inset-0 bg-green-600/80" />
          <div className="relative">
            <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-widest text-white/80">
              Starting 11 · {formation}
            </p>
            <div className="space-y-4">
              {groupStarting(starters).map((row) => (
                <div key={row.label} className="flex justify-center gap-2">
                  {row.items.map((slot) => {
                    const index = starters.indexOf(slot);
                    return (
                      <PlayerSlot
                        key={`s-${index}`}
                        slot={slot}
                        area="start"
                        index={index}
                        active={activeSlot?.area === "start" && activeSlot.index === index}
                        onSelect={() => setActiveSlot(activeSlot?.area === "start" && activeSlot.index === index ? null : { area: "start", index })}
                        onCaptain={() => setCaptain("start", index)}
                        onVice={() => setVice("start", index)}
                        onRemove={() => removeFrom("start", index)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Substitutes */}
        <div className="mt-4 rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-surface-500">
              Substitutes · {subs.filter((s) => s.player).length}/5
            </p>
            <p className="text-xs text-surface-400">Bench</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {subs.map((slot, i) => (
              <PlayerSlot
                key={`b-${i}`}
                slot={slot}
                area="sub"
                index={i}
                active={activeSlot?.area === "sub" && activeSlot.index === i}
                onSelect={() => setActiveSlot(activeSlot?.area === "sub" && activeSlot.index === i ? null : { area: "sub", index: i })}
                onCaptain={() => {}}
                onVice={() => {}}
                onRemove={() => removeFrom("sub", i)}
                compact
              />
            ))}
          </div>
        </div>

        {/* Player Market */}
        <div className="mt-4 rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-4">
          <h2 className="mb-3 font-display text-sm font-semibold text-surface-900 dark:text-white">
            Player Market
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players..."
            className="mb-3 w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 px-4 py-2.5 text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:border-brand-500 focus:outline-none"
          />
          <div className="mb-3 flex gap-1.5">
            {["ALL", "GK", "DEF", "MID", "FWD"].map((p) => (
              <button
                key={p}
                onClick={() => setPosFilter(p)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  posFilter === p
                    ? "bg-brand-500 text-white"
                    : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
            {marketLoading ? (
              <p className="py-8 text-center text-sm text-surface-400">Loading players...</p>
            ) : market.length === 0 ? (
              <p className="py-8 text-center text-sm text-surface-400">No players found.</p>
            ) : (
              market.map((player) => {
                const taken = selectedIds.has(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={taken}
                    onClick={() => placePlayer(player)}
                    className="flex w-full items-center gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 px-3 py-2.5 text-left transition-colors hover:border-brand-500/30 disabled:opacity-40"
                  >
                    <PlayerAvatar player={player} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-surface-900 dark:text-white">{player.name}</p>
                      <p className="text-[10px] text-surface-500">{player.realTeam.shortName}</p>
                    </div>
                    <Badge variant={player.position as any} className="text-[10px]">{player.position}</Badge>
                    <span className="text-xs font-semibold text-brand-500">{formatFantasyPrice(player.price)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerSlot({
  slot,
  area,
  index,
  active,
  onSelect,
  onCaptain,
  onVice,
  onRemove,
  compact = false,
}: {
  slot: Slot;
  area: "start" | "sub";
  index: number;
  active: boolean;
  onSelect: () => void;
  onCaptain: () => void;
  onVice: () => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative flex flex-col items-center rounded-xl border p-2 transition-all cursor-pointer ${
        active
          ? "border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/10"
          : slot.player
            ? "border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800/80"
            : "border-dashed border-surface-300 dark:border-surface-600 bg-surface-100 dark:bg-surface-800/40"
      } ${compact ? "w-[60px]" : "w-[72px]"}`}
    >
      {slot.isCaptain && (
        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[8px] font-bold text-black z-10">
          C
        </div>
      )}
      {slot.isViceCaptain && (
        <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-[8px] font-bold text-black z-10">
          V
        </div>
      )}

      <div className={`flex items-center justify-center rounded-full ${compact ? "h-8 w-8" : "h-10 w-10"} ${
        slot.player
          ? "bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold"
          : "bg-surface-200 dark:bg-surface-700 text-surface-400"
      }`}>
        {slot.player ? (
          <span className={compact ? "text-xs" : "text-sm"}>{slot.player.name.charAt(0)}</span>
        ) : (
          <svg className={compact ? "h-3 w-3" : "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )}
      </div>

      <p className={`mt-1 truncate text-center font-medium text-surface-900 dark:text-white ${compact ? "w-full text-[9px]" : "text-[10px]"}`}>
        {slot.player ? slot.player.name.split(" ").pop() : slot.position === "SUB" ? "Bench" : slot.position}
      </p>

      {slot.player && (
        <p className={`text-surface-500 ${compact ? "text-[8px]" : "text-[9px]"}`}>
          {formatFantasyPrice(slot.player.price)}
        </p>
      )}

      {active && slot.player && (
        <div className="mt-1 flex gap-0.5">
          {area === "start" && !slot.isCaptain && (
            <button
              onClick={(e) => { e.stopPropagation(); onCaptain(); }}
              className="rounded bg-yellow-400 px-1 py-0.5 text-[8px] font-bold text-black"
            >
              C
            </button>
          )}
          {area === "start" && !slot.isViceCaptain && (
            <button
              onClick={(e) => { e.stopPropagation(); onVice(); }}
              className="rounded bg-sky-400 px-1 py-0.5 text-[8px] font-bold text-black"
            >
              V
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="rounded bg-red-500 px-1 py-0.5 text-[8px] font-bold text-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
