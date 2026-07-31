"use client";

import { motion } from "framer-motion";

const TEXT = "SUPERIOR PRODUCT LINE";
const REPEATS = 10;

export function SuperiorLineSection() {
  const items = Array.from({ length: REPEATS });

  return (
    <div className="relative w-full overflow-hidden bg-zinc-950 border-y border-white/8 py-4">
      {/* Left/right fade masks */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-zinc-950 to-transparent" />

      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, repeatType: "loop", duration: 22, ease: "linear" }}
        style={{ width: "200%" }}
      >
        {items.map((_, i) => (
          <span key={i} className="inline-flex items-center gap-5 px-5">
            <span className="h-2 w-2 rounded-full border border-zinc-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.22em] text-zinc-200">
              {TEXT}
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
