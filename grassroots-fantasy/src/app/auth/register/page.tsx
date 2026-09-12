"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase-browser";

function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

  const [googleUser, setGoogleUser] = useState<{
    email: string;
    name: string;
    avatar: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [faculties, setFaculties] = useState<{ id: string; name: string }[]>([]);
  const [facultyId, setFacultyId] = useState("");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentId, setDepartmentId] = useState("");

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/oauth/consent");
        return;
      }

      const user = session.user;
      const email = user.email || "";
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0];
      const avatar = user.user_metadata?.avatar_url || "";

      setGoogleUser({ email, name: fullName, avatar });
      setName(fullName);
      setCheckingAuth(false);
    });
  }, [router]);

  useEffect(() => {
    async function fetchUniversity() {
      try {
        const res = await fetch("/api/universities");
        const data = await res.json();
        if (data.success) {
          const list = data.data?.universities ?? [];
          const funaab = list.find((u: { slug: string }) => u.slug === "funaab");
          if (funaab) {
            setUniversityId(funaab.id);
            setUniversityName(funaab.name);

            const facRes = await fetch(`/api/universities/funaab/faculties`);
            const facData = await facRes.json();
            setFaculties(facData.data?.faculties ?? []);
          }
        }
      } catch {
        setFaculties([]);
      }
    }
    fetchUniversity();
  }, []);

  useEffect(() => {
    if (facultyId) {
      fetch(`/api/faculties/${facultyId}/departments`)
        .then((r) => r.json())
        .then((d) => setDepartments(d.data?.departments ?? []))
        .catch(() => setDepartments([]));
    } else {
      setDepartments([]);
    }
    setDepartmentId("");
  }, [facultyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!universityId) {
      setError("University not loaded yet. Please try again.");
      setLoading(false);
      return;
    }

    if (!username.trim()) {
      setError("Please enter a username");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register-and-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          universityId,
          email: googleUser?.email,
          facultyId: facultyId || undefined,
          departmentId: departmentId || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      if (data.data?.authorizationUrl) {
        window.location.href = data.data.authorizationUrl;
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-md px-4 py-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
            Grassroots Fantasy
          </h1>
        </div>

        {/* Google Account Info */}
        {googleUser && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800/80 px-4 py-3">
            {googleUser.avatar ? (
              <img
                src={googleUser.avatar}
                alt={googleUser.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                {googleUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{googleUser.name}</p>
              <p className="text-xs text-surface-500 truncate">{googleUser.email}</p>
            </div>
            <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-2xl border border-surface-200 dark:border-surface-700/50 bg-white dark:bg-surface-800/80 p-6 shadow-xl">
          <div className="mb-6 text-center">
            <h2 className="font-display text-xl font-bold text-surface-900 dark:text-white">
              Complete Your Profile
            </h2>
            <p className="mt-1 text-sm text-surface-500">
              Just a few details to get you started
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                Full Name
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/50 py-3 pl-10 pr-4 text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                Username
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/50 py-3 pl-10 pr-4 text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                Email Address
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={googleUser?.email || ""}
                  readOnly
                  className="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/80 py-3 pl-10 pr-4 text-sm text-surface-900 dark:text-surface-100 cursor-not-allowed"
                />
                <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-1 text-xs text-surface-500">From your Google account</p>
            </div>

            {/* University - Pre-selected FUNAAB */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                University
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <input
                  type="text"
                  value={universityName || "Loading..."}
                  readOnly
                  className="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/80 py-3 pl-10 pr-4 text-sm text-surface-900 dark:text-surface-100 cursor-not-allowed"
                />
                <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Faculty */}
            {faculties.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                  Faculty
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <select
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/50 py-3 pl-10 pr-10 text-sm text-surface-900 dark:text-surface-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">Select your faculty</option>
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            {/* Department */}
            {facultyId && departments.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                  Department
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900/50 py-3 pl-10 pr-10 text-sm text-surface-900 dark:text-surface-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">Select your department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}

            {/* Register Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
            >
              Register & Pay
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-surface-500">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-brand-500 hover:text-brand-600"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
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
      <RegisterForm />
    </Suspense>
  );
}
