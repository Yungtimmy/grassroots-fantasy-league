"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";

interface League {
  id: string;
  name: string;
  description: string | null;
  entryFee: number | null;
  prizeInfo: string | null;
  rules: string | null;
  status: string;
  memberCount: number;
  university: { id: string; name: string; shortName: string };
  season: { id: string; name: string; status: string };
  createdAt: string;
}

interface UniversityOption {
  id: string;
  name: string;
  shortName: string;
}

interface SeasonOption {
  id: string;
  name: string;
  status: string;
}

export default function AdminLeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    universityId: "",
    seasonId: "",
    entryFee: "",
    prizeInfo: "",
    rules: "",
  });
  const [formError, setFormError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leaguesRes, unisRes, seasonsRes] = await Promise.all([
        fetch("/api/leagues"),
        fetch("/api/admin/universities"),
        fetch("/api/admin/seasons"),
      ]);
      if (leaguesRes.ok) {
        const data = await leaguesRes.json();
        setLeagues(data.data?.leagues ?? []);
      }
      if (unisRes.ok) {
        const data = await unisRes.json();
        setUniversities(data.data ?? []);
      }
      if (seasonsRes.ok) {
        const data = await seasonsRes.json();
        setSeasons(data.data ?? []);
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

  function openCreate() {
    setForm({ name: "", description: "", universityId: "", seasonId: "", entryFee: "", prizeInfo: "", rules: "" });
    setFormError("");
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.universityId || !form.seasonId) {
      setFormError("University and Season are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          description: form.description || undefined,
          universityId: form.universityId,
          seasonId: form.seasonId,
          entryFee: form.entryFee ? parseInt(form.entryFee) : undefined,
          prizeInfo: form.prizeInfo || undefined,
          rules: form.rules || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchData();
      } else {
        setFormError(data.error || "Failed to create league");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(league: League) {
    setSelectedLeague(league);
    setForm({
      name: league.name,
      description: league.description ?? "",
      universityId: league.university.id,
      seasonId: league.season.id,
      entryFee: league.entryFee?.toString() ?? "",
      prizeInfo: league.prizeInfo ?? "",
      rules: league.rules ?? "",
    });
    setFormError("");
    setEditModal(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLeague) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leagues/${selectedLeague.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || undefined,
          description: form.description || undefined,
          entryFee: form.entryFee ? parseInt(form.entryFee) : undefined,
          prizeInfo: form.prizeInfo || undefined,
          rules: form.rules || undefined,
          status: selectedLeague.status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditModal(false);
        fetchData();
      } else {
        setFormError(data.error || "Failed to update league");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function formatEntryFee(fee: number | null) {
    if (!fee) return "—";
    return `N${(fee / 100).toFixed(0)}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Leagues</h1>
          <p className="text-surface-400 mt-1">Create and manage competitions</p>
        </div>
        <Button onClick={openCreate}>+ Create League</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : leagues.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">No leagues yet. Create one to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">League Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Institution</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Season</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Entry Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Participants</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leagues.map((l) => (
                  <tr key={l.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3 font-medium text-surface-200">{l.name}</td>
                    <td className="px-6 py-3 text-surface-400">{l.university.shortName}</td>
                    <td className="px-6 py-3 text-surface-400">{l.season.name}</td>
                    <td className="px-6 py-3 text-surface-400">{formatEntryFee(l.entryFee)}</td>
                    <td className="px-6 py-3 text-surface-400">{l.memberCount}</td>
                    <td className="px-6 py-3">
                      <Badge variant={l.status === "open" ? "success" : "default"} dot>
                        {l.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
                          Edit
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

      {/* Create League Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create League" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="League Name (optional)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Collegiate Super League"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe this league..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="University"
              value={form.universityId}
              onChange={(v) => setForm({ ...form, universityId: v })}
              options={universities.map((u) => ({ label: u.name, value: u.id }))}
              placeholder="Select university"
            />
            <Select
              label="Season"
              value={form.seasonId}
              onChange={(v) => setForm({ ...form, seasonId: v })}
              options={seasons.map((s) => ({ label: s.name, value: s.id }))}
              placeholder="Select season"
            />
          </div>
          <Input
            label="Entry Fee (in kobo, e.g. 50000 = N500)"
            type="number"
            min={0}
            value={form.entryFee}
            onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
            placeholder="50000"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-300">Prize Information</label>
            <textarea
              value={form.prizeInfo}
              onChange={(e) => setForm({ ...form, prizeInfo: e.target.value })}
              placeholder="1st Place - N50,000&#10;2nd Place - N30,000&#10;3rd Place - N20,000"
              rows={3}
              className="w-full rounded-xl border border-surface-700/50 bg-surface-900/50 px-4 py-3 text-sm text-surface-200 placeholder-surface-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-300">League Rules</label>
            <textarea
              value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
              placeholder="1. Minimum 11 players per squad&#10;2. Budget: N100M&#10;3. No transfers after deadline"
              rows={3}
              className="w-full rounded-xl border border-surface-700/50 bg-surface-900/50 px-4 py-3 text-sm text-surface-200 placeholder-surface-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create League
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit League Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit League" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="League Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Entry Fee (in kobo)"
            type="number"
            min={0}
            value={form.entryFee}
            onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-300">Prize Information</label>
            <textarea
              value={form.prizeInfo}
              onChange={(e) => setForm({ ...form, prizeInfo: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-surface-700/50 bg-surface-900/50 px-4 py-3 text-sm text-surface-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-300">League Rules</label>
            <textarea
              value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-surface-700/50 bg-surface-900/50 px-4 py-3 text-sm text-surface-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
