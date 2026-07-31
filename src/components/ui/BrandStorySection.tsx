"use client";

import { motion } from "framer-motion";

/* Animated SVG football with lime-green comet trail */
function FootballIcon() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Comet / motion trail */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute -left-10 top-1/2 -translate-y-1/2 origin-right"
      >
        <svg width="60" height="18" viewBox="0 0 60 18" fill="none">
          <defs>
            <linearGradient id="trailGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#b5f23d" stopOpacity="0" />
              <stop offset="100%" stopColor="#b5f23d" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <ellipse cx="30" cy="9" rx="30" ry="4" fill="url(#trailGrad)" />
        </svg>
      </motion.div>

      {/* Football SVG */}
      <motion.div
        initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
        whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        whileHover={{ rotate: [0, -8, 8, -4, 0], transition: { duration: 0.6 } }}
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Lime outer glow */}
          <circle cx="32" cy="32" r="31" fill="none" stroke="#b5f23d" strokeWidth="1.5" strokeOpacity="0.3" />
          {/* Ball body */}
          <circle cx="32" cy="32" r="28" fill="#0a0a0a" stroke="#b5f23d" strokeWidth="1.8" />
          {/* Pentagon patches */}
          <polygon points="32,10 39,16 36,25 28,25 25,16" fill="#b5f23d" opacity="0.9" />
          <polygon points="32,54 39,48 36,39 28,39 25,48" fill="#b5f23d" opacity="0.7" />
          <polygon points="11,26 18,22 24,29 20,37 12,36" fill="#b5f23d" opacity="0.6" />
          <polygon points="53,26 46,22 40,29 44,37 52,36" fill="#b5f23d" opacity="0.6" />
          {/* Seam lines */}
          <line x1="32" y1="10" x2="32" y2="4" stroke="#b5f23d" strokeWidth="1.5" strokeOpacity="0.4" />
          <line x1="39" y1="16" x2="44" y2="12" stroke="#b5f23d" strokeWidth="1.5" strokeOpacity="0.4" />
          <line x1="25" y1="16" x2="20" y2="12" stroke="#b5f23d" strokeWidth="1.5" strokeOpacity="0.4" />
        </svg>
      </motion.div>
    </div>
  );
}

export function BrandStorySection() {
  return (
    <section className="relative w-full overflow-hidden bg-zinc-950">
      {/* Subtle top border accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#b5f23d] to-transparent" />

      <div className="mx-auto max-w-3xl px-6 py-20 flex flex-col items-center text-center gap-7">

        {/* Animated football icon */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <FootballIcon />
        </motion.div>

        {/* Store name */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="text-2xl sm:text-3xl font-extrabold uppercase tracking-[0.2em] text-zinc-100"
        >
          The Asher Store
        </motion.h2>

        {/* Lime accent underline */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
          className="h-[2px] w-16 rounded-full bg-[#b5f23d] origin-center"
        />

        {/* Brand story paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-sm sm:text-base leading-relaxed text-zinc-400 max-w-2xl"
        >
          Football is more than just a sport — it&apos;s a passion, a culture, and a way of life. At The Asher Store,
          we believe every fan deserves to wear their club with pride, whether you&apos;re in the stands, the streets, or
          the backyard. We bring you authentic match-fit jerseys, iconic retro drops, and curated fan editions,
          delivering the beautiful game straight to your doorstep across India.
        </motion.p>

        {/* Three stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-2 flex flex-wrap justify-center gap-10"
        >
          {[
            { stat: "500+", label: "Jerseys Available" },
            { stat: "10K+", label: "Happy Fans" },
            { stat: "100%", label: "Authentic Kits" },
          ].map((item) => (
            <div key={item.stat} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-extrabold text-zinc-100 tracking-tight">{item.stat}</span>
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Subtle bottom border accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#b5f23d] to-transparent" />
    </section>
  );
}
