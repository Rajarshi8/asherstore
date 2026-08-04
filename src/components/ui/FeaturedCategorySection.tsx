"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const CATEGORIES = [
  {
    id: "retro",
    label: "Retro Jerseys",
    href: "/products?version=sublimation",
    image: "/pictures/categories/retro-jerseys.png",
  },
  {
    id: "accessories",
    label: "Accessories",
    href: "/products?version=special-edition",
    image: "/pictures/categories/accessories.png",
  },
  {
    id: "kits",
    label: "Jerseys with Shorts",
    href: "/products?version=master",
    image: "/pictures/categories/jerseys-with-shorts.png",
  },
  {
    id: "clearance",
    label: "Clearance Sale",
    href: "/products?version=clearance",
    image: "/pictures/categories/clearance-sale.png",
  },
];

export function FeaturedCategorySection() {
  const [isPaused, setIsPaused] = useState(false);
  const marqueeCategories = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES, ...CATEGORIES];

  return (
    <section className="relative w-full bg-[#0a0a0a] overflow-hidden pt-4 md:pt-6 pb-14">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-10 flex flex-col items-center text-center px-4"
      >
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-white leading-none">
          Featured Category
        </h2>
        {/* Lime underline — matching design system */}
        <div className="mt-3 h-1 w-44 rounded-full bg-[#b5f23d]" />
      </motion.div>

      {/* Marquee Loop Container */}
      <div
        className="relative w-full overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left & Right gradient fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 md:w-24 z-10 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 md:w-24 z-10 bg-gradient-to-l from-[#0a0a0a] to-transparent" />

        <div
          className="category-marquee-track flex gap-4"
          style={{
            width: "200%",
            animation: "categoryMarquee 25s linear infinite",
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {marqueeCategories.map((cat, i) => (
            <div
              key={`${cat.id}-${i}`}
              className="group relative w-[260px] sm:w-[320px] md:w-[360px] flex-shrink-0 cursor-pointer"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <Link href={cat.href} className="block overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 transition-all duration-300 hover:border-[#b5f23d]/50 hover:shadow-[0_12px_32px_rgba(0,0,0,0.8)]">
                {/* Image container */}
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    sizes="(max-width: 768px) 260px, 360px"
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Bottom gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                  {/* Arrow on hover */}
                  <div className="absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-black/50 text-white opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 backdrop-blur-sm">
                    <ArrowRight size={15} />
                  </div>
                </div>

                {/* Label below image */}
                <div className="bg-zinc-900 px-4 py-4">
                  <p className="text-sm sm:text-base font-extrabold uppercase tracking-[0.12em] text-white group-hover:text-[#b5f23d] transition-colors duration-200">
                    {cat.label}
                  </p>
                  <div className="mt-1.5 h-[2px] w-0 group-hover:w-full bg-[#b5f23d] transition-all duration-300 rounded-full" />
                </div>
              </Link>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes categoryMarquee {
            0% { transform: translate3d(0%, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
          .category-marquee-track:hover {
            animation-play-state: paused !important;
          }
        `}</style>
      </div>
    </section>
  );
}
