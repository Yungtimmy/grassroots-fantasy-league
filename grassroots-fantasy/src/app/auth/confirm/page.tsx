"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/auth/register";
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash;

      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabaseBrowser.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setError(error.message);
            return;
          }

          window.history.replaceState({}, document.title, window.location.pathname);
          await checkUserAndRedirect();
          return;
        }
      }

      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (session) {
        await checkUserAndRedirect();
      } else {
        setError("No session found. Please try signing in again.");
      }
    };

    const checkUserAndRedirect = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.data?.user) {
          router.replace("/dashboard");
        } else {
          router.replace("/auth/register");
        }
      } catch {
        router.replace("/auth/register");
      }
    };

    handleAuth();
  }, [router, next]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Authentication Failed</h2>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <a
            href="/oauth/consent"
            className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-sm text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
}
