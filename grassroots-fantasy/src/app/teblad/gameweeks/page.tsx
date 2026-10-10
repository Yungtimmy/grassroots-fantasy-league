"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  finishWarningMessage,
  fixturesNeedingFinishWarning,
  type FinishWarningFixture,
} from "@/lib/fixture-admin";
import { cn, formatDate } from "@/lib/utils";

interface Gameweek {
  id: string;
  seasonId: string;
  number: number;
  name: string;
  deadline: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface SeasonOption {
  id: string;
  name: string;
  year: number;
}

const STATUS_FLOW: Record<string, string> = {
  upcoming: "active",
  active: "finished",
};

interface FreezeSlot {
  teamId: string;
  playerId: string;
  teamName: string;
  userName: string;
  playerName: string;
  position: string;
  isStarting: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

interface FreezePlan {
  ok: boolean;
  frozen: boolean;
  reasons: string[];
  unverified: string[];
  gameweek: { name: string; number: number; seasonName: string; status: string; deadline: string } | null;
  slots: FreezeSlot[];
}

export default function GameweeksPage() {
  const [gameweeks, setGameweeks] = useState<Gameweek[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Gameweek | null>(null);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState<string | null>(null);
  const [form, setForm] = useState({
    seasonId: "",
    number: 1,
    name: "",
    deadline: "",
    deadlineTime: "23:59",
    startDate: "",
    startTime: "00:00",
    endDate: "",
    endTime: "23:59",
  });
  const [formError, setFormError] = useState("");
  const [freezeGw, setFreezeGw] = useState<Gameweek | null>(null);
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [freezeError, setFreezeError] = useState("");
  const [freezePlan, setFreezePlan] = useState<FreezePlan | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gwRes, sRes] = await Promise.all([
        fetch("/api/admin/gameweeks"),
        fetch("/api/admin/seasons"),
      ]);
      if (gwRes.ok) {
        const data = await gwRes.json();
        setGameweeks(data.data ?? []);
      }
      if (sRes.ok) {
        const data = await sRes.json();
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
    setEditItem(null);
    setForm({ seasonId: "", number: 1, name: "", deadline: "", deadlineTime: "23:59", startDate: "", startTime: "00:00", endDate: "", endTime: "23:59" });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(gw: Gameweek) {
    setEditItem(gw);
    const d = new Date(gw.deadline);
    const s = new Date(gw.startDate);
    const e = new Date(gw.endDate);
    const fmt = (dt: Date) => `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    setForm({
      seasonId: gw.seasonId,
      number: gw.number,
      name: gw.name,
      deadline: gw.deadline.split("T")[0],
      deadlineTime: fmt(d),
      startDate: gw.startDate.split("T")[0],
      startTime: fmt(s),
      endDate: gw.endDate.split("T")[0],
      endTime: fmt(e),
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.seasonId || !form.name || !form.deadline || !form.startDate || !form.endDate) {
      setFormError("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/gameweeks/${editItem.id}` : "/api/admin/gameweeks";
      const method = editItem ? "PUT" : "POST";
      const body = {
        ...form,
        deadline: `${form.deadline}T${form.deadlineTime}`,
        startDate: `${form.startDate}T${form.startTime}`,
        endDate: `${form.endDate}T${form.endTime}`,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchData();
      } else {
        setFormError(data.error || "Failed to save");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function advanceStatus(gw: Gameweek) {
    const next = STATUS_FLOW[gw.status];
    if (!next) return;
    if (next === "finished") {
      let warning: string | null = null;
      try {
        const res = await fetch("/api/admin/matches");
        const data = await res.json();
        if (!res.ok || data.success === false) {
          warning = `Could not check ${gw.name} for fixtures without stats. Finish this gameweek anyway?`;
        } else {
          const rows = (data.data ?? []) as Array<{
            gameweekId?: string;
            status?: string;
            statCount?: number;
            homeTeam?: { shortName?: string };
            awayTeam?: { shortName?: string };
          }>;
          const fixtures: FinishWarningFixture[] = rows
            .filter((match) => match.gameweekId === gw.id)
            .map((match) => ({
              status: match.status ?? "upcoming",
              statCount: match.statCount ?? 0,
              label: `${match.homeTeam?.shortName ?? "Home"} vs ${match.awayTeam?.shortName ?? "Away"}`,
            }));
          warning = finishWarningMessage(gw.name, fixturesNeedingFinishWarning(fixtures));
        }
      } catch {
        warning = `Could not check ${gw.name} for fixtures without stats. Finish this gameweek anyway?`;
      }
      if (warning && !window.confirm(warning)) return;
    }
    try {
      await fetch(`/api/admin/gameweeks/${gw.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      fetchData();
    } catch {
      // silent
    }
  }

  async function openFreeze(gw: Gameweek) {
    setFreezeGw(gw);
    setFreezePlan(null);
    setFreezeError("");
    setFreezeLoading(true);
    try {
      const res = await fetch(`/api/admin/gameweeks/${gw.id}/freeze-lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: false }),
      });
      const data = await res.json();
      if (!data.success) {
        setFreezeError(data.error || "Could not preview the freeze");
        return;
      }
      setFreezePlan(data.data);
    } catch {
      setFreezeError("Network error");
    } finally {
      setFreezeLoading(false);
    }
  }

  async function confirmFreeze() {
    if (!freezeGw || !freezePlan?.ok) return;
    setFreezeLoading(true);
    setFreezeError("");
    try {
      const res = await fetch(`/api/admin/gameweeks/${freezeGw.id}/freeze-lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!data.success) {
        setFreezeError(data.error || "Could not freeze squads");
        return;
      }
      setFreezePlan(data.data);
      if (data.data.frozen) fetchData();
    } catch {
      setFreezeError("Network error");
    } finally {
      setFreezeLoading(false);
    }
  }

  async function applyScoring(gw: Gameweek) {
    setScoring(gw.id);
    try {
      const res = await fetch("/api/admin/scoring/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameweekId: gw.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Scoring applied! Processed ${data.data.processedStats} stat entries.`);
      } else {
        alert(data.error || "Failed to apply scoring");
      }
    } catch {
      alert("Network error");
    } finally {
      setScoring(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gameweeks</h1>
          <p className="text-surface-400 mt-1">Manage weekly fixtures and scoring</p>
        </div>
        <Button onClick={openCreate}>Create Gameweek</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : gameweeks.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">No gameweeks found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {gameweeks.map((gw) => (
                  <tr key={gw.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3 text-surface-300 font-medium">{gw.number}</td>
                    <td className="px-6 py-3 font-medium text-surface-200">{gw.name}</td>
                    <td className="px-6 py-3 text-surface-400">
                      {formatDate(gw.startDate)} — {formatDate(gw.endDate)}
                    </td>
                    <td className="px-6 py-3 text-surface-400">{formatDate(gw.deadline)}</td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          gw.status === "active" ? "active" : gw.status === "finished" ? "success" : "info"
                        }
                        dot
                      >
                        {gw.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(gw)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openFreeze(gw)}>
                          Freeze squads
                        </Button>
                        {STATUS_FLOW[gw.status] && (
                          <Button variant="secondary" size="sm" onClick={() => advanceStatus(gw)}>
                            → {STATUS_FLOW[gw.status]}
                          </Button>
                        )}
                        {gw.status === "finished" && (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={scoring === gw.id}
                            onClick={() => applyScoring(gw)}
                          >
                            Apply Scoring
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
        open={freezeGw !== null}
        onClose={() => { if (!freezeLoading) setFreezeGw(null); }}
        title="Freeze current squads"
        description="Copies today's squads onto this gameweek. It does not score and it does not open the next gameweek."
        size="xl"
      >
        <div className="space-y-4 text-sm">
          {freezeLoading && !freezePlan ? (
            <Skeleton height={16} width="100%" />
          ) : null}
          {freezeError ? <p className="text-red-400">{freezeError}</p> : null}
          {freezePlan ? (
            <>
              <p className="text-surface-300">
                {freezePlan.gameweek
                  ? `${freezePlan.gameweek.name} · GW${freezePlan.gameweek.number} · ${freezePlan.gameweek.seasonName} · ${freezePlan.gameweek.status} · deadline ${new Date(freezePlan.gameweek.deadline).toLocaleString()}`
                  : "Gameweek not found"}
              </p>
              {freezePlan.frozen ? (
                <p className="text-emerald-400">Frozen. Re-save the missed Appearance before opening the next gameweek.</p>
              ) : null}
              {freezePlan.reasons.length > 0 ? (
                <ul className="space-y-1 text-red-400">
                  {freezePlan.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              ) : null}
              <div>
                <p className="text-surface-200 font-medium">
                  {freezePlan.slots.length} players {freezePlan.frozen ? "were" : "would be"} captured
                </p>
                <ul className="mt-2 max-h-64 overflow-y-auto space-y-1 text-surface-400">
                  {freezePlan.slots.map((slot) => (
                    <li key={`${slot.teamId}-${slot.playerId}`}>
                      {slot.teamName} ({slot.userName}) — {slot.playerName} {slot.position}{" "}
                      {slot.isStarting ? "XI" : "bench"}
                      {slot.isCaptain ? " captain" : ""}
                      {slot.isViceCaptain ? " vice" : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-surface-200 font-medium">This cannot verify</p>
                <ul className="mt-2 space-y-1 text-surface-500">
                  {freezePlan.unverified.map((line) => <li key={line}>{line}</li>)}
                </ul>
              </div>
            </>
          ) : null}
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setFreezeGw(null)} disabled={freezeLoading}>
              Close
            </Button>
            {freezePlan?.ok && !freezePlan.frozen ? (
              <Button type="button" loading={freezeLoading} onClick={confirmFreeze}>
                Confirm freeze
              </Button>
            ) : null}
          </ModalFooter>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? "Edit Gameweek" : "Create Gameweek"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Season"
            value={form.seasonId}
            onChange={(v) => setForm({ ...form, seasonId: v })}
            options={seasons.map((s) => ({ label: `${s.name} (${s.year})`, value: s.id }))}
            placeholder="Select season"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Number"
              type="number"
              min={1}
              value={form.number}
              onChange={(e) => setForm({ ...form, number: parseInt(e.target.value) || 1 })}
              required
            />
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Week 1"
              required
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <Input
              label="Deadline Date"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              required
            />
            <Input
              label="Time"
              type="time"
              value={form.deadlineTime}
              onChange={(e) => setForm({ ...form, deadlineTime: e.target.value })}
              className="w-28"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <Input
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
              <Input
                label="Time"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-28"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <Input
                label="End Date"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
              <Input
                label="Time"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-28"
              />
            </div>
          </div>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editItem ? "Save Changes" : "Create Gameweek"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
