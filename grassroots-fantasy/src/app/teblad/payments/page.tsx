"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

interface Payment {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  currency: string;
  reference: string;
  provider: string | null;
  status: string;
  seasonId: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Successful", value: "successful" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalRevenue = payments
    .filter((p) => p.status === "successful")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-surface-400 mt-1">View and manage payment transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-surface-400 uppercase tracking-wider font-medium">Total Revenue</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-surface-400 uppercase tracking-wider font-medium">Pending</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-surface-400 uppercase tracking-wider font-medium">Total Transactions</p>
          <p className="text-2xl font-bold text-surface-200 mt-1">{payments.length}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by reference or user..."
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
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Filter by status"
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
          ) : payments.length === 0 ? (
            <p className="p-6 text-surface-400 text-sm">No payments found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-surface-700/30 hover:bg-surface-700/20">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-surface-200">{p.userName ?? "Unknown"}</p>
                        <p className="text-xs text-surface-500">{p.userEmail ?? "—"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-medium text-surface-200">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-3">
                      <code className="text-xs bg-surface-900 px-2 py-1 rounded text-surface-400">
                        {p.reference}
                      </code>
                    </td>
                    <td className="px-6 py-3 text-surface-400">{p.provider ?? "—"}</td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          p.status === "successful"
                            ? "success"
                            : p.status === "pending"
                            ? "pending"
                            : "failed"
                        }
                        dot
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-surface-400">{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
