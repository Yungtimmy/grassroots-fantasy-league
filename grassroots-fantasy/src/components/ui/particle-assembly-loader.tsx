"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PARTICLE_COUNT = 40;
const CONVERGE_DURATION = 1.6;
const LOGO_REVEAL_DELAY = 1.2;
const PULSE_DELAY = 1.8;
const FLOAT_DELAY = 2.4;
const MIN_HOLD = 2800;

interface Particle {
  id: number;
  startX: number;
  startY: number;
  size: number;
  delay: number;
  color: string;
  blur: number;
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist = 200 + Math.random() * 300;
    return {
      id: i,
      startX: Math.cos(angle) * dist,
      startY: Math.sin(angle) * dist,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 0.4,
      color:
        i % 5 === 0
          ? "rgba(205,242,43,0.9)"
          : i % 3 === 0
            ? "rgba(30,69,251,0.6)"
            : "rgba(205,242,43,0.4)",
      blur: Math.random() > 0.7 ? 1 : 0,
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
  const [phase, setPhase] = useState<"converge" | "reveal" | "pulse" | "float" | "exit">(
    reduced ? "float" : "converge"
  );

  useEffect(() => {
    if (reduced) {
      setPhase("float");
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setPhase("reveal"), LOGO_REVEAL_DELAY * 1000));
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
                "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(205,242,43,0.04) 0%, transparent 70%)",
            }}
          />

          {/* Outer ring — fades in during reveal */}
          <motion.div
            className="pointer-events-none absolute rounded-full border border-white/[0.03]"
            style={{ width: 280, height: 280 }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={
              phase === "converge"
                ? { opacity: 0, scale: 0.6 }
                : { opacity: 1, scale: 1 }
            }
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* Inner ring */}
          <motion.div
            className="pointer-events-none absolute rounded-full border border-brand-400/10"
            style={{ width: 180, height: 180 }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={
              phase === "converge"
                ? { opacity: 0, scale: 0.5 }
                : { opacity: 1, scale: 1 }
            }
            transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
          />

          {/* Energy pulse ring */}
          <AnimatePresence>
            {phase === "pulse" && (
              <motion.div
                className="pointer-events-none absolute rounded-full border-2 border-brand-400/30"
                style={{ width: 120, height: 120 }}
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 3.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </AnimatePresence>

          {/* Second energy ring — offset timing */}
          <AnimatePresence>
            {phase === "pulse" && (
              <motion.div
                className="pointer-events-none absolute rounded-full border border-accent-500/20"
                style={{ width: 120, height: 120 }}
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 2.8 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.15,
                }}
              />
            )}
          </AnimatePresence>

          {/* Particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="pointer-events-none absolute rounded-full will-change-transform"
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                filter: p.blur ? `blur(${p.blur}px)` : undefined,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
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
                      opacity: [0, 1, 0.9, 0.7],
                      scale: [0, 1.2, 1],
                    }
                  : phase === "reveal" || phase === "pulse"
                    ? {
                        x: 0,
                        y: 0,
                        opacity: [0.7, 0],
                        scale: [1, 0],
                      }
                    : { opacity: 0, scale: 0 }
              }
              transition={{
                duration: CONVERGE_DURATION,
                delay: p.delay,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            />
          ))}

          {/* Logo container */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-3"
            initial={{ opacity: 0, filter: "blur(12px)", scale: 0.8 }}
            animate={
              phase === "converge"
                ? { opacity: 0, filter: "blur(12px)", scale: 0.8 }
                : phase === "float"
                  ? {
                      opacity: 1,
                      filter: "blur(0px)",
                      scale: 1,
                      y: [0, -6, 0],
                    }
                  : {
                      opacity: 1,
                      filter: "blur(0px)",
                      scale: 1,
                    }
            }
            transition={
              phase === "float"
                ? {
                    opacity: { duration: 0.6 },
                    filter: { duration: 0.8 },
                    scale: { duration: 0.8, ease: "easeOut" },
                    y: {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }
                : {
                    opacity: { duration: 0.6 },
                    filter: { duration: 0.8 },
                    scale: { duration: 0.8, ease: "easeOut" },
                  }
            }
          >
            {/* Ambient glow behind logo */}
            <motion.div
              className="pointer-events-none absolute -inset-8 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(205,242,43,0.08) 0%, transparent 70%)",
              }}
              animate={{
                opacity: [0.5, 0.8, 0.5],
                scale: [0.9, 1.05, 0.9],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Logo image */}
            <div className="relative h-20 w-20">
              <img
                src="/logo.png"
                alt="GFL"
                className="h-full w-full object-contain drop-shadow-[0_0_30px_rgba(205,242,43,0.3)]"
                draggable={false}
              />
            </div>

            {/* Brand text */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={
                phase === "converge"
                  ? { opacity: 0, y: 8 }
                  : { opacity: 1, y: 0 }
              }
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <p className="font-display text-sm font-semibold tracking-[0.2em] text-white/80 uppercase">
                Grassroots
              </p>
              <p className="font-display text-[10px] font-light tracking-[0.35em] text-brand-400/60 uppercase">
                Fantasy League
              </p>
            </motion.div>
          </motion.div>

          {/* Subtle loading bar */}
          <motion.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={
              phase === "converge" || phase === "reveal"
                ? { opacity: 1 }
                : { opacity: 0 }
            }
            transition={{ duration: 0.3 }}
          >
            <div className="h-[1px] w-24 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400/0 via-brand-400/60 to-brand-400/0"
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: 1.2,
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
