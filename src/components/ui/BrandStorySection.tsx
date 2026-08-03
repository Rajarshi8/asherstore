"use client";

import { motion } from "framer-motion";

/* Animated SVG football with lime-green comet trail */
export function BrandStorySection() {
  return (
    <section className="relative w-full overflow-hidden bg-zinc-950">
      {/* Subtle top border accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#b5f23d] to-transparent" />

      <div className="mx-auto max-w-3xl px-6 py-10 md:py-14 flex flex-col items-center text-center gap-4">

        {/* Store name */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-[0.15em] text-zinc-100"
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
      </div>

      {/* Subtle bottom border accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#b5f23d] to-transparent" />
    </section>
  );
}
