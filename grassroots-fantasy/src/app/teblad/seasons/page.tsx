"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";

interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
  registrationFee: number;
  status: string;
  _count?: { leagues: number; gameweeks: number; matches: number };
}

const STATUS_FLOW: Record<string, string> = {
  upcoming: "active",
  active: "completed",
};

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Season | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
    registrationStart: "",
    registrationEnd: "",
    registrationFee: 500,
  });
  const [formError, setFormError] = useState("");

  const fetchSeasons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seasons");
      if (res.ok) {
        const data = await res.json();
        setSeasons(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  function openCreate() {
    setEditItem(null);
    setForm({
      name: "",
      year: new Date().getFullYear(),
      startDate: "",
      endDate: "",
      registrationStart: "",
      registrationEnd: "",
      registrationFee: 500,
    });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(s: Season) {
    setEditItem(s);
    setForm({
      name: s.name,
      year: s.year,
      startDate: s.startDate.split("T")[0],
      endDate: s.endDate.split("T")[0],
      registrationStart: s.registrationStart.split("T")[0],
      registrationEnd: s.registrationEnd.split("T")[0],
      registrationFee: s.registrationFee,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.startDate || !form.endDate || !form.registrationStart || !form.registrationEnd) {
      setFormError("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/seasons/${editItem.id}` : "/api/admin/seasons";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchSeasons();
      } else {
        setFormError(data.error || "Failed to save");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function advanceStatus(season: Season) {
    const next = STATUS_FLOW[season.status];
    if (!next) return;
    try {
      await fetch(`/api/admin/seasons/${season.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      fetchSeasons();
    } catch {
      // silent
    }
  }

  async function toggleRegistration(season: Season) {
    const isOpen = new Date() >= new Date(season.registrationStart) && new Date() <= new Date(season.registrationEnd);
    const newEnd = isOpen ? new Date().toISOString() : season.registrationEnd;
    try {
      await fetch(`/api/admin/seasons/${season.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationEnd: newEnd }),
      });
      fetchSeasons();
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Seasons</h1>
          <p className="text-surface-400 mt-1">Manage competition seasons</p>
        </div>
        <Button onClick={openCreate}>Create Season</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : seasons.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">No seasons found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Registration</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((s) => (
                  <tr key={s.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3 font-medium text-surface-200">{s.name}</td>
                    <td className="px-6 py-3 text-surface-400">{s.year}</td>
                    <td className="px-6 py-3 text-surface-400">
                      {formatDate(s.startDate)} — {formatDate(s.endDate)}
                    </td>
                    <td className="px-6 py-3 text-surface-400">
                      {formatDate(s.registrationStart)} — {formatDate(s.registrationEnd)}
                    </td>
                    <td className="px-6 py-3 text-surface-300">₦{s.registrationFee}</td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          s.status === "active" ? "active" : s.status === "completed" ? "success" : "info"
                        }
                        dot
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          Edit
                        </Button>
                        {STATUS_FLOW[s.status] && (
                          <Button variant="secondary" size="sm" onClick={() => advanceStatus(s)}>
                            → {STATUS_FLOW[s.status]}
                          </Button>
                        )}
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
        title={editItem ? "Edit Season" : "Create Season"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Season 1"
            required
          />
          <Input
            label="Year"
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Registration Start"
              type="date"
              value={form.registrationStart}
              onChange={(e) => setForm({ ...form, registrationStart: e.target.value })}
              required
            />
            <Input
              label="Registration End"
              type="date"
              value={form.registrationEnd}
              onChange={(e) => setForm({ ...form, registrationEnd: e.target.value })}
              required
            />
          </div>
          <Input
            label="Registration Fee (₦)"
            type="number"
            value={form.registrationFee}
            onChange={(e) => setForm({ ...form, registrationFee: parseInt(e.target.value) })}
          />
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editItem ? "Save Changes" : "Create Season"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
