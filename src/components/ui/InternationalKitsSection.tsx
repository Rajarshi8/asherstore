"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingCart, Zap, Star } from "lucide-react";
import toast from "react-hot-toast";

import type { Product } from "@/lib/types";
import { formatINR, resolveProductImageSrc } from "@/lib/utils";
import { useShopStore } from "@/store/useShopStore";

function SpotlightCard({ product, position }: { product: Product; position: "left" | "center" | "right" }) {
  const addToCart = useShopStore((s) => s.addToCart);
  const user = useShopStore((s) => s.user);
  const [ordering, setOrdering] = useState(false);

  async function handleOrderNow() {
    if (!user) { toast.error("Please log in to place an order"); return; }
    setOrdering(true);
    try {
      const image = resolveProductImageSrc(product.images[0]);
      const imageUrl = image.startsWith("/") ? `${window.location.origin}${image}` : image;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product.id, name: product.name, size: "M", qty: 1, price: product.price }],
          total: product.price,
          currency: "INR",
        }),
      });
      const json = (await res.json()) as { error?: string; order?: { id: string } };
      if (!res.ok || !json.order?.id) throw new Error(json.error || "Could not place order");
      const lines = [
        "New order request",
        `Order ID: ${json.order.id}`,
        `Customer: ${user.name || user.email}`,
        `Email: ${user.email}`,
        `Total: ${formatINR(product.price)}`,
        "Items:",
        `- ${product.name} (${product.id}) | Size M | Qty 1 | ${formatINR(product.price)}`,
        `  Image: ${imageUrl}`,
      ];
      window.open(`https://wa.me/917980918650?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
      toast.success("Order placed! WhatsApp message prepared.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setOrdering(false);
    }
  }

  const isCenter = position === "center";

  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden transition-all duration-500 ${
        isCenter
          ? "w-[38%] md:w-[36%] z-20 rounded-none"
          : "w-[31%] md:w-[32%] z-10"
      }`}
    >
      {/* Jersey image fill */}
      <div
        className={`relative w-full transition-all duration-500 ${
          isCenter ? "aspect-[2/3]" : "aspect-[2/3]"
        }`}
        style={
          !isCenter
            ? { filter: "blur(2px) brightness(0.45)", transform: "scale(0.96)" }
            : {}
        }
      >
        <Image
          src={resolveProductImageSrc(product.images[0])}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover object-center"
        />
        {/* Outer vignette for side cards */}
        {!isCenter && (
          <div
            className={`absolute inset-0 ${
              position === "left"
                ? "bg-gradient-to-r from-[#0a0a0a] via-transparent to-transparent"
                : "bg-gradient-to-l from-[#0a0a0a] via-transparent to-transparent"
            }`}
          />
        )}
      </div>

      {/* Center card overlay — info panel at bottom */}
      {isCenter && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-5 pb-6 pt-16 z-30">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#b5f23d]">{product.team}</p>
          <h3 className="mt-1 text-lg font-extrabold uppercase tracking-tight text-white leading-tight line-clamp-2">
            {product.name.replace(" Jersey", "")}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-base font-black text-white">{formatINR(product.price)}</p>
            <div className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              <Star size={9} className="fill-amber-400 text-amber-400" />
              {product.rating.toFixed(1)}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => { addToCart({ productId: product.id, size: "M", qty: 1 }); toast.success("Added to cart"); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2 px-3 text-xs font-bold text-black transition-all hover:bg-zinc-200 active:scale-95"
            >
              <ShoppingCart size={12} /> Add to Cart
            </button>
            <button
              disabled={ordering}
              onClick={() => { void handleOrderNow(); }}
              className="flex items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/10 py-2 px-3 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <Zap size={12} className="text-[#b5f23d]" /> {ordering ? "…" : "Buy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function InternationalKitsSection() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/products/international-home-kits")
      .then((r) => r.json() as Promise<{ products?: Product[] }>)
      .then((json) => { if (active) setItems(json.products || []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % Math.max(items.length, 1));
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
  }, [items.length]);

  // Auto-rotate every 4s
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(handleNext, 4000);
    return () => clearInterval(t);
  }, [items.length, handleNext]);

  const getSlide = (offset: number) =>
    items[(activeIndex + offset + items.length) % items.length];

  return (
    <section className="relative w-full bg-[#0a0a0a] overflow-hidden">
      {/* Subtle ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(181,242,61,0.04),transparent_70%)]" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="flex flex-col items-center text-center pt-14 pb-10 px-4"
      >
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-white leading-none">
          Best of International Home Kits
        </h2>
        {/* Lime-green underline — matching reference */}
        <div className="mt-3 h-1 w-40 rounded-full bg-[#b5f23d]" />
      </motion.div>

      {/* Spotlight Carousel */}
      {loading ? (
        <div className="flex h-[420px] items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-[#b5f23d]/40 border-t-[#b5f23d] animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-20 text-center text-sm text-zinc-500">No international kits available yet.</p>
      ) : (
        <div className="relative flex items-stretch justify-center overflow-hidden" style={{ minHeight: 420 }}>
          <AnimatePresence mode="sync">
            <div key={activeIndex} className="flex w-full items-stretch justify-center">
              {items.length >= 3 ? (
                <>
                  <SpotlightCard product={getSlide(-1)} position="left" />
                  <SpotlightCard product={getSlide(0)} position="center" />
                  <SpotlightCard product={getSlide(1)} position="right" />
                </>
              ) : items.length === 2 ? (
                <>
                  <SpotlightCard product={items[activeIndex === 0 ? 1 : 0]} position="left" />
                  <SpotlightCard product={items[activeIndex]} position="center" />
                  <SpotlightCard product={items[activeIndex === 0 ? 1 : 0]} position="right" />
                </>
              ) : (
                <SpotlightCard product={items[0]} position="center" />
              )}
            </div>
          </AnimatePresence>

          {/* Nav arrows */}
          {items.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                aria-label="Previous kit"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-40 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md transition hover:bg-white hover:text-black hover:scale-110 active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next kit"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-40 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-md transition hover:bg-white hover:text-black hover:scale-110 active:scale-95"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Dot indicators + View all */}
      {items.length > 0 && (
        <div className="flex flex-col items-center gap-5 py-8 px-4">
          {items.length > 1 && (
            <div className="flex items-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Go to kit ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex ? "w-8 bg-[#b5f23d]" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-zinc-200 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/40 hover:gap-3 active:scale-95"
          >
            View all kits <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </section>
  );
}
