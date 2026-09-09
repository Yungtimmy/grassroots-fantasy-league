"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/layout/auth-provider"

interface Payment {
  id: string
  date: string
  amount: number
  status: "SUCCESSFUL" | "PENDING" | "FAILED"
  reference: string
  description: string
}

const statusStyles: Record<string, string> = {
  SUCCESSFUL: "bg-green-500/20 text-green-400",
  PENDING: "bg-yellow-500/20 text-yellow-400",
  FAILED: "bg-red-500/20 text-red-400",
}

const statusLabels: Record<string, string> = {
  SUCCESSFUL: "Successful",
  PENDING: "Pending",
  FAILED: "Failed",
}

export default function PaymentsPage() {
  const { user, loading: authLoading } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user) {
      fetch("/api/user/payments")
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error)
          } else {
            setPayments(data.payments ?? [])
          }
        })
        .catch(() => setError("Failed to load payment history"))
        .finally(() => setLoading(false))
    }
  }, [user])

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Payment History</h1>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-surface-400">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-surface-400 text-lg mb-2">No payments yet.</p>
            <p className="text-surface-500 text-sm">Your payment history will appear here.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-800 bg-surface-800/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">Reference</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-surface-400 uppercase">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-surface-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-surface-800 hover:bg-surface-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-surface-300">
                        {new Date(p.date).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm">{p.description}</td>
                      <td className="px-6 py-4 text-sm font-mono text-surface-400 text-xs">
                        {p.reference}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono font-semibold">
                        ₦{p.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[p.status] ?? "bg-surface-800 text-surface-400"}`}>
                          {statusLabels[p.status] ?? p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-surface-800">
              {payments.map((p) => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-300">
                      {new Date(p.date).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[p.status] ?? "bg-surface-800 text-surface-400"}`}>
                      {statusLabels[p.status] ?? p.status}
                    </span>
                  </div>
                  <p className="text-sm">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-surface-500">{p.reference}</span>
                    <span className="text-sm font-mono font-semibold">₦{p.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
