"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";

interface Club {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  country: string;
  league: string;
  _count?: { players: number };
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Club | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    country: "England",
    league: "Premier League",
    logo: "",
  });
  const [formError, setFormError] = useState("");

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teams");
      if (res.ok) {
        const data = await res.json();
        setClubs(data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  function openCreate() {
    setEditItem(null);
    setForm({ name: "", shortName: "", country: "England", league: "Premier League", logo: "" });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(club: Club) {
    setEditItem(club);
    setForm({
      name: club.name,
      shortName: club.shortName,
      country: club.country,
      league: club.league,
      logo: club.logo ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.shortName) {
      setFormError("Name and short name are required");
      return;
    }
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/teams/${editItem.id}` : "/api/admin/teams";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logo: form.logo || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchClubs();
      } else {
        setFormError(data.error || "Failed to save");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(club: Club) {
    if (!confirm(`Delete ${club.name}?`)) return;
    const res = await fetch(`/api/admin/teams/${club.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || "Could not delete club");
      return;
    }
    fetchClubs();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clubs</h1>
          <p className="text-surface-400 mt-1">
            Add the real clubs players belong to. Fixtures are club vs club.
          </p>
        </div>
        <Button onClick={openCreate}>Add Club</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : clubs.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">
              No clubs yet. Add clubs here before creating players or fixtures.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Club
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Short
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    League
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Players
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((club) => (
                  <tr key={club.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3 font-medium text-surface-200">{club.name}</td>
                    <td className="px-6 py-3 text-surface-400">{club.shortName}</td>
                    <td className="px-6 py-3 text-surface-400">
                      {club.league}
                      {club.country ? ` · ${club.country}` : ""}
                    </td>
                    <td className="px-6 py-3 text-surface-300">{club._count?.players ?? 0}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(club)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(club)}>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? "Edit Club" : "Add Club"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Club name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Arsenal"
            required
          />
          <Input
            label="Short name"
            value={form.shortName}
            onChange={(e) => setForm({ ...form, shortName: e.target.value })}
            placeholder="ARS"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="League"
              value={form.league}
              onChange={(e) => setForm({ ...form, league: e.target.value })}
            />
            <Input
              label="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
          <Input
            label="Logo URL"
            value={form.logo}
            onChange={(e) => setForm({ ...form, logo: e.target.value })}
            placeholder="https://..."
          />
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editItem ? "Save Changes" : "Add Club"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
