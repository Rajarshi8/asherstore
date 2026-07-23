"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ProductCard } from "@/components/ui/ProductCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Product } from "@/lib/types";

type VersionKey = "sublimation" | "master" | "fan" | "player" | "special-edition" | "clearance" | "kids-kit";

const jerseyCategories: Array<{ label: string; version: string }> = [
  { label: "All Jerseys", version: "" },
  { label: "Sublimation", version: "sublimation" },
  { label: "Master", version: "master" },
  { label: "Fan", version: "fan" },
  { label: "Player", version: "player" },
  { label: "Special Edition", version: "special-edition" },
  { label: "Clearance Stock", version: "clearance" },
  { label: "Kids Kit", version: "kids-kit" },
];

const versionSections: Array<{ key: VersionKey; label: string; description: string }> = [
  { key: "sublimation", label: "Sublimation", description: "Breathable and lightweight picks for all-day comfort." },
  { key: "master", label: "Master", description: "Premium finish and elevated detailing for collectors." },
  { key: "fan", label: "Fan", description: "Supporter-first fit made for everyday matchday energy." },
  { key: "player", label: "Player", description: "Performance-inspired cut and technical on-pitch feel." },
  { key: "special-edition", label: "Special Edition", description: "Limited drops and exclusive designs for serious collectors." },
  { key: "clearance", label: "Clearance Stock", description: "Last chance picks at reduced prices." },
  { key: "kids-kit", label: "Kids Kit", description: "Junior-sized kits for young fans and little supporters." },
];

const versionLabelMap: Record<VersionKey, string> = {
  sublimation: "Sublimation",
  master: "Master",
  fan: "Fan",
  player: "Player",
  "special-edition": "Special Edition",
  clearance: "Clearance Stock",
  "kids-kit": "Kids Kit",
};

function toVersionKey(value: string): VersionKey {
  const normalized = value.trim().toLowerCase();
  if (normalized === "sublimation") return "sublimation";
  if (normalized === "master") return "master";
  if (normalized === "player") return "player";
  if (
    normalized === "special-edition" ||
    normalized === "special edition" ||
    normalized === "special edition version"
  ) {
    return "special-edition";
  }
  if (normalized === "clearance" || normalized === "clearance stock") return "clearance";
  if (normalized === "kids-kit" || normalized === "kids kit") return "kids-kit";
  return "fan";
}

interface FilterState {
  team: string;
  version: string;
  q: string;
}

function normalizeVersionParam(value: string): string {
  const normalized = value.trim().toLowerCase();
  const allowedVersions = ["all", "sublimation", "master", "fan", "player", "special-edition", "clearance", "kids-kit"];
  return allowedVersions.includes(normalized) ? normalized : "";
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Product[]>([]);
  const [matchPicks, setMatchPicks] = useState<Product[]>([]);
  const [bestSelling, setBestSelling] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    team: "",
    version: "",
    q: ""
  });

  useEffect(() => {
    const version = searchParams.get("version")?.trim().toLowerCase() || "";
    const nextVersion = normalizeVersionParam(version);

    setFilters((prev) => ({
      ...prev,
      version: nextVersion,
    }));
  }, [searchParams]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.team) params.set("team", filters.team);
    if (filters.version && filters.version !== "all") params.set("version", filters.version);
    if (filters.q) params.set("q", filters.q);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      const res = await fetch(`/api/products?${query}`, { cache: "no-store" });
      const json = (await res.json()) as { products: Product[] };
      setItems(json.products || []);
      setLoading(false);
    }

    loadProducts();
  }, [query]);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { products?: Product[] }) => {
        const source = json.products || [];
        setMatchPicks(source.filter((item) => item.isMatchPick !== false).slice(0, 4));
        setBestSelling(
          [...source]
            .sort((a, b) => {
              const aSalesScore = (a.reviewCount || 0) * (a.rating || 0);
              const bSalesScore = (b.reviewCount || 0) * (b.rating || 0);
              return bSalesScore - aSalesScore;
            })
            .slice(0, 4)
        );
      })
      .catch(() => {});
  }, []);

  const groupedItems = useMemo(() => {
    const grouped: Record<VersionKey, Product[]> = {
      sublimation: [],
      master: [],
      fan: [],
      player: [],
      "special-edition": [],
      clearance: [],
      "kids-kit": [],
    };

    for (const item of items) {
      for (const v of item.version) {
        const key = toVersionKey(v);
        if (!grouped[key].some((p) => p.id === item.id)) {
          grouped[key].push(item);
        }
      }
    }

    return grouped;
  }, [items]);

  const isCategoryView = Boolean(filters.version);
  const selectedVersionLabel = filters.version
    ? filters.version === "all"
      ? "All Versions"
      : versionLabelMap[toVersionKey(filters.version)]
    : "";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      {!isCategoryView && matchPicks.length > 0 && (
        <section className="space-y-5">
          <SectionTitle
            eyebrow="Match Picks"
            title="This week on the rack"
            subtitle="A focused drop. No clutter. Just kits worth wearing."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {matchPicks.map((item, index) => (
              <ProductCard
                key={item.id}
                product={item}
                imageLoading={index === 0 ? "eager" : "lazy"}
              />
            ))}
          </div>
        </section>
      )}

      {!isCategoryView && bestSelling.length > 0 && (
        <section className="space-y-5">
          <SectionTitle
            eyebrow="Best Selling"
            title="Top sellers right now"
            subtitle="Most-loved jerseys based on buyer momentum and ratings."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {bestSelling.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <SectionTitle
          eyebrow={isCategoryView ? "Category" : "All Products"}
          title={isCategoryView ? `${selectedVersionLabel} jerseys` : "All jerseys"}
          subtitle={
            isCategoryView
              ? `Showing only ${selectedVersionLabel.toLowerCase()} jerseys.`
              : "Explore every available jersey, organized by category."
          }
        />

        {loading ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => <SkeletonCard key={idx} />)}
          </div>
        ) : filters.version ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {versionSections.map((section) => {
              const sectionItems = groupedItems[section.key];
              if (!sectionItems.length) return null;

              return (
                <section key={section.key} id={`version-${section.key}`} className="space-y-3">
                  <div>
                    <h2 className="text-xl text-zinc-100">{section.label}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{section.description}</p>
                  </div>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {sectionItems.map((item) => (
                      <ProductCard key={item.id} product={item} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
