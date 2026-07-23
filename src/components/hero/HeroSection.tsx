"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { HeroSlider } from "./HeroSlider";
import { FeatureStrip } from "./FeatureStrip";

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-[#090a0f] py-8 md:py-16 text-zinc-100 border-b border-white/10">
      {/* Background radial ambient glow effect */}
      <div className="pointer-events-none absolute left-1/2 top-1/4 -z-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-10 top-1/3 -z-0 h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-[140px]" />

      <div className="mx-auto max-w-7xl px-4 md:px-6 relative z-10 space-y-12">
        {/* Main Grid: Left Typography + Right Carousel */}
        <div className="grid items-center gap-10 lg:grid-cols-12">
          {/* Left Side Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-6 lg:col-span-6 xl:col-span-5"
          >
            {/* Above heading - Small Luxury Label */}
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-[0.35em] text-zinc-400 font-medium">
                THE ASHER STORE
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08]">
              <span className="block font-luxury italic font-medium tracking-normal text-zinc-100">
                Elevate your game,
              </span>
              <span className="block text-zinc-300 font-sans tracking-tight">
                wear the legacy.
              </span>
            </h1>

            {/* Subtext */}
            <p className="max-w-md text-sm sm:text-base leading-relaxed text-zinc-400">
              Discover authentic match-fit jerseys, iconic retro drops, and custom fan editions designed for true supporters.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {/* Primary Button - White rounded button matching reference */}
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-all duration-300 hover:bg-zinc-200 hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              >
                Shop Now
              </Link>

              {/* Secondary CTA - Matching "Watch Video" from reference image */}
              <button
                type="button"
                onClick={() => {
                  const target = document.getElementById("featured-strip");
                  target?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-200 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/40 active:scale-95"
              >
                <div className="grid h-5 w-5 place-items-center rounded-full bg-white/20">
                  <Play size={10} className="fill-current text-white translate-x-[1px]" />
                </div>
                Watch Video
              </button>
            </div>
          </motion.div>

          {/* Right Side - Hero Carousel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="lg:col-span-6 xl:col-span-7"
          >
            <HeroSlider />
          </motion.div>
        </div>

        {/* Feature Strip Container */}
        <motion.div
          id="featured-strip"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="pt-4"
        >
          <FeatureStrip />
        </motion.div>
      </div>
    </section>
  );
}
