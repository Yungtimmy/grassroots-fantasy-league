"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Player {
  name: string;
  position: string;
  realTeam: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
  points: number;
}

interface SquadData {
  userName: string;
  username: string;
  university: string;
  teamName: string;
  formation: string;
  totalPoints: number;
  players: Player[];
}

export default function SharedSquadPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [data, setData] = useState<SquadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/squad/share/${userId}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError(d.error || "Squad not found");
      })
      .catch(() => setError("Failed to load squad"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C6FF33] border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">{error || "Squad not found"}</p>
          <Link href="/" className="text-sm text-[#C6FF33] hover:underline">Go to Grassroots Fantasy</Link>
        </div>
      </div>
    );
  }

  const starters = data.players.filter((p) => p.isStarting);
  const subs = data.players.filter((p) => !p.isStarting);

  function groupByPosition(players: Player[]) {
    const groups: Record<string, Player[]> = {};
    for (const p of players) {
      const pos = p.position === "SUB" ? "SUB" : p.position;
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(p);
    }
    return groups;
  }

  const starterGroups = groupByPosition(starters);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GFL" className="h-6 w-6 object-contain" />
            <span className="font-display text-sm font-bold text-white">Grassroots Fantasy</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* User Info */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#C6FF33]/20 text-[#C6FF33] text-xl font-bold">
            {data.userName.charAt(0)}
          </div>
          <h1 className="font-display text-xl font-bold text-white">{data.teamName}</h1>
          <p className="text-sm text-gray-400">
            {data.userName} {data.username && <span className="text-gray-600">@{data.username}</span>}
          </p>
          <div className="mt-2 flex items-center justify-center gap-3 text-xs text-gray-500">
            <span>{data.university}</span>
            <span className="h-1 w-1 rounded-full bg-gray-700" />
            <span>{data.formation}</span>
            <span className="h-1 w-1 rounded-full bg-gray-700" />
            <span className="text-[#C6FF33] font-semibold">{data.totalPoints} pts</span>
          </div>
        </div>

        {/* Pitch */}
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-green-900/30 to-green-950/20 p-4 overflow-hidden">
          {/* Pitch lines */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white" />
            <div className="absolute top-[15%] left-[20%] right-[20%] h-px bg-white" />
            <div className="absolute top-[85%] left-[20%] right-[20%] h-px bg-white" />
            <div className="absolute top-[30%] left-[30%] right-[30%] h-[40%] rounded border border-white" />
          </div>

          {/* Starting 11 */}
          {Object.entries(starterGroups).map(([pos, players]) => (
            <div key={pos} className="relative z-10 flex justify-center gap-3 mb-4">
              {players.map((p) => (
                <div key={p.name} className="flex flex-col items-center w-[68px]">
                  {p.isCaptain && (
                    <div className="mb-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[8px] font-bold text-black">
                      C
                    </div>
                  )}
                  {p.isViceCaptain && (
                    <div className="mb-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-[8px] font-bold text-black">
                      V
                    </div>
                  )}
                  <div className="relative h-10 w-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                    <img
                      src={`/${p.realTeam}.jpg`}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="relative z-10 text-sm font-bold text-white">{p.name.charAt(0)}</span>
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-white text-center leading-tight truncate w-full">
                    {p.name.split(" ").pop()}
                  </p>
                  <p className="text-[8px] text-gray-500">{p.realTeam}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Substitutes */}
        <div className="mt-4">
          <p className="mb-2 text-[10px] uppercase text-gray-500 font-medium">Substitutes</p>
          <div className="grid grid-cols-5 gap-2">
            {subs.map((p) => (
              <div key={p.name} className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 p-2">
                <div className="relative h-8 w-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                  <img
                    src={`/${p.realTeam}.jpg`}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="relative z-10 text-xs font-bold text-white">{p.name.charAt(0)}</span>
                </div>
                <p className="mt-1 text-[9px] font-medium text-white text-center leading-tight truncate w-full">
                  {p.name.split(" ").pop()}
                </p>
                <p className="text-[8px] text-gray-500">{p.realTeam}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/oauth/consent"
            className="inline-flex items-center gap-2 rounded-xl bg-[#C6FF33] px-6 py-3 text-sm font-bold text-black hover:bg-[#b3e62d] transition-colors"
          >
            Join Grassroots Fantasy
          </Link>
          <p className="mt-3 text-xs text-gray-600">Build your own squad and compete</p>
        </div>
      </div>
    </div>
  );
}
