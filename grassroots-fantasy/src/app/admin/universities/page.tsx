"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, generateSlug } from "@/lib/utils";

interface University {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  logo: string | null;
  state: string | null;
  country: string;
  status: string;
  memberCount?: number;
}

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nassarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<University | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    slug: "",
    state: "",
    country: "Nigeria",
    logo: "",
  });
  const [formError, setFormError] = useState("");

  const fetchUniversities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/universities");
      if (res.ok) {
        const data = await res.json();
        setUniversities(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniversities();
  }, [fetchUniversities]);

  function openCreate() {
    setEditItem(null);
    setForm({ name: "", shortName: "", slug: "", state: "", country: "Nigeria", logo: "" });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(uni: University) {
    setEditItem(uni);
    setForm({
      name: uni.name,
      shortName: uni.shortName,
      slug: uni.slug,
      state: uni.state ?? "",
      country: uni.country,
      logo: uni.logo ?? "",
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
      const payload = {
        ...form,
        slug: form.slug || generateSlug(form.name),
        state: form.state || undefined,
        logo: form.logo || undefined,
      };
      const url = editItem ? `/api/admin/universities/${editItem.id}` : "/api/admin/universities";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        fetchUniversities();
      } else {
        setFormError(data.error || "Failed to save");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(uni: University) {
    const newStatus = uni.status === "active" ? "inactive" : "active";
    try {
      await fetch(`/api/admin/universities/${uni.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchUniversities();
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Universities</h1>
          <p className="text-surface-400 mt-1">
            Universities you add here appear as choices when students register.
          </p>
        </div>
        <Button onClick={openCreate}>Add University</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : universities.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">No universities found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">State</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Members</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {universities.map((uni) => (
                  <tr key={uni.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {uni.logo ? (
                          <img src={uni.logo} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-300">
                            {uni.shortName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-surface-200">{uni.name}</p>
                          <p className="text-xs text-surface-500">{uni.shortName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-surface-400">{uni.slug}</td>
                    <td className="px-6 py-3 text-surface-400">{uni.state ?? "—"}</td>
                    <td className="px-6 py-3 text-surface-300">{uni.memberCount ?? 0}</td>
                    <td className="px-6 py-3">
                      <Badge variant={uni.status === "active" ? "active" : "default"} dot>
                        {uni.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(uni)}>
                          Edit
                        </Button>
                        <Button
                          variant={uni.status === "active" ? "danger" : "secondary"}
                          size="sm"
                          onClick={() => toggleStatus(uni)}
                        >
                          {uni.status === "active" ? "Deactivate" : "Activate"}
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
        title={editItem ? "Edit University" : "Create University"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="University of Lagos"
            required
          />
          <Input
            label="Short Name"
            value={form.shortName}
            onChange={(e) => setForm({ ...form, shortName: e.target.value })}
            placeholder="UNILAG"
            required
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="unilag (auto-generated if empty)"
          />
          <Select
            label="State"
            value={form.state}
            onChange={(v) => setForm({ ...form, state: v })}
            options={NIGERIAN_STATES.map((s) => ({ label: s, value: s }))}
            placeholder="Select state"
          />
          <Input
            label="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
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
              {editItem ? "Save Changes" : "Create University"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
