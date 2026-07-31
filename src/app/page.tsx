"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Truck } from "lucide-react";

import { SizePredictor } from "@/components/ui/SizePredictor";
import { FAQSection } from "@/components/ui/FAQSection";
import { ProductCard } from "@/components/ui/ProductCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { HeroSection } from "@/components/hero/HeroSection";
import { LatestDropSection } from "@/components/ui/LatestDropSection";
import { InternationalKitsSection } from "@/components/ui/InternationalKitsSection";
import { FeaturedCategorySection } from "@/components/ui/FeaturedCategorySection";
import { ClearanceSaleSection } from "@/components/ui/ClearanceSaleSection";
import { BrandStorySection } from "@/components/ui/BrandStorySection";
import { TrustStripSection } from "@/components/ui/TrustStripSection";
import { SuperiorLineSection } from "@/components/ui/SuperiorLineSection";
import type { Product } from "@/lib/types";

function ProductStrip({ title, icon, href, apiUrl, emptyMessage }: {
  title: string;
  icon: React.ReactNode;
  href: string;
  apiUrl: string;
  emptyMessage: string;
}) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(apiUrl)
      .then((res) => res.json() as Promise<{ products?: Product[] }>)
      .then((json) => { if (active) setItems(json.products || []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiUrl]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-2xl font-semibold text-zinc-100">{title}</h2>
        </div>
        <Link
          href={href}
          className="flex items-center gap-1 text-sm text-rose-400 hover:text-rose-300"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyMessage}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.slice(0, 4).map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex w-full flex-col">
      {/* Hero */}
      <HeroSection />

      {/* Latest Drop — padded container */}
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 md:px-6">
        <LatestDropSection />
      </div>

      {/* Full-bleed: Best of International Home Kits */}
      <InternationalKitsSection />

      {/* Full-bleed: Featured Category */}
      <FeaturedCategorySection />

      {/* Full-bleed: Clearance Sale */}
      <ClearanceSaleSection />

      {/* Full-bleed: Brand Story */}
      <BrandStorySection />

      {/* Full-bleed: Trust strip + count-up stats */}
      <TrustStripSection />

      {/* Full-bleed: Superior Product Line ticker */}
      <SuperiorLineSection />

      {/* Remaining content — padded container */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 px-4 pt-12 pb-8 md:px-6 md:pt-16 md:pb-12">

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2 }}
        className="grid gap-5 md:grid-cols-2"
      >
        <SizePredictor />
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-rose-400">Before You Buy</p>
          <h3 className="mt-2 text-3xl leading-tight text-zinc-100">Know your fit. Check your delivery. Then go.</h3>
          <ul className="mt-4 space-y-3 text-sm text-zinc-300">
            <li>In-stock kits leave fast.</li>
            <li>Clear ETA before you pay.</li>
          </ul>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.25 }}
      >
        <FAQSection />
      </motion.div>
      </div>
    </div>
  );
}

