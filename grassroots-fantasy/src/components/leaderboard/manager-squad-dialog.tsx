"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SQUAD_HIDDEN_MESSAGE, type RevealedSquadPlayer } from "@/lib/squad-reveal";

export type SquadManager = {
  userId: string;
  teamId: string;
  name: string;
  university: string;
};

type RevealedSquad = {
  teamName: string;
  formation: string;
  gameweekNumber: number | null;
  gameweekName: string | null;
  gameweekLabel: string | null;
  source: "snapshot" | "current";
  own: boolean;
  players: RevealedSquadPlayer[];
};

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "hidden"; message: string }
  | { status: "ready"; squad: RevealedSquad };

export function ManagerSquadDialog({
  manager,
  seasonId,
  onClose,
}: {
  manager: SquadManager | null;
  seasonId: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<LoadState>({ status: "idle" });

  useEffect(() => {
    if (!manager || !seasonId) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    const params = new URLSearchParams({ seasonId });
    if (manager.teamId) params.set("teamId", manager.teamId);

    fetch(`/api/leaderboard/squad/${manager.userId}?${params}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.success || !json.data) {
          setState({
            status: "hidden",
            message: typeof json?.error === "string" ? json.error : SQUAD_HIDDEN_MESSAGE,
          });
          return;
        }
        const data = json.data as RevealedSquad;
        setState({
          status: "ready",
          squad: { ...data, players: Array.isArray(data.players) ? data.players : [] },
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "hidden", message: "Could not load this squad." });
      });

    return () => {
      cancelled = true;
    };
  }, [manager, seasonId]);

  const starters = state.status === "ready" ? state.squad.players.filter((player) => player.isStarting) : [];
  const bench = state.status === "ready" ? state.squad.players.filter((player) => !player.isStarting) : [];
  const gameweekLabel =
    state.status === "ready"
      ? state.squad.gameweekLabel
        || (state.squad.gameweekNumber != null ? `Gameweek ${state.squad.gameweekNumber} squad` : null)
      : null;

  return (
    <Modal
      open={manager !== null}
      onClose={onClose}
      title={manager?.name ?? "Squad"}
      description={manager ? `${manager.university}${state.status === "ready" ? ` · ${state.squad.teamName}` : ""}` : undefined}
      size="lg"
    >
      {state.status === "loading" || state.status === "idle" ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : state.status === "hidden" ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-gray-300">
          {state.message}
        </p>
      ) : (
        <div>
          {gameweekLabel ? (
            <h2 className="mb-3 text-sm font-semibold text-white">{gameweekLabel}</h2>
          ) : null}
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-gray-400">
            <span>{state.squad.formation}</span>
            <span>{state.squad.source === "snapshot" ? "Locked lineup" : "Points"}</span>
          </div>
          {state.squad.players.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No players in this squad.</p>
          ) : (
            <div className="space-y-5">
              <PlayerGroup title="Starting XI" players={starters} />
              <PlayerGroup title="Bench" players={bench} />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function PlayerGroup({ title, players }: { title: string; players: RevealedSquadPlayer[] }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {players.length === 0 ? (
        <p className="text-sm text-gray-500">None</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {players.map((player) => (
            <li key={player.playerId} className="flex items-center gap-3 py-2">
              <span className="w-10 text-xs font-semibold text-gray-500">{player.position}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-white">
                {player.name}
                {player.isCaptain && <span className="ml-2 text-xs font-bold text-yellow-400">C</span>}
                {player.isViceCaptain && <span className="ml-2 text-xs font-bold text-gray-300">V</span>}
              </span>
              <span className="text-xs text-gray-500">{player.club}</span>
              <span className="min-w-8 shrink-0 text-right font-mono text-sm tabular-nums text-white">{player.points}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
