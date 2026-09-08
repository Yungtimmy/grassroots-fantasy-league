"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ScoringRule {
  id: string;
  event: string;
  position: string | null;
  points: number;
  description: string | null;
}

const EVENT_TYPES = [
  { label: "Appearance", value: "APPEARANCE" },
  { label: "Goal", value: "GOAL" },
  { label: "Assist", value: "ASSIST" },
  { label: "Clean Sheet", value: "CLEAN_SHEET" },
  { label: "Save", value: "SAVE" },
  { label: "Penalty Save", value: "PENALTY_SAVE" },
  { label: "Yellow Card", value: "YELLOW_CARD" },
  { label: "Red Card", value: "RED_CARD" },
  { label: "Own Goal", value: "OWN_GOAL" },
  { label: "Penalty Miss", value: "PENALTY_MISS" },
];

const POSITION_OPTIONS = [
  { label: "All Positions", value: "" },
  { label: "Goalkeeper (GK)", value: "GK" },
  { label: "Defender (DEF)", value: "DEF" },
  { label: "Midfielder (MID)", value: "MID" },
  { label: "Forward (FWD)", value: "FWD" },
];

const DEFAULT_RULES = [
  { event: "APPEARANCE", points: 2, description: "Played 60+ minutes" },
  { event: "GOAL", points: 5, description: "Scored a goal" },
  { event: "ASSIST", points: 3, description: "Provided an assist" },
  { event: "CLEAN_SHEET", points: 4, description: "No goals conceded" },
  { event: "SAVE", points: 1, description: "Per save (GK only)" },
  { event: "PENALTY_SAVE", points: 5, description: "Saved a penalty" },
  { event: "YELLOW_CARD", points: -1, description: "Received a yellow card" },
  { event: "RED_CARD", points: -3, description: "Received a red card" },
  { event: "OWN_GOAL", points: -2, description: "Scored an own goal" },
  { event: "PENALTY_MISS", points: -2, description: "Missed a penalty" },
];

export default function ScoringPage() {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ScoringRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    event: "GOAL",
    position: "",
    points: 5,
    description: "",
  });
  const [formError, setFormError] = useState("");

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scoring");
      if (res.ok) {
        const data = await res.json();
        setRules(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  function openCreate() {
    setEditItem(null);
    setForm({ event: "GOAL", position: "", points: 5, description: "" });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(rule: ScoringRule) {
    setEditItem(rule);
    setForm({
      event: rule.event,
      position: rule.position ?? "",
      points: rule.points,
      description: rule.description ?? "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.event) {
      setFormError("Event type is required");
      return;
    }
    setSaving(true);
    try {
      const url = editItem ? `/api/admin/scoring/${editItem.id}` : "/api/admin/scoring";
      const method = editItem ? "PUT" : "POST";
      const payload = {
        ...form,
        position: form.position || null,
        description: form.description || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchRules();
      } else {
        setFormError(data.error || "Failed to save");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(rule: ScoringRule) {
    if (!confirm("Delete this scoring rule?")) return;
    try {
      await fetch(`/api/admin/scoring/${rule.id}`, { method: "DELETE" });
      fetchRules();
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Scoring Rules</h1>
          <p className="text-surface-400 mt-1">Configure points for player events</p>
        </div>
        <Button onClick={openCreate}>Add Rule</Button>
      </div>

      {/* Default Rules Reference */}
      <Card>
        <div className="px-6 py-4 border-b border-surface-700/50">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">Default Rules Reference</h2>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {DEFAULT_RULES.map((r) => (
            <div key={r.event} className="bg-surface-900/50 rounded-lg p-3">
              <p className="text-xs text-surface-500 uppercase tracking-wider">{r.event.replace(/_/g, " ")}</p>
              <p className={cn("text-lg font-bold mt-1", r.points > 0 ? "text-green-400" : "text-red-400")}>
                {r.points > 0 ? "+" : ""}{r.points} pts
              </p>
              <p className="text-xs text-surface-500 mt-0.5">{r.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Rules */}
      <Card>
        <div className="px-6 py-4 border-b border-surface-700/50">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">Active Rules</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">No scoring rules configured.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Points</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3">
                      <Badge variant="info">{rule.event.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-6 py-3 text-surface-400">{rule.position ?? "All"}</td>
                    <td className="px-6 py-3">
                      <span className={cn("font-bold", rule.points > 0 ? "text-green-400" : "text-red-400")}>
                        {rule.points > 0 ? "+" : ""}{rule.points}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-surface-400">{rule.description ?? "—"}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => deleteRule(rule)}>
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
        title={editItem ? "Edit Scoring Rule" : "Add Scoring Rule"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Event Type"
            value={form.event}
            onChange={(v) => setForm({ ...form, event: v })}
            options={EVENT_TYPES}
          />
          <Select
            label="Position (leave empty for all)"
            value={form.position}
            onChange={(v) => setForm({ ...form, position: v })}
            options={POSITION_OPTIONS}
          />
          <Input
            label="Points"
            type="number"
            value={form.points}
            onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description"
          />
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editItem ? "Save Changes" : "Add Rule"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
