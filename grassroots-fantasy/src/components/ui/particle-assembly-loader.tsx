"use client";

import { useState, useEffect, useCallback } from "react";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function ParticleAssemblyLoader({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const duration = reduced ? 400 : 1400;

  useEffect(() => {
    const t = setTimeout(onComplete, duration);
    return () => clearTimeout(t);
  }, [onComplete, duration]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      aria-label="Loading"
      role="status"
    >
      <div className="relative flex flex-col items-center gap-4">
        <img
          src="/logo.png"
          alt="GFL"
          className="h-16 w-16 animate-pulse-slow object-contain"
          draggable={false}
        />
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-400/30 border-t-brand-400" />
      </div>
    </div>
  );
}
