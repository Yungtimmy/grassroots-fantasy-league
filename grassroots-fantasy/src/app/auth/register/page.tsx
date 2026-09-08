"use client";

import React, { Suspense, useState, useEffect } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { UniversityPublic } from "@/types";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <React.Fragment key={i}>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i + 1 < currentStep
                ? "bg-brand-500 text-white"
                : i + 1 === currentStep
                  ? "bg-brand-500/20 text-brand-400 ring-2 ring-brand-500"
                  : "bg-surface-700 text-surface-400"
            }`}
          >
            {i + 1 < currentStep ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < totalSteps - 1 && (
            <div
              className={`h-0.5 w-12 transition-colors ${
                i + 1 < currentStep ? "bg-brand-500" : "bg-surface-700"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSlug = searchParams.get("university");
  const [step, setStep] = useState(preselectedSlug ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [universities, setUniversities] = useState<UniversityPublic[]>([]);
  const [universitiesLoading, setUniversitiesLoading] = useState(true);
  const [selectedUniversity, setSelectedUniversity] =
    useState<UniversityPublic | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    async function fetchUniversities() {
      try {
        const res = await fetch("/api/universities");
        const data = await res.json();
        if (data.success) {
          const list = data.data?.universities ?? [];
          setUniversities(list);
          if (preselectedSlug) {
            const match = list.find((u: UniversityPublic) => u.slug === preselectedSlug);
            if (match) {
              setSelectedUniversity(match);
              setStep(2);
            } else {
              setStep(1);
            }
          }
        }
      } catch {
        setUniversities([]);
      } finally {
        setUniversitiesLoading(false);
      }
    }
    fetchUniversities();
  }, [preselectedSlug]);

  function handleSelectUniversity(uni: UniversityPublic) {
    setSelectedUniversity(uni);
    setStep(2);
  }

  function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep(3);
  }

  async function handleConfirm() {
    if (!selectedUniversity) return;
    setLoading(true);
    setError("");

    try {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          username,
          password,
          universityId: selectedUniversity.id,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerData.success) {
        setError(registerData.error || "Registration failed");
        setLoading(false);
        return;
      }

      const paymentRes = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universityId: selectedUniversity.id,
        }),
      });

      const paymentData = await paymentRes.json();

      if (paymentData.success && paymentData.data?.authorizationUrl) {
        const flutterwaveKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
        if (flutterwaveKey && typeof window !== "undefined" && (window as any).FlutterwaveCheckout) {
          (window as any).FlutterwaveCheckout({
            public_key: flutterwaveKey,
            tx_ref: paymentData.data.reference,
            amount: 500,
            currency: "NGN",
            callback: async (response: any) => {
              await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference: response.tx_ref }),
              });
              router.push("/dashboard?payment=success");
            },
            onclose: () => {
              setLoading(false);
              router.push("/dashboard");
            },
            customizations: {
              title: "Grassroots Fantasy League",
              description: "Registration fee",
            },
          });
        } else {
          window.location.href = paymentData.data.authorizationUrl;
        }
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-surface-700/50 bg-surface-800/80 p-8 shadow-xl backdrop-blur-sm">
      <div className="mb-2 text-center">
        <h1 className="font-display text-2xl font-bold text-surface-100">
          Join GFL
        </h1>
        <p className="mt-2 text-sm text-surface-400">
          Create your account and start competing
        </p>
      </div>

      <StepIndicator currentStep={step} totalSteps={3} />

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Select University */}
      {step === 1 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold text-surface-300">
            Select your university
          </h2>

          {universitiesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-surface-700/50"
                />
              ))}
            </div>
          ) : universities.length === 0 ? (
            <p className="py-8 text-center text-sm text-surface-500">
              No universities available at this time.
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {universities.map((uni) => (
                <button
                  key={uni.id}
                  onClick={() => handleSelectUniversity(uni)}
                  className="flex w-full items-center gap-4 rounded-xl border border-surface-700/50 bg-surface-900/50 p-4 text-left transition-all hover:border-brand-500/30 hover:bg-surface-800"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-xs font-bold text-brand-400">
                    {uni.shortName.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-200">
                      {uni.name}
                    </p>
                    <p className="text-xs text-surface-500">
                      {uni.shortName}
                      {uni.state && ` · ${uni.state}`}
                    </p>
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-surface-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Account Details */}
      {step === 2 && (
        <form onSubmit={handleAccountSubmit} className="space-y-4">
          {selectedUniversity && (
            <div className="mb-2 flex items-center gap-3 rounded-lg bg-brand-500/10 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-500/20 text-xs font-bold text-brand-400">
                {selectedUniversity.shortName.slice(0, 3).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-surface-200">
                  {selectedUniversity.name}
                </p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />

          <Input
            label="Username"
            placeholder="johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
          >
            Continue
          </Button>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-center text-sm text-surface-400 hover:text-surface-300"
          >
            Back to university selection
          </button>
        </form>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && selectedUniversity && (
        <div>
          <Card className="mb-6 border-brand-500/20 bg-brand-500/5">
            <Card.Content className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-500/20 text-lg font-bold text-brand-400">
                {selectedUniversity.shortName.slice(0, 3).toUpperCase()}
              </div>
              <h3 className="font-display text-lg font-semibold text-surface-100">
                You are joining
              </h3>
              <p className="text-xl font-bold text-brand-400">
                {selectedUniversity.name} Fantasy League
              </p>
            </Card.Content>
          </Card>

          <div className="mb-6 space-y-3 rounded-xl border border-surface-700/50 bg-surface-900/50 p-4">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 shrink-0 text-brand-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-surface-200">
                  Registration Fee
                </p>
                <p className="text-xs text-surface-500">
                  One-time payment to join your university&apos;s league
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 shrink-0 text-brand-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-surface-200">
                  Secure Payment
                </p>
                <p className="text-xs text-surface-500">
                  Powered by Flutterwave. Your payment is encrypted and secure.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            onClick={handleConfirm}
          >
            Proceed to Payment
          </Button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-3 w-full text-center text-sm text-surface-400 hover:text-surface-300"
          >
            Back to account details
          </button>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-surface-400">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-brand-400 hover:text-brand-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      }
    >
      <Script src="https://checkout.flutterwave.com/v3.js" strategy="lazyOnload" />
      <RegisterForm />
    </Suspense>
  );
}
