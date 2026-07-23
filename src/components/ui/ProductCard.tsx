"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Star, Zap } from "lucide-react";
import toast from "react-hot-toast";

import { Product } from "@/lib/types";
import { formatINR, resolveProductImageSrc } from "@/lib/utils";
import { useShopStore } from "@/store/useShopStore";

interface ProductCardProps {
  product: Product;
  imageLoading?: "lazy" | "eager";
}

function formatVersionLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "sublimation") return "Sublimation";
  if (normalized === "master") return "Master Edition";
  if (normalized === "player") return "Player Edition";
  if (normalized === "special-edition" || normalized === "special edition" || normalized === "special edition version") {
    return "Special Drop";
  }
  if (normalized === "clearance" || normalized === "clearance stock") return "Clearance";
  if (normalized === "kids-kit" || normalized === "kids kit") return "Kids Kit";
  return "Fan Edition";
}

export function ProductCard({ product, imageLoading = "lazy" }: ProductCardProps) {
  const [ordering, setOrdering] = useState(false);
  const addToCart = useShopStore((state) => state.addToCart);
  const user = useShopStore((state) => state.user);
  const wishlist = useShopStore((state) => state.wishlist);
  const setWishlist = useShopStore((state) => state.setWishlist);

  const wished = wishlist.includes(product.id);
  const shortName = product.name.replace(" Jersey", "");

  async function handleOrderNow() {
    if (!user) {
      toast.error("Please log in to place an order");
      return;
    }

    setOrdering(true);
    try {
      const image = resolveProductImageSrc(product.images[0]);
      const imageUrl = image.startsWith("/") ? `${window.location.origin}${image}` : image;
      const item = {
        productId: product.id,
        name: product.name,
        size: "M",
        qty: 1,
        price: product.price,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [item],
          total: product.price,
          currency: "INR",
        }),
      });

      const json = (await res.json()) as { error?: string; order?: { id: string } };

      if (!res.ok || !json.order?.id) {
        throw new Error(json.error || "Could not place order");
      }

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

      const whatsappText = encodeURIComponent(lines.join("\n"));
      window.open(`https://wa.me/917980918650?text=${whatsappText}`, "_blank", "noopener,noreferrer");
      toast.success("Order placed! WhatsApp message prepared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to place order");
    } finally {
      setOrdering(false);
    }
  }

  async function handleWishlistToggle() {
    const previousWishlist = wishlist;
    const nextWished = !wished;
    const nextWishlist = nextWished
      ? [...wishlist, product.id]
      : wishlist.filter((id) => id !== product.id);

    setWishlist(nextWishlist);

    if (!user) {
      toast("Sign in to sync wishlist");
      return;
    }

    try {
      const res = await fetch("/api/profile/wishlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, wished: nextWished }),
      });

      const json = (await res.json()) as { productIds?: string[]; error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Failed to update wishlist");
      }

      setWishlist(json.productIds || nextWishlist);
    } catch (error) {
      setWishlist(previousWishlist);
      toast.error(error instanceof Error ? error.message : "Failed to update wishlist");
    }
  }

  const primaryVersion = product.version[0] ? formatVersionLabel(product.version[0]) : "Official Kit";

  return (
    <motion.article
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e12] transition-all duration-300 hover:border-white/25 hover:shadow-[0_12px_32px_rgba(0,0,0,0.8)]"
    >
      {/* Top Image Container */}
      <div className="relative aspect-[4/4] w-full overflow-hidden bg-gradient-to-b from-zinc-900/80 via-[#101217] to-[#0d0e12] p-3 flex items-center justify-center">
        {/* Soft Ambient Radial Backlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.07),transparent_70%)]" />

        {/* Floating Top Left Badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider text-zinc-200 uppercase shadow-sm">
            {primaryVersion}
          </span>
        </div>

        {/* Floating Top Right Wishlist Button */}
        <button
          className="absolute top-2.5 right-2.5 z-10 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/50 backdrop-blur-md text-zinc-300 transition-all hover:bg-black/80 hover:text-rose-400 hover:scale-110 active:scale-95"
          onClick={() => { void handleWishlistToggle(); }}
          aria-label="Toggle wishlist"
        >
          <Heart size={13} className={wished ? "fill-rose-500 text-rose-500" : ""} />
        </button>

        {/* Uncropped Full Jersey Image */}
        <Link href={`/products/${product.id}`} className="relative h-full w-full block flex items-center justify-center">
          <Image
            src={resolveProductImageSrc(product.images[0])}
            alt={product.name}
            fill
            loading={imageLoading}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-1.5 transition-transform duration-500 group-hover:scale-105 drop-shadow-[0_10px_20px_rgba(0,0,0,0.65)]"
          />
        </Link>
      </div>

      {/* Card Details & CTAs */}
      <div className="flex flex-1 flex-col justify-between p-3.5 space-y-3 bg-[#0d0e12]">
        <div className="space-y-1">
          {/* Team Tag */}
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            {product.team}
          </p>

          {/* Product Title */}
          <Link href={`/products/${product.id}`} className="block group-hover:text-white transition-colors">
            <h3 className="line-clamp-1 text-sm font-bold text-zinc-100 tracking-tight">
              {shortName}
            </h3>
          </Link>
        </div>

        {/* Price & Rating Row */}
        <div className="space-y-2.5 pt-0.5">
          <div className="flex items-center justify-between">
            <p className="text-base font-black text-white tracking-tight">
              {formatINR(product.price)}
            </p>

            <div className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              <Star size={10} className="fill-amber-300 text-amber-300" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Sleek Dual Action Buttons */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2 px-2.5 text-xs font-bold text-black transition-all hover:bg-zinc-200 active:scale-95 shadow-md"
              onClick={() => {
                addToCart({ productId: product.id, size: "M", qty: 1 });
                toast.success("Added to cart");
              }}
            >
              <ShoppingCart size={13} /> Add to Cart
            </button>

            <button
              className="flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 py-2 px-2.5 text-xs font-bold text-zinc-200 transition-all hover:bg-white/10 hover:border-white/30 active:scale-95 disabled:opacity-50"
              disabled={ordering}
              onClick={() => { void handleOrderNow(); }}
            >
              <Zap size={13} className="text-amber-400 fill-amber-400/20" /> {ordering ? "..." : "Buy"}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
