"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PARTICLE_COUNT = 30;
const REVEAL_DURATION = 1.8;
const PULSE_DELAY = 2.0;
const FLOAT_DELAY = 2.5;
const MIN_HOLD = 2800;

interface Particle {
  id: number;
  startX: number;
  startY: number;
  size: number;
  delay: number;
  color: string;
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 160 + Math.random() * 200;
    return {
      id: i,
      startX: Math.cos(angle) * dist,
      startY: Math.sin(angle) * dist + 60,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 0.6,
      color:
        i % 4 === 0
          ? "rgba(205,242,43,0.9)"
          : i % 3 === 0
            ? "rgba(30,69,251,0.5)"
            : "rgba(205,242,43,0.35)",
    };
  });
}

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
  const particles = useMemo(() => generateParticles(), []);
  const [phase, setPhase] = useState<"converge" | "pulse" | "float" | "exit">(
    reduced ? "float" : "converge"
  );

  useEffect(() => {
    if (reduced) {
      setPhase("float");
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setPhase("pulse"), PULSE_DELAY * 1000));
    timers.push(setTimeout(() => setPhase("float"), FLOAT_DELAY * 1000));
    return () => timers.forEach(clearTimeout);
  }, [reduced, onComplete]);

  const handleLoadReady = useCallback(() => {
    if (reduced) {
      onComplete();
      return;
    }
    const exitTimer = setTimeout(() => setPhase("exit"), MIN_HOLD);
    const completeTimer = setTimeout(() => onComplete(), MIN_HOLD + 600);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [reduced, onComplete]);

  useEffect(() => {
    if (phase === "float") return handleLoadReady();
  }, [phase, handleLoadReady]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          aria-label="Loading"
          role="status"
        >
          {/* Ambient background glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 50% 40% at 50% 55%, rgba(205,242,43,0.03) 0%, transparent 70%)",
            }}
          />

          {/* Outer ring */}
          <motion.div
            className="pointer-events-none absolute rounded-full border border-white/[0.04]"
            style={{ width: 240, height: 240 }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={
              phase === "converge"
                ? { opacity: 0, scale: 0.5 }
                : { opacity: 1, scale: 1 }
            }
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* Inner ring */}
          <motion.div
            className="pointer-events-none absolute rounded-full border border-brand-400/[0.07]"
            style={{ width: 160, height: 160 }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={
              phase === "converge"
                ? { opacity: 0, scale: 0.4 }
                : { opacity: 1, scale: 1 }
            }
            transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
          />

          {/* Energy pulse rings */}
          <AnimatePresence>
            {phase === "pulse" && (
              <>
                <motion.div
                  className="pointer-events-none absolute rounded-full border-2 border-brand-400/25"
                  style={{ width: 100, height: 100 }}
                  initial={{ opacity: 0.8, scale: 1 }}
                  animate={{ opacity: 0, scale: 3.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                />
                <motion.div
                  className="pointer-events-none absolute rounded-full border border-accent-500/15"
                  style={{ width: 100, height: 100 }}
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scale: 2.8 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1,
                    ease: [0.4, 0, 0.2, 1],
                    delay: 0.12,
                  }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Particles — converge inward then dissolve */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="pointer-events-none absolute rounded-full will-change-transform"
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
              }}
              initial={{
                x: p.startX,
                y: p.startY,
                opacity: 0,
                scale: 0,
              }}
              animate={
                phase === "converge"
                  ? {
                      x: 0,
                      y: 0,
                      opacity: [0, 1, 0.8],
                      scale: [0, 1.3, 0.8],
                    }
                  : phase === "pulse"
                    ? {
                        x: 0,
                        y: 0,
                        opacity: [0.8, 0],
                        scale: [0.8, 0],
                      }
                    : { opacity: 0, scale: 0 }
              }
              transition={{
                duration: REVEAL_DURATION,
                delay: p.delay,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            />
          ))}

          {/* Logo container — clip-path sweeps bottom-to-top */}
          <div className="relative z-10 flex items-center justify-center">
            {/* Ambient glow behind logo */}
            <motion.div
              className="pointer-events-none absolute -inset-10 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(205,242,43,0.06) 0%, transparent 65%)",
              }}
              animate={{
                opacity: [0.3, 0.7, 0.3],
                scale: [0.85, 1.1, 0.85],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Sweep edge glow — moves up with the reveal */}
            <motion.div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{
                width: 120,
                height: 3,
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse, rgba(205,242,43,0.5) 0%, transparent 70%)",
                filter: "blur(3px)",
              }}
              initial={{ bottom: "0%", opacity: 0 }}
              animate={
                phase === "converge"
                  ? { bottom: "0%", opacity: 0 }
                  : { bottom: ["0%", "100%"], opacity: [0, 0.8, 0.6, 0] }
              }
              transition={{
                duration: REVEAL_DURATION,
                ease: [0.4, 0, 0.2, 1],
              }}
            />

            {/* The logo image with bottom-to-top clip reveal */}
            <motion.div
              className="relative h-20 w-20"
              initial={{ clipPath: "inset(100% 0 0 0)" }}
              animate={
                phase === "converge"
                  ? { clipPath: "inset(100% 0 0 0)" }
                  : phase === "float"
                    ? { clipPath: "inset(0% 0 0 0)" }
                    : { clipPath: "inset(0% 0 0 0)" }
              }
              transition={{
                duration: REVEAL_DURATION,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <img
                src="/logo.png"
                alt="GFL"
                className="h-full w-full object-contain drop-shadow-[0_0_30px_rgba(205,242,43,0.25)]"
                draggable={false}
              />
            </motion.div>
          </div>

          {/* Loading bar at bottom */}
          <motion.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={
              phase === "converge" ? { opacity: 1 } : { opacity: 0 }
            }
            transition={{ duration: 0.3 }}
          >
            <div className="h-[1px] w-20 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400/0 via-brand-400/50 to-brand-400/0"
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
