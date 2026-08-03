"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Gem, ShieldCheck, Sparkles } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Premium Feature Items                                              */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { icon: Sparkles, label: "Weekly Drops" },
  { icon: ShieldCheck, label: "Trusted Support" },
  { icon: BadgeCheck, label: "Fan-Approved Quality" },
  { icon: Gem, label: "Premium, Priced Right" },
];

/* ------------------------------------------------------------------ */
/* Count-up hook                                                         */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, duration = 1800, start = false, startVal = 0) {
  const [value, setValue] = useState(startVal);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(startVal + eased * (target - startVal)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration, startVal]);
  return value;
}

/* ------------------------------------------------------------------ */
/* Stat number block                                                     */
/* ------------------------------------------------------------------ */
function StatNumber({
  target,
  startVal = 0,
  suffix,
  label,
  started,
  duration,
}: {
  target: number;
  startVal?: number;
  suffix: string;
  label: string;
  started: boolean;
  duration?: number;
}) {
  const value = useCountUp(target, duration ?? 1800, started, startVal);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tighter text-zinc-100 leading-none tabular-nums">
        {value.toLocaleString()}{suffix}
      </span>
      <span className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.25em] text-zinc-400">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Section                                                          */
/* ------------------------------------------------------------------ */
export function TrustStripSection() {
  const [started, setStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* Quadruple the items for seamless loop */
  const marqueeItems = [...FEATURES, ...FEATURES, ...FEATURES, ...FEATURES];

  return (
    <section className="relative w-full bg-zinc-950 overflow-hidden">
      {/* Subtle separator */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── Icon marquee strip (Pauses on Hover) ────────────────── */}
      <div
        className="relative w-full overflow-hidden border-y border-white/5 py-8 bg-zinc-900/40"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left/Right fade masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-zinc-950 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-zinc-950 to-transparent" />

        <div
          className="marquee-track flex gap-0"
          style={{
            width: "200%",
            animation: "trustMarquee 22s linear infinite",
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {marqueeItems.map((feat, i) => {
            const IconComp = feat.icon;
            return (
              <div
                key={i}
                className="group flex flex-col items-center justify-center gap-3 px-8 sm:px-14 flex-shrink-0 cursor-pointer"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#b5f23d] shadow-[0_0_20px_rgba(181,242,61,0.1)] transition-all duration-300 group-hover:scale-110 group-hover:border-[#b5f23d]/40 group-hover:bg-[#b5f23d]/15">
                  <IconComp size={26} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400 whitespace-nowrap transition-colors duration-300 group-hover:text-white">
                  {feat.label}
                </span>
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes trustMarquee {
            0% { transform: translate3d(0%, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          .marquee-track:hover {
            animation-play-state: paused !important;
          }
        `}</style>
      </div>

      {/* ── Count-up stats ───────────────────────────────────────── */}
      <div
        ref={statsRef}
        className="mx-auto max-w-4xl px-6 py-20 grid grid-cols-2 gap-8 place-items-center"
      >
        <StatNumber target={350} suffix="+" label="Designs" started={started} duration={1200} />
        <StatNumber target={10000} startVal={100} suffix="+" label="Customers" started={started} duration={1000} />
      </div>
    </section>
  );
}
