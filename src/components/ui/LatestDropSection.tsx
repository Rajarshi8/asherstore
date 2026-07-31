"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Heart, ShoppingCart, Zap, Star } from "lucide-react";
import toast from "react-hot-toast";

import type { Product } from "@/lib/types";
import { formatINR, resolveProductImageSrc } from "@/lib/utils";
import { useShopStore } from "@/store/useShopStore";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

function DropCard({ product, index }: { product: Product; index: number }) {
  const addToCart = useShopStore((s) => s.addToCart);
  const wishlist = useShopStore((s) => s.wishlist);
  const setWishlist = useShopStore((s) => s.setWishlist);
  const user = useShopStore((s) => s.user);
  const [ordering, setOrdering] = useState(false);
  const wished = wishlist.includes(product.id);

  async function handleWishlist() {
    const next = !wished;
    setWishlist(next ? [...wishlist, product.id] : wishlist.filter((id) => id !== product.id));
    if (!user) { toast("Sign in to sync wishlist"); return; }
    try {
      const res = await fetch("/api/profile/wishlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, wished: next }),
      });
      const json = (await res.json()) as { productIds?: string[] };
      setWishlist(json.productIds ?? wishlist);
    } catch {
      toast.error("Failed to update wishlist");
    }
  }

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

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      className="group flex flex-col overflow-hidden rounded-2xl bg-[#f2f2f0] shadow-lg hover:shadow-2xl transition-all duration-300"
    >
      {/* Jersey image — light cream background, editorial feel */}
      <Link href={`/products/${product.id}`} className="relative block aspect-[3/4] w-full overflow-hidden bg-[#ececea]">
        {/* Subtle vignette at bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#e8e8e6]/60 to-transparent z-10" />

        <Image
          src={resolveProductImageSrc(product.images[0])}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain object-center p-4 transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_16px_32px_rgba(0,0,0,0.18)]"
        />

        {/* Wishlist button */}
        <button
          onClick={() => { void handleWishlist(); }}
          aria-label="Toggle wishlist"
          className="absolute top-3 right-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/80 backdrop-blur-sm text-zinc-500 transition-all hover:bg-white hover:text-rose-500 hover:scale-110 active:scale-95 shadow"
        >
          <Heart size={14} className={wished ? "fill-rose-500 text-rose-500" : ""} />
        </button>

        {/* NEW badge */}
        <span className="absolute top-3 left-3 z-20 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-white shadow">
          NEW
        </span>
      </Link>

      {/* Card details */}
      <div className="flex flex-1 flex-col justify-between bg-[#f2f2f0] p-4 space-y-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">{product.team}</p>
          <Link href={`/products/${product.id}`}>
            <h3 className="mt-0.5 line-clamp-1 text-sm font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors tracking-tight">
              {product.name.replace(" Jersey", "")}
            </h3>
          </Link>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-base font-black text-zinc-900 tracking-tight">{formatINR(product.price)}</p>
            <div className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              <Star size={10} className="fill-amber-500 text-amber-500" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { addToCart({ productId: product.id, size: "M", qty: 1 }); toast.success("Added to cart"); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2 px-2.5 text-xs font-bold text-white transition-all hover:bg-zinc-700 active:scale-95 shadow"
            >
              <ShoppingCart size={13} /> Add to Cart
            </button>
            <button
              disabled={ordering}
              onClick={() => { void handleOrderNow(); }}
              className="flex items-center justify-center gap-1 rounded-xl border border-zinc-300 bg-white py-2 px-2.5 text-xs font-bold text-zinc-800 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50 shadow"
            >
              <Zap size={13} className="text-amber-500 fill-amber-500/20" /> {ordering ? "…" : "Buy"}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function LatestDropSection() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/products/latest-drops")
      .then((r) => r.json() as Promise<{ products?: Product[] }>)
      .then((json) => { if (active) setItems(json.products || []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="w-full py-16 md:py-24">
      {/* Editorial heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12 flex flex-col items-center text-center gap-4"
      >
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight text-zinc-100 leading-none">
          Latest Drop
        </h2>
        {/* Lime-green underline accent — matching reference */}
        <div className="h-1 w-32 rounded-full bg-[#b5f23d]" />
        <p className="max-w-sm text-sm text-zinc-400 leading-relaxed">
          Fresh kits. Just landed. Grab yours before they&apos;re gone.
        </p>
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">No new drops yet — check back soon.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.slice(0, 8).map((item, i) => (
            <DropCard key={item.id} product={item} index={i} />
          ))}
        </div>
      )}

      {/* View all */}
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-10 flex justify-center"
        >
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-zinc-200 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/40 hover:gap-3 active:scale-95"
          >
            View all drops <ArrowRight size={15} />
          </Link>
        </motion.div>
      )}
    </section>
  );
}
