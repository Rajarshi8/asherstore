import '@/lib/env-loader'
import { Query } from "node-appwrite";

import { createAdminDatabase } from "@/lib/appwrite-server";
import { products as demoProducts } from "@/lib/data";
import type { JerseySize, JerseyVersion, Product, Review } from "@/lib/types";
import {
  getReviewStatsForProduct,
  getReviewStatsForProducts,
  listReviewsForProduct,
} from "@/lib/appwrite-reviews";

const PRODUCT_CACHE_TTL_MS = 30_000;
const productQueryCache = new Map<string, { data: Product[]; expiresAt: number }>();

function getCachedProducts(key: string): Product[] | null {
  const entry = productQueryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    productQueryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedProducts(key: string, data: Product[]) {
  productQueryCache.set(key, { data, expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS });
}

function clearProductCache() {
  productQueryCache.clear();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductFilters {
  team?: string | null;
  version?: string | null;
  q?: string | null;
  min?: number | null;
  max?: number | null;
  bestSeller?: boolean | null;
  matchPick?: boolean | null;
}

export interface ProductUpsertInput {
  id: string;
  name: string;
  team: string;
  price: number;
  images: string[];
  version: JerseyVersion[];
  sizes: JerseySize[];
  description: string;
  rating: number;
  tags: string[];
  isMatchPick: boolean;
  isBestSeller: boolean;
  reviews: Review[];
}

const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const productsCollectionId = process.env.APPWRITE_COLLECTION_PRODUCTS_ID || "";

function mapProductDocument(doc: Record<string, unknown>): Product | null {
  if (!doc || typeof doc !== "object") return null;

  const id = typeof doc.$id === "string" ? doc.$id : typeof doc.id === "string" ? doc.id : "";
  if (!id) return null;

  const images = Array.isArray(doc.images) ? doc.images.filter((item): item is string => typeof item === "string") : [];
  const version = Array.isArray(doc.version)
    ? doc.version.filter((item): item is string => typeof item === "string") as JerseyVersion[]
    : [];
  const sizes = Array.isArray(doc.sizes) ? doc.sizes.filter((item): item is string => typeof item === "string") as JerseySize[] : [];
  const tags = Array.isArray(doc.tags) ? doc.tags.filter((item): item is string => typeof item === "string") : [];

  return {
    id,
    name: typeof doc.name === "string" ? doc.name : "",
    team: typeof doc.team === "string" ? doc.team : "",
    price: typeof doc.price === "number" ? doc.price : 0,
    images,
    version,
    sizes,
    description: typeof doc.description === "string" ? doc.description : "",
    rating: typeof doc.rating === "number" ? doc.rating : 1,
    reviewCount: typeof doc.reviewCount === "number" ? doc.reviewCount : 0,
    tags,
    isMatchPick: Boolean(doc.isMatchPick),
    isBestSeller: Boolean(doc.isBestSeller),
    reviews: [],
  };
}

function toRating(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value < 1) return 1;
  if (value > 5) return 5;
  return value;
}

// ---------------------------------------------------------------------------
// Demo product fallback
// ---------------------------------------------------------------------------

function listDemoProducts(limit = 200): Product[] {
  return demoProducts.slice(0, limit);
}

function getDemoProductById(productId: string): Product | null {
  return demoProducts.find((item) => item.id === productId) || null;
}

// ---------------------------------------------------------------------------
// Review stats enrichment
// ---------------------------------------------------------------------------

async function withGenuineReviewStats(products: Product[]): Promise<Product[]> {
  if (!products.length) return products;

  try {
    const statsMap = await getReviewStatsForProducts(products.map((item) => item.id));

    return products.map((product) => {
      const stats = statsMap.get(product.id);
      if (!stats) return product;
      return { ...product, rating: stats.averageRating, reviewCount: stats.reviewCount };
    });
  } catch {
    return products;
  }
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const team = filters.team || null;
  const version = filters.version?.toLowerCase().trim() || null;
  const q = filters.q?.toLowerCase().trim() || "";
  const min = typeof filters.min === "number" ? filters.min : null;
  const max = typeof filters.max === "number" ? filters.max : null;
  const bestSeller = filters.bestSeller ?? null;
  const matchPick = filters.matchPick ?? null;

  return products.filter((item) => {
    const matchesTeam = !team || item.team === team;
    const matchesVersion = !version || item.version.some((v) => v.toLowerCase() === version);
    const matchesMin = min === null || item.price >= min;
    const matchesMax = max === null || item.price <= max;
    const matchesQuery =
      !q || item.name.toLowerCase().includes(q) || item.team.toLowerCase().includes(q);
    const matchesBestSeller = bestSeller === null || item.isBestSeller === bestSeller;
    const matchesMatchPick = matchPick === null || item.isMatchPick === matchPick;

    return (
      matchesTeam &&
      matchesVersion &&
      matchesMin &&
      matchesMax &&
      matchesQuery &&
      matchesBestSeller &&
      matchesMatchPick
    );
  });
}

async function listProductDocuments(queries: unknown[] = [], limit = 200): Promise<Record<string, unknown>[]> {
  const db = createAdminDatabase();
  const queryParams = [...queries, Query.limit(limit)] as unknown[];
  const response = await db.listDocuments(databaseId, productsCollectionId, queryParams as unknown as string[]);
  return Array.isArray(response.documents) ? response.documents : [];
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export async function listProducts(limit = 200): Promise<Product[]> {
  const cacheKey = `all:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await listProductDocuments([Query.orderDesc("$createdAt")], limit);
    const products = await withGenuineReviewStats(rows.map(mapProductDocument).filter((item): item is Product => Boolean(item)));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    return [];
  }
}

export async function listBestSellers(limit = 12): Promise<Product[]> {
  const cacheKey = `bestSellers:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await listProductDocuments([Query.equal("isBestSeller", true), Query.orderDesc("$createdAt")], limit);
    const products = await withGenuineReviewStats(rows.map(mapProductDocument).filter((item): item is Product => Boolean(item)));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    return [];
  }
}

export async function listInternationalHomeKits(limit = 8): Promise<Product[]> {
  const cacheKey = `intlHomeKits:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await listProductDocuments([Query.equal("isBestSeller", true), Query.orderDesc("$createdAt")], limit);
    const products = await withGenuineReviewStats(rows.map(mapProductDocument).filter((item): item is Product => Boolean(item)));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    return [];
  }
}

export async function listMatchdayDeals(limit = 12): Promise<Product[]> {
  const cacheKey = `matchdayDeals:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await listProductDocuments([Query.equal("isMatchPick", true), Query.orderDesc("$createdAt")], limit);
    const products = await withGenuineReviewStats(rows.map(mapProductDocument).filter((item): item is Product => Boolean(item)));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    return [];
  }
}

export async function listLatestDrops(limit = 8): Promise<Product[]> {
  const cacheKey = `latestDrops:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await listProductDocuments([Query.equal("isMatchPick", true), Query.orderDesc("$createdAt")], limit);
    const products = await withGenuineReviewStats(rows.map(mapProductDocument).filter((item): item is Product => Boolean(item)));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    return [];
  }
}

export async function listProductsByTeam(team: string, limit = 200): Promise<Product[]> {
  if (!team.trim()) return [];

  const cacheKey = `team:${team.trim().toLowerCase()}:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await listProductDocuments([Query.equal("team", team), Query.orderDesc("$createdAt")], limit);
    const products = await withGenuineReviewStats(rows.map(mapProductDocument).filter((item): item is Product => Boolean(item)));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    return [];
  }
}

export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const db = createAdminDatabase();
    const row = await db.getDocument(databaseId, productsCollectionId, productId);
    const product = mapProductDocument(row as Record<string, unknown>);
    if (!product) return null;

    let rating = product.rating;
    let reviewCount = product.reviewCount || 0;
    let reviews: Review[] = [];

    try {
      const [stats, list] = await Promise.all([
        getReviewStatsForProduct(product.id),
        listReviewsForProduct(product.id, 100),
      ]);
      rating = stats.averageRating;
      reviewCount = stats.reviewCount;
      reviews = list;
    } catch {
      // Ignore reviews lookup failure gracefully
    }

    return { ...product, rating, reviewCount, reviews };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

export async function createProduct(input: ProductUpsertInput): Promise<Product> {
  const db = createAdminDatabase();
  const row = await db.createDocument(databaseId, productsCollectionId, input.id, {
    id: input.id,
    name: input.name,
    team: input.team,
    price: input.price,
    images: input.images,
    version: input.version,
    sizes: input.sizes,
    description: input.description,
    rating: toRating(input.rating),
    reviewCount: 0,
    tags: input.tags,
    isMatchPick: input.isMatchPick,
    isBestSeller: input.isBestSeller,
  });

  clearProductCache();
  const product = mapProductDocument(row as Record<string, unknown>);
  if (!product) throw new Error("Failed to map created product");
  return product;
}

export async function updateProduct(
  productId: string,
  patch: Partial<Omit<ProductUpsertInput, "id">>
): Promise<Product | null> {
  const current = await getProductById(productId);
  if (!current) return null;

  const db = createAdminDatabase();
  const row = await db.updateDocument(databaseId, productsCollectionId, productId, {
    ...(patch.name !== undefined && { name: patch.name }),
    ...(patch.team !== undefined && { team: patch.team }),
    ...(patch.price !== undefined && { price: patch.price }),
    ...(patch.images !== undefined && { images: patch.images }),
    ...(patch.version !== undefined && { version: patch.version }),
    ...(patch.sizes !== undefined && { sizes: patch.sizes }),
    ...(patch.description !== undefined && { description: patch.description }),
    ...(patch.rating !== undefined && { rating: toRating(patch.rating) }),
    ...(patch.tags !== undefined && { tags: patch.tags }),
    ...(patch.isMatchPick !== undefined && { isMatchPick: patch.isMatchPick }),
    ...(patch.isBestSeller !== undefined && { isBestSeller: patch.isBestSeller }),
  });

  clearProductCache();
  return mapProductDocument(row as Record<string, unknown>);
}

export async function deleteProduct(productId: string): Promise<boolean> {
  try {
    const db = createAdminDatabase();
    await db.deleteDocument(databaseId, productsCollectionId, productId);
    clearProductCache();
    return true;
  } catch {
    return false;
  }
}
