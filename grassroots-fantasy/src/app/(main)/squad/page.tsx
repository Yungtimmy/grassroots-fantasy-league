"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { FANTASY_BUDGET, formatFantasyPrice, getPositionColor } from "@/lib/utils";

interface MarketPlayer {
  id: string;
  name: string;
  position: string;
  price: number;
  totalPoints: number;
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
    { label: "GK", items: slots.filter((s) => s.position === "GK") },
    { label: "DEF", items: slots.filter((s) => s.position === "DEF") },
    { label: "MID", items: slots.filter((s) => s.position === "MID") },
    { label: "FWD", items: slots.filter((s) => s.position === "FWD") },
  ];
  return rows.filter((r) => r.items.length > 0);
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeSlot, setActiveSlot] = useState<{ area: "start" | "sub"; index: number } | null>(null);

  const squad = useMemo(() => [...starters, ...subs], [starters, subs]);
  const usedBudget = squad.reduce((sum, s) => sum + (s.player?.price ?? 0), 0);
  const remaining = FANTASY_BUDGET - usedBudget;
  const selectedIds = new Set(squad.filter((s) => s.player).map((s) => s.player!.id));

  function changeFormation(nextFormation: string) {
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
              realTeam: tp.player.realTeam,
            },
            isCaptain: tp.isCaptain,
            isViceCaptain: tp.isViceCaptain,
          };
        });

        setStarters(startingSlots);
        setSubs(subSlots);
      })
      .catch(() => undefined);
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

  function setCaptain(index: number) {
    setStarters((prev) =>
      prev.map((s, i) => ({
        ...s,
        isCaptain: i === index,
        isViceCaptain: i === index ? false : s.isViceCaptain,
      }))
    );
    setSubs((prev) => prev.map((s) => ({ ...s, isCaptain: false })));
  }

  function setVice(index: number, area: "start" | "sub") {
    setStarters((prev) =>
      prev.map((s, i) => ({
        ...s,
        isViceCaptain: area === "start" && i === index,
        isCaptain: area === "start" && i === index ? false : s.isCaptain,
      }))
    );
    setSubs((prev) =>
      prev.map((s, i) => ({
        ...s,
        isViceCaptain: area === "sub" && i === index,
        isCaptain: false,
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
      const method = "POST";
      const res = await fetch("/api/teams", {
        method,
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

  function SlotCard({
    slot,
    area,
    index,
  }: {
    slot: Slot;
    area: "start" | "sub";
    index: number;
  }) {
    const selected = activeSlot?.area === area && activeSlot.index === index;
    return (
      <button
        type="button"
        onClick={() => setActiveSlot(selected ? null : { area, index })}
        className={`relative w-[92px] rounded-xl border px-2 py-2 text-center transition-colors ${
          selected
            ? "border-brand-400 bg-brand-500/20"
            : slot.player
              ? "border-surface-600 bg-surface-900/80"
              : "border-dashed border-surface-600 bg-surface-900/40"
        }`}
      >
        <div className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${getPositionColor(slot.player?.position || slot.position)}`}>
          {slot.player ? slot.player.name.charAt(0) : slot.position === "SUB" ? "+" : slot.position}
        </div>
        <p className="truncate text-[11px] font-medium text-surface-100">
          {slot.player ? slot.player.name.split(" ").slice(-1)[0] : "Empty"}
        </p>
        <p className="text-[10px] text-surface-500">
          {slot.player ? formatFantasyPrice(slot.player.price) : slot.position}
        </p>
        {slot.player && (
          <div className="mt-1 flex justify-center gap-1">
            {area === "start" && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setCaptain(index);
                }}
                className={`rounded px-1 text-[9px] font-bold ${slot.isCaptain ? "bg-yellow-400 text-black" : "bg-surface-700 text-surface-400"}`}
              >
                C
              </span>
            )}
            <span
              onClick={(e) => {
                e.stopPropagation();
                setVice(index, area);
              }}
              className={`rounded px-1 text-[9px] font-bold ${slot.isViceCaptain ? "bg-sky-400 text-black" : "bg-surface-700 text-surface-400"}`}
            >
              V
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                removeFrom(area, index);
              }}
              className="rounded bg-surface-700 px-1 text-[9px] text-red-400"
            >
              ×
            </span>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Squad</h1>
          <p className="mt-1 text-surface-400">Pick 11 starters and 5 substitutes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={formation}
            onChange={(e) => changeFormation(e.target.value)}
            className="h-10 rounded-lg border border-surface-600 bg-surface-900 px-3 text-sm"
          >
            {Object.keys(FORMATIONS).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <button
            onClick={saveSquad}
            disabled={saving}
            className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save squad"}
          </button>
        </div>
      </div>

      {/* Budget bar */}
      <div className="rounded-xl border border-surface-700 bg-surface-900 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-surface-400">Budget</span>
          <span className={remaining < 0 ? "font-bold text-red-400" : "font-bold text-brand-400"}>
            {formatFantasyPrice(remaining)} remaining
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface-700">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              remaining < 0
                ? "bg-red-500"
                : remaining < 100
                  ? "bg-yellow-400"
                  : "bg-brand-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, (usedBudget / FANTASY_BUDGET) * 100))}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-surface-500">
          <span>Spent: {formatFantasyPrice(usedBudget)}</span>
          <span>Budget: 100.0m</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm text-brand-400">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div
            className="relative rounded-3xl border border-pitch-700/40 bg-surface-950 p-6 bg-cover bg-center"
            style={{ backgroundImage: "url('/pitch.jpg'), linear-gradient(to bottom, #0a3d0a, #062006)" }}
          >
            <div className="absolute inset-0 rounded-3xl bg-black/30" />
            <div className="relative">
              <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-pitch-300">
                Starting 11 · {formation}
              </p>
            <div className="space-y-5">
              {groupStarting(starters).map((row) => (
                <div key={row.label} className="flex flex-wrap justify-center gap-3">
                  {row.items.map((slot) => {
                    const index = starters.indexOf(slot);
                    return <SlotCard key={`s-${index}`} slot={slot} area="start" index={index} />;
                  })}
                </div>
              ))}
            </div>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-800 bg-surface-900 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-surface-400">
              Substitutes (5)
            </p>
            <div className="flex flex-wrap gap-3">
              {subs.map((slot, i) => (
                <SlotCard key={`b-${i}`} slot={slot} area="sub" index={i} />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-surface-800 bg-surface-900 p-4">
          <h2 className="mb-3 font-semibold">Player market</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name..."
            className="mb-3 h-10 w-full rounded-lg border border-surface-700 bg-surface-950 px-3 text-sm"
          />
          <div className="mb-3 flex flex-wrap gap-1">
            {["ALL", "GK", "DEF", "MID", "FWD"].map((p) => (
              <button
                key={p}
                onClick={() => setPosFilter(p)}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  posFilter === p ? "bg-brand-500 text-white" : "bg-surface-800 text-surface-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
            {marketLoading ? (
              <p className="py-8 text-center text-sm text-surface-500">Loading players...</p>
            ) : market.length === 0 ? (
              <p className="py-8 text-center text-sm text-surface-500">
                No players yet. An admin needs to add clubs and players first.
              </p>
            ) : (
              market.map((player) => {
                const taken = selectedIds.has(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={taken}
                    onClick={() => placePlayer(player)}
                    className="flex w-full items-center gap-3 rounded-xl border border-surface-800 bg-surface-950 px-3 py-2 text-left hover:border-brand-500/40 disabled:opacity-40"
                  >
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${getPositionColor(player.position)}`}>
                      {player.position}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{player.name}</span>
                      <span className="block text-xs text-surface-500">{player.realTeam.shortName}</span>
                    </span>
                    <span className="text-sm font-semibold text-brand-400">{formatFantasyPrice(player.price)}</span>
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
