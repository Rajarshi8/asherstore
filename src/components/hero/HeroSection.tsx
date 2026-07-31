"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { FeatureStrip } from "./FeatureStrip";

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-zinc-950 py-16 md:py-28 text-zinc-100">
      {/* Background radial ambient glow effect */}
      <div className="pointer-events-none absolute left-1/4 top-1/2 -z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/12 blur-[140px]" />
      <div className="pointer-events-none absolute right-1/4 top-1/2 -z-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-rose-500/10 blur-[160px]" />
      <div className="pointer-events-none absolute left-1/2 bottom-0 -z-0 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/8 blur-[100px]" />
      {/* Bottom fade — blends hero seamlessly into page content */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-zinc-950 z-20" />

      <div className="mx-auto max-w-7xl px-4 md:px-6 relative z-10 space-y-14">
        {/* Full-width Centered Typography Hero */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center text-center space-y-8"
        >
          {/* Small Luxury Label */}
          <motion.span
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.35em" }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-xs uppercase tracking-[0.35em] text-zinc-400 font-medium"
          >
            THE ASHER STORE
          </motion.span>

          {/* Main Headline — Full Width, Typographic Impact */}
          <h1 className="max-w-5xl text-6xl font-extrabold tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl leading-[1.0]">
            <span className="block font-luxury italic font-medium tracking-normal text-zinc-100">
              Elevate your game,
            </span>
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
              className="block text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-white to-zinc-300 font-sans tracking-tight"
            >
              wear the legacy.
            </motion.span>
          </h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="max-w-xl text-base sm:text-lg leading-relaxed text-zinc-400"
          >
            Discover authentic match-fit jerseys, iconic retro drops, and custom fan editions designed for true supporters.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            {/* Primary Button */}
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:bg-zinc-200 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.25)]"
            >
              Shop Now
            </Link>


          </motion.div>
        </motion.div>

        {/* Feature Strip Container */}
        <motion.div
          id="featured-strip"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55, ease: "easeOut" }}
          className="pt-4"
        >
          <FeatureStrip />
        </motion.div>
      </div>
    </section>
  );
}
