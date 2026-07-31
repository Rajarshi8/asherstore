"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/* SVG Icons                                                            */
/* ------------------------------------------------------------------ */
function IconPlayer() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="7" r="5" fill="#b5f23d" />
      <line x1="32" y1="12" x2="28" y2="28" stroke="#b5f23d" strokeWidth="3" strokeLinecap="round" />
      <line x1="28" y1="28" x2="18" y2="38" stroke="#b5f23d" strokeWidth="3" strokeLinecap="round" />
      <line x1="28" y1="28" x2="38" y2="38" stroke="#b5f23d" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="12" x2="20" y2="22" stroke="#b5f23d" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="12" x2="44" y2="20" stroke="#b5f23d" strokeWidth="3" strokeLinecap="round" />
      <circle cx="15" cy="42" r="4" fill="#b5f23d" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 4 h20 v18 a10 10 0 0 1 -20 0 Z" fill="none" stroke="#b5f23d" strokeWidth="2.5" />
      <path d="M38 10 h6 a4 4 0 0 1 0 12 l-6 -2" fill="none" stroke="#b5f23d" strokeWidth="2.5" />
      <path d="M18 10 h-6 a4 4 0 0 0 0 12 l6 -2" fill="none" stroke="#b5f23d" strokeWidth="2.5" />
      <line x1="28" y1="22" x2="28" y2="34" stroke="#b5f23d" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="20" y="34" width="16" height="4" rx="2" fill="#b5f23d" />
      <line x1="18" y1="42" x2="38" y2="42" stroke="#b5f23d" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="42" cy="38" r="8" fill="none" stroke="#b5f23d" strokeWidth="2" />
      <text x="42" y="42" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#b5f23d">★</text>
    </svg>
  );
}

function IconFinger() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M28 4 C24 4 21 7 21 11 v22 C21 36 24 38 28 38 C32 38 35 36 35 33 V11 C35 7 32 4 28 4 Z" fill="none" stroke="#b5f23d" strokeWidth="2.5" />
      <path d="M21 30 C17 30 14 33 14 37 L14 44 C14 46 16 48 18 48 L38 48 C40 48 42 46 42 44 L42 37 C42 33 39 30 35 30" fill="none" stroke="#b5f23d" strokeWidth="2.5" />
      <text x="28" y="18" textAnchor="middle" fontSize="9" fontWeight="900" fill="#b5f23d">#1</text>
    </svg>
  );
}

function IconJersey() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6 L8 18 L14 22 L14 46 L42 46 L42 22 L48 18 L36 6 C34 10 22 10 20 6 Z" fill="none" stroke="#b5f23d" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 6 C22 10 34 10 36 6" fill="none" stroke="#b5f23d" strokeWidth="2.5" />
      <line x1="14" y1="22" x2="42" y2="22" stroke="#b5f23d" strokeWidth="1.5" strokeOpacity="0.4" />
    </svg>
  );
}

const FEATURES = [
  { icon: <IconPlayer />, label: "Weekly Drops" },
  { icon: <IconTrophy />, label: "Trusted Support" },
  { icon: <IconFinger />, label: "Fan-Approved Quality" },
  { icon: <IconJersey />, label: "Premium, Priced Right" },
];

/* ------------------------------------------------------------------ */
/* Count-up hook                                                         */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

/* ------------------------------------------------------------------ */
/* Stat number block                                                     */
/* ------------------------------------------------------------------ */
function StatNumber({
  target,
  suffix,
  label,
  started,
  duration,
}: {
  target: number;
  suffix: string;
  label: string;
  started: boolean;
  duration?: number;
}) {
  const value = useCountUp(target, duration ?? 1800, started);
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

  /* Double the items for seamless loop */
  const marqueeItems = [...FEATURES, ...FEATURES, ...FEATURES, ...FEATURES];

  return (
    <section className="relative w-full bg-zinc-950 overflow-hidden">
      {/* Subtle separator */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── Icon marquee strip ───────────────────────────────────── */}
      <div className="relative w-full overflow-hidden border-y border-white/5 py-8 bg-zinc-900/40">
        {/* Left/Right fade masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-zinc-950 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-zinc-950 to-transparent" />

        <motion.div
          className="flex gap-0"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, repeatType: "loop", duration: 20, ease: "linear" }}
          style={{ width: "200%" }}
        >
          {marqueeItems.map((feat, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-3 px-8 sm:px-14 flex-shrink-0"
            >
              <div className="transition-transform duration-300 hover:scale-110">
                {feat.icon}
              </div>
              <span className="text-[9px] sm:text-xs font-extrabold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-zinc-400 whitespace-nowrap">
                {feat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Count-up stats ───────────────────────────────────────── */}
      <div
        ref={statsRef}
        className="mx-auto max-w-4xl px-6 py-20 grid grid-cols-2 gap-8 place-items-center"
      >
        <StatNumber target={500} suffix="+" label="Designs" started={started} duration={1600} />
        <StatNumber target={10000} suffix="+" label="Customers" started={started} duration={2000} />
      </div>
    </section>
  );
}
