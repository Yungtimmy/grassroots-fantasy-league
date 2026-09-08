"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  avatar: string | null;
  createdAt: string;
  university?: string;
  status?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailModal, setDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data?.items ?? data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function viewUser(user: User) {
    setSelectedUser(user);
    setDetailModal(true);
  }

  async function toggleStatus(user: User) {
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchUsers();
    } catch {
      // silent
    }
  }

  async function toggleRole(user: User) {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-surface-400 mt-1">Manage platform users</p>
      </div>

      <div className="flex-1 max-w-md">
        <Input
          placeholder="Search by name, email, or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          }
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} height={16} width="100%" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-300">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-surface-200">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-surface-400">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant="info">{u.username}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={u.role === "admin" ? "active" : "default"} dot>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-surface-400">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => viewUser(u)}>
                          View
                        </Button>
                        <Button
                          variant={u.role === "admin" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => toggleRole(u)}
                        >
                          {u.role === "admin" ? "Demote" : "Promote"}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => toggleStatus(u)}
                        >
                          {u.status === "suspended" ? "Activate" : "Suspend"}
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

      {/* User Detail Modal */}
      <Modal
        open={detailModal}
        onClose={() => setDetailModal(false)}
        title="User Details"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-surface-700 flex items-center justify-center text-xl font-bold text-surface-300">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedUser.name}</h3>
                <p className="text-surface-400">@{selectedUser.username}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-surface-500 text-xs uppercase tracking-wider">Email</p>
                <p className="text-surface-200 mt-1">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-surface-500 text-xs uppercase tracking-wider">Role</p>
                <p className="text-surface-200 mt-1 capitalize">{selectedUser.role}</p>
              </div>
              <div>
                <p className="text-surface-500 text-xs uppercase tracking-wider">Joined</p>
                <p className="text-surface-200 mt-1">{formatDate(selectedUser.createdAt)}</p>
              </div>
              <div>
                <p className="text-surface-500 text-xs uppercase tracking-wider">Status</p>
                <p className="text-surface-200 mt-1 capitalize">{selectedUser.status ?? "active"}</p>
              </div>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDetailModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
