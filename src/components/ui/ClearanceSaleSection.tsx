"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Marquee row — infinitely scrolling, direction-aware, tilted        */
/* ------------------------------------------------------------------ */
const TICKER_TEXT = "UPTO 70% OFF ON CLEARANCE SALE";
const REPEATS = 8; // enough copies to fill any viewport width

function MarqueeRow({
  direction,
  tiltDeg,
  speed,
}: {
  direction: "left" | "right";
  tiltDeg: number;
  speed: number; // seconds for one full loop
}) {
  const items = Array.from({ length: REPEATS }, (_, i) => i);

  return (
    <div
      className="w-full overflow-hidden"
      style={{ transform: `rotate(${tiltDeg}deg)`, padding: "6px 0" }}
    >
      <motion.div
        className="flex whitespace-nowrap gap-0"
        animate={
          direction === "left"
            ? { x: ["0%", "-50%"] }
            : { x: ["-50%", "0%"] }
        }
        transition={{
          repeat: Infinity,
          repeatType: "loop",
          duration: speed,
          ease: "linear",
        }}
        style={{ width: "200%" }}
      >
        {items.map((i) => (
          <span
            key={i}
            className="inline-flex items-center gap-6 px-6 text-sm sm:text-base font-extrabold uppercase tracking-widest"
            style={{ color: i % 2 === 0 ? "#b5f23d" : "#ffffff" }}
          >
            {TICKER_TEXT}
            <span className="inline-block h-2 w-2 rounded-full bg-current opacity-60" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main section                                                        */
/* ------------------------------------------------------------------ */
export function ClearanceSaleSection() {
  return (
    <section className="relative w-full bg-[#0a0a0a] overflow-hidden">
      {/* ── Dual tilted marquee banners (Intersection centered at middle) ── */}
      <div className="relative w-full h-24 sm:h-28 overflow-hidden bg-black flex items-center justify-center">
        {/* Row 1 — tilts -2.5deg, scrolls RIGHT */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <MarqueeRow direction="right" tiltDeg={-2.5} speed={18} />
        </div>
        {/* Row 2 — tilts +2.5deg, scrolls LEFT */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <MarqueeRow direction="left" tiltDeg={2.5} speed={18} />
        </div>
      </div>

      {/* ── Hero collage ─────────────────────────────────────────── */}
      <div className="relative w-full aspect-[21/9] min-h-[320px] overflow-hidden">
        {/* Full-bleed editorial collage */}
        <Image
          src="/pictures/clearance-collage.png"
          alt="Clearance Sale — football jerseys collage"
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />

        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Radial vignette at centre so text pops */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_55%,rgba(0,0,0,0.3),rgba(0,0,0,0.7)_80%)]" />

        {/* Centred text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 gap-4">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative text-4xl sm:text-5xl md:text-6xl font-extrabold uppercase tracking-tight text-white leading-none"
          >
            <span className="relative inline-block pb-3">
              Clearance Sale
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 sm:h-1.5 w-1/2 rounded-full bg-[#b5f23d] shadow-[0_0_12px_rgba(181,242,61,0.6)]" />
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
            className="max-w-md text-sm sm:text-base text-zinc-300 leading-relaxed"
          >
            Score top jerseys and gear at unbeatable prices. Limited stock, limited time — grab yours before they&apos;re gone!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.22 }}
          >
            <Link
              href="/products?version=clearance"
              className="inline-flex items-center gap-2 rounded-none border border-white px-7 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-white hover:text-black hover:gap-3 active:scale-95"
            >
              Shop Now <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
