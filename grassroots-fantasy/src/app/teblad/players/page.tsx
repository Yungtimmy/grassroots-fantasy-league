"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFantasyPrice, fromStoredPrice, toStoredPrice } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  photo: string | null;
  position: string;
  price: number;
  status: string;
  totalPoints: number;
  realTeam: { id: string; name: string; shortName: string; logo: string | null };
}

interface Club {
  id: string;
  name: string;
  shortName: string;
}

const POSITIONS = [
  { label: "Goalkeeper (GK)", value: "GK" },
  { label: "Defender (DEF)", value: "DEF" },
  { label: "Midfielder (MID)", value: "MID" },
  { label: "Forward (FWD)", value: "FWD" },
];

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    position: "MID",
    realTeamId: "",
    price: 5,
    photo: "",
  });
  const [formError, setFormError] = useState("");

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterPosition) params.set("position", filterPosition);
      params.set("limit", "200");
      const res = await fetch(`/api/admin/players?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.data?.items ?? data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterPosition]);

  const fetchClubs = useCallback(async () => {
    const res = await fetch("/api/admin/teams");
    if (res.ok) {
      const data = await res.json();
      setClubs(data.data ?? []);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  function openCreate() {
    setEditItem(null);
    setForm({ name: "", position: "MID", realTeamId: "", price: 5, photo: "" });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(p: Player) {
    setEditItem(p);
    setForm({
      name: p.name,
      position: p.position,
      realTeamId: p.realTeam.id,
      price: fromStoredPrice(p.price),
      photo: p.photo ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.realTeamId) {
      setFormError("Name and club are required");
      return;
    }
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/players/${editItem.id}` : "/api/admin/players";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          position: form.position,
          realTeamId: form.realTeamId,
          price: toStoredPrice(form.price),
          photo: form.photo || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchPlayers();
      } else {
        setFormError(data.error || "Failed to save");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <p className="text-surface-400 mt-1">
            Add real players with club and price. Users pick them on the Squad page.
          </p>
        </div>
        <Button onClick={openCreate} disabled={clubs.length === 0}>
          Add Player
        </Button>
      </div>

      {clubs.length === 0 && !loading && (
        <p className="text-sm text-amber-400">Add clubs first, then you can add players.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            value={filterPosition}
            onChange={setFilterPosition}
            options={[{ label: "All Positions", value: "" }, ...POSITIONS]}
            placeholder="Position"
          />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : players.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">No players yet. Add them here.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Club
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Points
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3 font-medium text-surface-200">{p.name}</td>
                    <td className="px-6 py-3">
                      <Badge variant={p.position as "GK" | "DEF" | "MID" | "FWD"}>{p.position}</Badge>
                    </td>
                    <td className="px-6 py-3 text-surface-400">{p.realTeam?.shortName ?? "—"}</td>
                    <td className="px-6 py-3 text-surface-300 font-medium">{formatFantasyPrice(p.price)}</td>
                    <td className="px-6 py-3 text-surface-300">{p.totalPoints}</td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? "Edit Player" : "Add Player"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Erling Haaland"
            required
          />
          <Select
            label="Position"
            value={form.position}
            onChange={(v) => setForm({ ...form, position: v })}
            options={POSITIONS}
          />
          <Select
            label="Club"
            value={form.realTeamId}
            onChange={(v) => setForm({ ...form, realTeamId: v })}
            options={clubs.map((c) => ({ label: `${c.name} (${c.shortName})`, value: c.id }))}
            placeholder="Select club"
          />
          <Input
            label="Price (millions)"
            type="number"
            step="0.5"
            min="0.5"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            hint="Example: 12.5 for a 12.5m player. Squad budget is 100.0m."
          />
          <Input
            label="Photo URL"
            value={form.photo}
            onChange={(e) => setForm({ ...form, photo: e.target.value })}
            placeholder="https://..."
          />
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editItem ? "Save Changes" : "Add Player"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
