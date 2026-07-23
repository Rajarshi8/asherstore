"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Star, Zap } from "lucide-react";
import toast from "react-hot-toast";

import { JerseySize, Product } from "@/lib/types";
import { formatINR, resolveProductImageSrc } from "@/lib/utils";
import { useShopStore } from "@/store/useShopStore";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<JerseySize>("M");
  const [pincode, setPincode] = useState("560001");
  const [eta, setEta] = useState<string>("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const addToCart = useShopStore((state) => state.addToCart);
  const addRecentlyViewed = useShopStore((state) => state.addRecentlyViewed);
  const user = useShopStore((state) => state.user);

  function formatVersionLabel(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (normalized === "sublimation") return "Sublimation";
    if (normalized === "master") return "Master";
    if (normalized === "player") return "Player";
    if (normalized === "special-edition" || normalized === "special edition" || normalized === "special edition version") {
      return "Special Edition";
    }
    if (normalized === "clearance" || normalized === "clearance stock") return "Clearance Stock";
    return "Fan";
  }

  const storyByTeam: Record<string, string> = {
    "Real Madrid": "White nights. Big games. This one belongs under floodlights.",
    Barcelona: "Built for quick feet and loud nights at Camp Nou.",
    "Manchester City": "Clean lines, sharp details, and a look made for statement wins.",
    Arsenal: "Classic red. North London attitude. No explanation needed.",
    "AC Milan": "Retro soul with modern comfort. Old glory, worn your way.",
    PSG: "Paris edge, matchday comfort, and just the right amount of swagger."
  };

  useEffect(() => {
    async function loadProduct() {
      const res = await fetch(`/api/products/${params.id}`);
      const json = (await res.json()) as { product?: Product };
      if (json.product) {
        setProduct(json.product);
        setSize(json.product.sizes[0] || "M");
        addRecentlyViewed(json.product.id);
      }
    }

    loadProduct();
  }, [addRecentlyViewed, params.id]);

  async function checkETA() {
    const res = await fetch("/api/eta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pincode })
    });
    const json = (await res.json()) as { etaDays?: number };
    if (json.etaDays) {
      setEta(`${json.etaDays} days`);
    }
  }

  async function submitReview() {
    if (!product) return;
    if (!user) {
      toast.error("Please log in to submit a review");
      return;
    }

    const comment = reviewComment.trim();
    if (comment.length < 3) {
      toast.error("Review comment must be at least 3 characters");
      return;
    }

    setReviewSubmitting(true);

    const res = await fetch(`/api/products/${product.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment,
        rating: reviewRating,
      }),
    });

    const json = (await res.json()) as {
      error?: string;
      averageRating?: number;
      reviewCount?: number;
      reviews?: Product["reviews"];
    };

    setReviewSubmitting(false);

    if (!res.ok) {
      toast.error(json.error || "Failed to submit review");
      return;
    }

    setProduct((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        rating: typeof json.averageRating === "number" ? json.averageRating : prev.rating,
        reviewCount: typeof json.reviewCount === "number" ? json.reviewCount : prev.reviewCount,
        reviews: Array.isArray(json.reviews) ? json.reviews : prev.reviews,
      };
    });

    setReviewComment("");
    setReviewRating(5);
    toast.success("Review submitted");
  }

  if (!product) {
    return <div className="mx-auto w-full max-w-7xl px-4 py-10 text-zinc-400">Loading product...</div>;
  }

  const currentImageSrc = resolveProductImageSrc(product.images[selectedImageIndex] || product.images[0]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 md:grid-cols-2 md:px-6">
      {/* Product Image Gallery - Full uncropped jersey view */}
      <div className="space-y-4">
        {/* Main Hero Product Image Canvas */}
        <div className="relative aspect-[4/5] sm:aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 via-[#101217] to-zinc-950 p-4 md:p-6 flex items-center justify-center shadow-2xl">
          {/* Subtle Ambient Studio Glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08),transparent_70%)]" />
          
          <Image
            src={currentImageSrc}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-2 transition-transform duration-500 drop-shadow-[0_16px_32px_rgba(0,0,0,0.8)]"
          />

          {/* Floating Version Tag */}
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-extrabold tracking-wider text-zinc-200 uppercase shadow-md">
              {product.version[0] ? formatVersionLabel(product.version[0]) : "Official Kit"}
            </span>
          </div>
        </div>

        {/* Thumbnail Selector Gallery */}
        {product.images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {product.images.map((image, idx) => {
              const isSelected = idx === selectedImageIndex;
              return (
                <button
                  key={image + idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border transition-all ${
                    isSelected
                      ? "border-cyan-400 ring-2 ring-cyan-400/30 bg-zinc-900 shadow-md"
                      : "border-white/10 bg-zinc-950/80 hover:border-white/30"
                  }`}
                >
                  <Image
                    src={resolveProductImageSrc(image)}
                    alt={`${product.name} view ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{product.team}</p>
          <h1 className="mt-2 text-5xl leading-tight text-zinc-100">{product.name.replace(" Jersey", "")}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-amber-300">
            <Star size={15} className="fill-amber-300" /> Rated {product.rating.toFixed(1)} ({product.reviewCount ?? 0})
          </p>
          <p className="mt-3 text-3xl font-semibold text-zinc-100">{formatINR(product.price)}</p>
          <p className="mt-3 text-base text-zinc-300">{storyByTeam[product.team] || product.description}</p>
          <p className="mt-2 text-sm text-zinc-400">Category: {product.version.map(formatVersionLabel).join(" · ")}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Choose your fit</p>
          <div className="flex gap-2">
            {product.sizes.map((item) => (
              <button
                key={item}
                onClick={() => setSize(item)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  size === item
                    ? "border-cyan-300 bg-cyan-300/10 text-cyan-200"
                    : "border-white/15 text-zinc-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="rounded-lg bg-cyan-400 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-300"
            onClick={() => {
              addToCart({ productId: product.id, size, qty: 1 });
              toast.success("Added to cart");
            }}
          >
            Add to Cart
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-400/10 px-6 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20 hover:border-cyan-400/70 disabled:opacity-60"
            disabled={ordering}
            onClick={async () => {
              if (!user) {
                toast.error("Please log in to place an order");
                return;
              }
              setOrdering(true);
              try {
                const image = resolveProductImageSrc(product.images[0]);
                const imageUrl = image.startsWith("/") ? `${window.location.origin}${image}` : image;

                const res = await fetch("/api/orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    items: [{ productId: product.id, name: product.name, size, qty: 1, price: product.price }],
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
                  `- ${product.name} (${product.id}) | Size ${size} | Qty 1 | ${formatINR(product.price)}`,
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
            }}
          >
            <Zap size={16} /> {ordering ? "Placing..." : "Buy Now"}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Delivery check</p>
          <div className="mt-2 flex gap-2">
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-40 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <button onClick={checkETA} className="rounded-lg border border-white/20 px-3 py-2 text-sm">
              Check ETA
            </button>
          </div>
          {eta ? <p className="mt-2 text-sm text-zinc-300">{eta}</p> : null}
        </div>

        <div className="space-y-2 rounded-xl border border-white/10 bg-zinc-900/60 p-4">
          <p className="text-sm font-semibold text-zinc-200">Fan Notes</p>
          <div className="space-y-2 rounded-lg border border-white/10 bg-zinc-950/60 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Write a review</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setReviewRating(item)}
                  className="text-amber-300"
                  aria-label={`Rate ${item} stars`}
                >
                  <Star size={16} className={item <= reviewRating ? "fill-amber-300" : ""} />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your jersey fit and quality experience"
              className="min-h-20 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <button
              type="button"
              disabled={reviewSubmitting}
              onClick={submitReview}
              className="rounded-lg border border-cyan-300/30 px-3 py-2 text-sm text-cyan-200 disabled:opacity-50"
            >
              {reviewSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
          {product.reviews.length ? (
            product.reviews.map((review) => (
              <div key={review.user + review.createdAt} className="border-t border-white/10 pt-2 text-sm">
                <p className="flex items-center gap-2 text-zinc-200">
                  {review.user}
                  <span className="text-amber-300">{review.rating.toFixed(1)}★</span>
                </p>
                <p className="text-zinc-400">{review.comment}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
