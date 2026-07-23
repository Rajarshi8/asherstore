"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

export interface HeroSlide {
  id: string;
  title: string;
  tagline: string;
  badge?: string;
  image: string;
  alt: string;
}

const defaultSlides: HeroSlide[] = [
  {
    id: "slide-1",
    title: "Pro Match Kits 2026",
    tagline: "Precision engineered performance wear",
    badge: "NEW ARRIVAL",
    image: "/pictures/hero/slide1.png",
    alt: "Asher Store Pro Match Kit Navy Blue and Gold Edition",
  },
  {
    id: "slide-2",
    title: "Night Stealth Edition",
    tagline: "Ultra lightweight matchday collection",
    badge: "LIMITED DROP",
    image: "/pictures/hero/slide2.png",
    alt: "Asher Store Stealth Black and Crimson Kit",
  },
  {
    id: "slide-3",
    title: "Emerald Gold Series",
    tagline: "Worn by champions on the field",
    badge: "EXCLUSIVE",
    image: "/pictures/hero/slide3.png",
    alt: "Asher Store Emerald Gold Championship Jersey",
  },
];

interface HeroSliderProps {
  slides?: HeroSlide[];
  autoSlideInterval?: number; // ms
}

export function HeroSlider({
  slides = defaultSlides,
  autoSlideInterval = 4500,
}: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [autoSlideInterval, isPaused, slides.length, handleNext]);

  const currentSlide = slides[currentIndex];
  const hasImgError = imgErrors[currentSlide.id];

  const slideVariants = {
    initial: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 50 : -50,
      scale: 0.96,
    }),
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -50 : 50,
      scale: 0.96,
    }),
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/40 via-zinc-950/80 to-black/90 p-4 md:p-8 shadow-2xl group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Lighting Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.12),transparent_70%)]" />

      {/* Main Image Display */}
      <div className="relative aspect-[4/3] w-full md:aspect-[16/10] overflow-hidden rounded-2xl flex items-center justify-center">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentSlide.id}
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative h-full w-full flex items-center justify-center"
          >
            {!hasImgError ? (
              <Image
                src={currentSlide.image}
                alt={currentSlide.alt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain object-center transition-transform duration-700 group-hover:scale-105"
                onError={() => {
                  setImgErrors((prev) => ({ ...prev, [currentSlide.id]: true }));
                }}
              />
            ) : (
              /* High-end Styled Fallback Graphic */
              <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 text-center border border-white/5">
                <div className="mb-4 grid h-24 w-24 place-items-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                  <Sparkles size={40} className="animate-pulse" />
                </div>
                {currentSlide.badge && (
                  <span className="mb-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[10px] font-bold tracking-widest text-rose-300 uppercase">
                    {currentSlide.badge}
                  </span>
                )}
                <h3 className="text-xl font-bold tracking-wide text-zinc-100 md:text-2xl">
                  {currentSlide.title}
                </h3>
                <p className="mt-1 text-xs text-zinc-400 md:text-sm">
                  {currentSlide.tagline}
                </p>
              </div>
            )}

            {/* Subtle Overlay Badge on image */}
            {currentSlide.badge && !hasImgError && (
              <div className="absolute top-4 right-4 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-200 shadow-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  {currentSlide.badge}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Manual Navigation Arrows */}
      <button
        onClick={handlePrev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-zinc-200 backdrop-blur-md transition hover:bg-white hover:text-black hover:scale-110 active:scale-95 focus:outline-none"
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={handleNext}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-zinc-200 backdrop-blur-md transition hover:bg-white hover:text-black hover:scale-110 active:scale-95 focus:outline-none"
      >
        <ChevronRight size={20} />
      </button>

      {/* Pagination Dot Indicators */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                isActive
                  ? "w-8 bg-white"
                  : "w-2 bg-white/30 hover:bg-white/60"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
