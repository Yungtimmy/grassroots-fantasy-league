"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Script from "next/script";

interface LeagueDetail {
  id: string;
  name: string;
  description: string;
  entryFee: number;
  prizeInfo: string | null;
  rules: string | null;
  status: string;
  memberCount: number;
  teamCount: number;
  currentGameweek?: number | null;
  university: {
    id: string;
    name: string;
    shortName: string;
    slug: string;
    logo: string | null;
    state: string | null;
  };
  season: {
    id: string;
    name: string;
    status: string;
    registrationEnd: string;
  };
}

export default function LeagueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;

  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "card">("bank");
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchLeague();
    fetchUser();
  }, [leagueId]);

  async function fetchLeague() {
    try {
      const res = await fetch(`/api/leagues/${leagueId}`);
      const data = await res.json();
      if (data.success) {
        setLeague(data.data);
      } else {
        setError(data.error || "League not found");
      }
    } catch {
      setError("Failed to load league");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setUser(data.data.user);
      }
    } catch {}
  }

  function formatEntryFee(fee: number) {
    return `N${(fee / 100).toFixed(0)}`;
  }

  function isRegistrationOpen() {
    if (!league) return false;
    return new Date(league.season.registrationEnd) > new Date();
  }

  async function handlePayment() {
    if (!user) {
      router.push(`/auth/register?league=${leagueId}`);
      return;
    }
    setShowPayment(true);
  }

  async function confirmPayment() {
    setPaying(true);
    try {
      const paymentRes = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId, universityId: league?.university.id }),
      });

      const paymentData = await paymentRes.json();

      if (paymentData.success) {
        if (paymentData.data?.authorizationUrl) {
          const flutterwaveKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
          if (flutterwaveKey && typeof window !== "undefined" && (window as any).FlutterwaveCheckout) {
            (window as any).FlutterwaveCheckout({
              public_key: flutterwaveKey,
              tx_ref: paymentData.data.reference,
              amount: league?.entryFee ?? 52000,
              currency: "NGN",
              callback: async (response: any) => {
                await fetch("/api/payments/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reference: response.tx_ref, leagueId }),
                });
                setShowPayment(false);
                setPaymentSuccess(true);
              },
              onclose: () => {
                setPaying(false);
              },
              customizations: {
                title: league?.name ?? "GFL League",
                description: `Entry fee for ${league?.name}`,
              },
            });
          } else {
            window.location.href = paymentData.data.authorizationUrl;
          }
        } else {
          setShowPayment(false);
          setPaymentSuccess(true);
        }
      } else {
        setError(paymentData.error || "Payment failed");
        setPaying(false);
      }
    } catch {
      setError("Something went wrong");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="h-64 animate-pulse rounded-2xl bg-surface-100 dark:bg-surface-800" />
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="rounded-2xl bg-white dark:bg-surface-800 p-8 text-center">
            <p className="text-surface-500">{error || "League not found"}</p>
            <Link href="/leagues">
              <Button variant="outline" className="mt-4">Browse Leagues</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Payment Success Screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="rounded-2xl bg-white dark:bg-surface-800 p-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-500">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
              Payment Successful!
            </h2>
            <p className="mt-2 text-sm text-surface-500">You have joined:</p>
            <p className="mt-1 text-lg font-semibold text-surface-900 dark:text-white">
              {league.name}
            </p>
            <p className="text-sm text-surface-500">{league.university.shortName}</p>

            <div className="mt-6 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
              <p className="text-xs text-surface-500">Entry Fee</p>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {formatEntryFee(league.entryFee)}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link href="/squad">
                <Button variant="primary" size="lg" className="w-full">
                  Build My Team
                </Button>
              </Link>
              <Link href={`/leagues/${league.id}`}>
                <Button variant="outline" className="w-full">
                  View League Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="lazyOnload" />
      {/* Header Bar */}
      <div className="sticky top-0 z-10 border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/leagues" className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="font-display text-sm font-semibold text-surface-900 dark:text-white">
              League Details
            </span>
          </div>
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* League Header Card */}
        <div className="overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80">
          {/* Green Banner */}
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white">
                {league.university.shortName.slice(0, 3).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="font-display text-xl font-bold text-white">{league.name}</h1>
                <p className="text-sm text-white/80">{league.university.shortName} &middot; {league.university.name}</p>
                <div className="mt-2">
                  <Badge variant="success" className="bg-white/20 text-white border-white/30">
                    OPEN
                  </Badge>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/60">
              Season {league.season.name}
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 divide-x divide-surface-200 dark:divide-surface-700 border-t border-surface-200 dark:border-surface-700">
            <div className="px-4 py-4 text-center">
              <p className="text-lg font-bold text-brand-500">{formatEntryFee(league.entryFee)}</p>
              <p className="text-[10px] uppercase text-surface-500">Entry Fee</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-lg font-bold text-surface-900 dark:text-white">{league.memberCount}</p>
              <p className="text-[10px] uppercase text-surface-500">Participants</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-lg font-bold text-surface-900 dark:text-white">GW{league.currentGameweek ?? "—"}</p>
              <p className="text-[10px] uppercase text-surface-500">Current GW</p>
            </div>
          </div>
        </div>

        {/* Start Date */}
        <div className="mt-3 flex items-center gap-2 text-xs text-surface-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Start Date: {new Date(league.season.registrationEnd).toLocaleDateString("en-NG", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>

        {/* About */}
        <div className="mt-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-surface-900 dark:text-white">
            <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About this League
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-400">
            {league.description}
          </p>
        </div>

        {/* Prize Information */}
        {league.prizeInfo && (
          <div className="mt-6 rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold text-surface-900 dark:text-white">
              <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Prize Information
            </h2>
            <div className="mt-3 space-y-2 text-sm text-surface-600 dark:text-surface-400">
              {league.prizeInfo.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {/* League Rules */}
        <div className="mt-6 rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-surface-900 dark:text-white">
            <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            League Rules
          </h2>
          <ol className="mt-3 list-decimal list-inside space-y-1.5 text-sm text-surface-600 dark:text-surface-400">
            <li>Minimum 11 players per squad</li>
            <li>Budget: N100M</li>
            <li>No transfers after deadline</li>
            <li>Only real match events count</li>
          </ol>
        </div>

        {/* Join Button */}
        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!isRegistrationOpen()}
            onClick={handlePayment}
          >
            JOIN LEAGUE — {formatEntryFee(league.entryFee)}
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-surface-800 p-6 animate-slide-up">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
                Make Payment
              </h3>
              <button
                onClick={() => setShowPayment(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700 text-surface-500"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-surface-500">
              Complete your payment to join
            </p>
            <p className="font-semibold text-surface-900 dark:text-white">{league.name}</p>
            <p className="text-xs text-surface-500">{league.university.shortName}</p>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-50 dark:bg-surface-700/50 p-4">
              <span className="text-sm text-surface-600 dark:text-surface-400">Entry Fee</span>
              <span className="text-lg font-bold text-surface-900 dark:text-white">
                {formatEntryFee(league.entryFee)}
              </span>
            </div>

            <div className="mt-4">
              <p className="mb-3 text-xs font-medium text-surface-500">Payment Method</p>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                  paymentMethod === "bank"
                    ? "border-brand-500 bg-brand-500/5"
                    : "border-surface-200 dark:border-surface-700"
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "bank"}
                    onChange={() => setPaymentMethod("bank")}
                    className="accent-brand-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">Pay with Bank Transfer (NGN)</p>
                    <p className="text-[10px] text-surface-500">Simple, direct bank transfer</p>
                  </div>
                  <svg className="h-5 w-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </label>
                <label className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                  paymentMethod === "card"
                    ? "border-brand-500 bg-brand-500/5"
                    : "border-surface-200 dark:border-surface-700"
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="accent-brand-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">Pay with Card</p>
                    <p className="text-[10px] text-surface-500">Visa, Mastercard, Verve</p>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-5 w-8 rounded bg-blue-600" />
                    <div className="h-5 w-8 rounded bg-red-500" />
                    <div className="h-5 w-8 rounded bg-green-500" />
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={paying}
                onClick={confirmPayment}
              >
                Continue to Payment
              </Button>
            </div>

            <p className="mt-3 text-center text-[10px] text-surface-500">
              Your payment is secure and encrypted
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
