"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type JerseySize = "S" | "M" | "L" | "XL" | "XXL" | "XXXL";
type ProductVersion = "sublimation" | "master" | "fan" | "player" | "special-edition" | "clearance" | "kids-kit";

interface Product {
  id: string;
  name: string;
  team: string;
  price: number;
  images: string[];
  version: ProductVersion;
  sizes: JerseySize[];
  description: string;
  rating: number;
  tags: string[];
  isMatchPick: boolean;
  isBestSeller: boolean;
}

import { OrderFulfillmentCard } from "@/components/admin/OrderFulfillmentCard";
import type { ProductionOrder } from "@/types/order";
import type { ProductionShipment } from "@/types/shipment";
import { resolveProductImageSrc } from "@/lib/utils";

type Order = ProductionOrder;
type AppShipment = ProductionShipment;



interface Analytics {
  totalOrders: number;
  revenue: number;
  delivered: number;
  processing: number;
  totalProducts: number;
  topProducts: Array<{ productId: string; name: string; qty: number }>;
}

type ProductPayload = {
  name: string;
  team: string;
  price: number;
  images: string[];
  version: ProductVersion[];
  sizes: JerseySize[];
  description: string;
  isMatchPick: boolean;
  isBestSeller: boolean;
};

function normalizeVersion(value: string): ProductVersion {
  const normalized = value.trim().toLowerCase();
  if (normalized === "sublimation") return "sublimation";
  if (normalized === "master") return "master";
  if (normalized === "player") return "player";
  if (normalized === "fan") return "fan";
  if (normalized === "special-edition" || normalized === "special edition" || normalized === "special edition version") {
    return "special-edition";
  }
  if (normalized === "clearance" || normalized === "clearance stock") return "clearance";
  if (normalized === "kids-kit" || normalized === "kids kit") return "kids-kit";
  if (normalized === "kids-kit" || normalized === "kids kit") return "kids-kit";
  return "fan";
}

function toPayloadVersion(value: ProductVersion | string): ProductVersion {
  return normalizeVersion(value);
}

function buildProductImageUrl(fileId: string): string {
  return `/api/images/${encodeURIComponent(fileId)}`;
}

function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

function validateProductPayload(payload: ProductPayload): string[] {
  const errors: string[] = [];

  if (!payload.name.trim()) errors.push("name is required");
  if (!payload.team.trim()) errors.push("team is required");
  if (!payload.description.trim()) errors.push("description is required");
  if (!Number.isInteger(payload.price) || payload.price <= 0) errors.push("price must be a positive integer");
  if (!Array.isArray(payload.version) || payload.version.length === 0) {
    errors.push("at least one category must be selected");
  }
  if (payload.version.some((v) => !["sublimation", "master", "fan", "player", "special-edition", "clearance", "kids-kit"].includes(v))) {
    errors.push("version must be sublimation, master, fan, player, special-edition, clearance, or kids-kit");
  }
  if (!Array.isArray(payload.sizes) || payload.sizes.length === 0) {
    errors.push("sizes must be a non-empty array");
  }
  if (!Array.isArray(payload.images) || payload.images.length === 0) {
    errors.push("images must contain at least one fileId");
  }
  if (payload.images.some((image) => !image || image.includes("/") || image.includes("http"))) {
    errors.push("images must contain valid fileId values only");
  }

  const hasUndefinedOrNull = Object.values(payload).some((value) => value === undefined || value === null);
  if (hasUndefinedOrNull) errors.push("payload contains undefined or null values");

  return errors;
}

const defaultProductForm = {
  name: "",
  team: "",
  price: 3999,
  version: ["sublimation"] as ProductVersion[],
  sizes: ["S", "M", "L", "XL"] as JerseySize[],
  description: "",
  images: [] as string[],
  isMatchPick: true,
  isBestSeller: false
};

export default function AdminPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [form, setForm] = useState(defaultProductForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [productSearch, setProductSearch] = useState("");

  const [shipmentsMap, setShipmentsMap] = useState<Record<string, AppShipment>>({});

  async function loadAll() {
    const [productsRes, ordersRes, analyticsRes] = await Promise.all([
      fetch("/api/admin/products", { cache: "no-store" }),
      fetch("/api/admin/orders", { cache: "no-store" }),
      fetch("/api/admin/analytics", { cache: "no-store" })
    ]);

    const productsJson = (await productsRes.json()) as { products: Product[] };
    const ordersJson = (await ordersRes.json()) as { orders: Order[]; shipments?: Record<string, AppShipment> };
    const analyticsJson = (await analyticsRes.json()) as Analytics;

    setProducts(productsJson.products || []);
    setOrders(ordersJson.orders || []);
    setShipmentsMap(ordersJson.shipments || {});
    setAnalytics(analyticsJson);
  }


  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json()) as {
          user?: { role: "user" | "admin" };
          error?: string;
        };

        if (!res.ok || !json.user) {
          setLoginRequired(true);
          setAuthChecked(true);
          return;
        }

        if (json.user.role !== "admin") {
          toast.error("Admin access required");
          router.replace("/dashboard");
          return;
        }

        await loadAll();
      } finally {
        if (active) {
          setAuthChecked(true);
        }
      }
    }

    void boot();

    return () => {
      active = false;
    };
  }, [router]);

  function toggleSize(size: JerseySize) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((item) => item !== size)
        : [...prev.sizes, size]
    }));
  }

  function toggleVersion(v: ProductVersion) {
    setForm((prev) => ({
      ...prev,
      version: prev.version.includes(v)
        ? prev.version.filter((item) => item !== v)
        : [...prev.version, v],
    }));
  }

  function startEdit(item: Product) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      team: item.team,
      price: item.price,
      version: Array.isArray(item.version) ? item.version.map(normalizeVersion) : [normalizeVersion(String(item.version))],
      sizes: item.sizes.filter((size): size is JerseySize => ["S", "M", "L", "XL", "XXL", "XXXL"].includes(size)),
      description: item.description,
      images: item.images,
      isMatchPick: item.isMatchPick,
      isBestSeller: item.isBestSeller
    });

    setImagePreviews(
      Object.fromEntries(
        item.images.map((image) => [image, isLikelyUrl(image) ? image : buildProductImageUrl(image)])
      )
    );
  }

  function clearForm() {
    setEditingId(null);
    setForm(defaultProductForm);
    setImagePreviews({});
  }

  async function uploadImage(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: fd
    });

    const json = (await res.json()) as { fileId?: string; url?: string; error?: string };
    setUploading(false);

    if (!res.ok || !json.fileId) {
      toast.error(json.error || "Image upload failed");
      return;
    }

    setForm((prev) => ({ ...prev, images: [...prev.images, json.fileId as string] }));
    setImagePreviews((prev) => ({
      ...prev,
      [json.fileId as string]: json.url || buildProductImageUrl(json.fileId as string)
    }));
    toast.success("Image uploaded");
  }

  async function saveProduct() {
    setSaving(true);

    const payload: ProductPayload = {
      name: form.name.trim(),
      team: form.team.trim(),
      price: Number(form.price),
      images: Array.from(new Set(form.images.map((image) => image.trim()).filter(Boolean))),
      version: Array.from(new Set(form.version)),
      sizes: Array.from(new Set(form.sizes)).filter((size): size is JerseySize => ["S", "M", "L", "XL", "XXL", "XXXL"].includes(size)),
      description: form.description.trim(),
      isMatchPick: Boolean(form.isMatchPick),
      isBestSeller: Boolean(form.isBestSeller)
    };

    const validationErrors = validateProductPayload(payload);
    if (validationErrors.length) {
      toast.error(validationErrors[0]);
      setSaving(false);
      return;
    }

    console.info("[admin] product payload", payload);

    const endpoint = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = (await res.json()) as {
      error?: string;
      issues?: string[];
      failingField?: string;
      details?: unknown;
    };

    if (!res.ok) {
      if (json.issues?.length) {
        toast.error(json.issues[0]);
      } else if (json.failingField) {
        toast.error(`${json.error || "Failed to save product"} (${json.failingField})`);
      } else {
        toast.error(json.error || "Failed to save product");
      }
      if (json.details) {
        console.error("[admin] product save failed", json.details);
      }
      setSaving(false);
      return;
    }

    toast.success(editingId ? "Product updated" : "Product added");
    clearForm();
    await loadAll();
    setSaving(false);
  }

  async function deleteProduct(id: string) {
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const json = (await res.json()) as { error?: string };

    if (!res.ok) {
      toast.error(json.error || "Delete failed");
      return;
    }

    toast.success("Product deleted");
    await loadAll();
  }

  async function updateOrderStatus(orderId: string, shipmentStatus: Order["shipmentStatus"]) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipmentStatus })
    });


    const json = (await res.json()) as { error?: string };

    if (!res.ok) {
      toast.error(json.error || "Status update failed");
      return;
    }

    toast.success("Order status updated");
    await loadAll();
  }

  if (!authChecked) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
          <p className="text-sm text-zinc-300">Checking admin access...</p>
        </section>
      </div>
    );
  }

  if (loginRequired) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <section className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-zinc-900/70 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-rose-400/30 bg-rose-400/10 text-3xl">
            🔒
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-zinc-100">Login Required</h2>
            <p className="mt-2 text-sm text-zinc-400">
              You must be logged in to access the Admin panel.
            </p>
          </div>
          <button
            onClick={() => router.push("/login?next=/admin")}
            className="rounded-lg bg-cyan-400 px-6 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300"
          >
            Go to Login
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 md:px-6">
      <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
        <h1 className="text-4xl text-zinc-100">Admin Control Center</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Manage catalog, inventory, orders, and sales performance.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Revenue" value={`Rs ${analytics?.revenue || 0}`} />
        <StatCard label="Orders" value={String(analytics?.totalOrders || 0)} />
        <StatCard label="Delivered" value={String(analytics?.delivered || 0)} />
        <StatCard label="Active Orders" value={String(analytics?.processing || 0)} />
        <StatCard label="Products" value={String(analytics?.totalProducts || 0)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
          <h2 className="text-2xl text-zinc-100">{editingId ? "Edit Product" : "Add Product"}</h2>

          <div className="grid gap-3 text-sm">
            <input
              placeholder="Product name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Team"
                value={form.team}
                onChange={(e) => setForm((prev) => ({ ...prev, team: e.target.value }))}
                className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
              />
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-400">Categories</p>
              <div className="flex flex-wrap gap-2">
                {(["sublimation", "master", "fan", "player", "special-edition", "clearance", "kids-kit"] as ProductVersion[]).map((v) => {
                  const label: Record<ProductVersion, string> = {
                    sublimation: "Sublimation",
                    master: "Master",
                    fan: "Fan",
                    player: "Player",
                    "special-edition": "Special Edition",
                    clearance: "Clearance Stock",
                    "kids-kit": "Kids Kit",
                  };
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleVersion(v)}
                      className={`rounded-lg border px-3 py-1 text-xs ${
                        form.version.includes(v)
                          ? "border-cyan-300 bg-cyan-300/10 text-cyan-200"
                          : "border-white/15 text-zinc-300"
                      }`}
                    >
                      {label[v]}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="min-h-24 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
            />

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-400">Inventory Sizes</p>
              <div className="flex gap-2">
                {(["S", "M", "L", "XL", "XXL", "XXXL"] as JerseySize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`rounded-lg border px-3 py-1 ${
                      form.sizes.includes(size)
                        ? "border-cyan-300 bg-cyan-300/10 text-cyan-200"
                        : "border-white/15 text-zinc-300"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.isMatchPick}
                onChange={(e) => setForm((prev) => ({ ...prev, isMatchPick: e.target.checked }))}
              />
              Show in Match Picks section
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.isBestSeller}
                onChange={(e) => setForm((prev) => ({ ...prev, isBestSeller: e.target.checked }))}
              />
              Mark as Best Seller
            </label>

            <div className="space-y-2 rounded-lg border border-white/10 bg-zinc-950/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Product Images</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />
              {uploading ? <p className="text-xs text-zinc-400">Uploading...</p> : null}
              <div className="flex flex-wrap gap-2">
                {form.images.map((img) => (
                  <div key={img} className="relative h-12 w-12">
                    <Image
                      src={imagePreviews[img] || (isLikelyUrl(img) ? img : buildProductImageUrl(img))}
                      alt="preview"
                      fill
                      sizes="48px"
                      className="rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, images: prev.images.filter((x) => x !== img) }));
                        setImagePreviews((prev) => {
                          const next = { ...prev };
                          delete next[img];
                          return next;
                        });
                      }}
                      className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1 text-[10px]"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveProduct}
                disabled={saving}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950"
              >
                {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
              </button>
              {editingId ? (
                <button type="button" onClick={clearForm} className="rounded-lg border border-white/15 px-4 py-2 text-sm">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-xl text-zinc-100">Products</h2>
              <p className="text-xs text-zinc-400">Add / Edit / Delete + Inventory</p>
            </div>
            <div className="border-b border-white/10 px-4 py-2">
              <input
                type="search"
                placeholder="Search by name, team, or category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-400/50"
              />
            </div>
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/80 text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3">Categories</th>
                    <th className="px-4 py-3">Match Pick</th>
                    <th className="px-4 py-3">Best Seller</th>
                    <th className="px-4 py-3">Sizes</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter((item) => {
                    const q = productSearch.toLowerCase();
                    if (!q) return true;
                    const cats = (Array.isArray(item.version) ? item.version : [item.version]).join(" ");
                    return (
                      item.name.toLowerCase().includes(q) ||
                      item.team.toLowerCase().includes(q) ||
                      cats.toLowerCase().includes(q)
                    );
                  }).map((item) => (
                    <tr key={item.id} className="border-t border-white/10 text-zinc-300">
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.team}</td>
                      <td className="px-4 py-3">{(Array.isArray(item.version) ? item.version : [item.version]).join(", ")}</td>
                      <td className="px-4 py-3">{item.isMatchPick ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{item.isBestSeller ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{item.sizes.join(", ")}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(item)} className="rounded border border-cyan-300/30 px-2 py-1 text-cyan-300">
                            Edit
                          </button>
                          <button onClick={() => deleteProduct(item.id)} className="rounded border border-rose-300/30 px-2 py-1 text-rose-300">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h2 className="text-xl text-zinc-100">Order Fulfillment & Logistics</h2>
                <p className="text-xs text-zinc-400">Delhivery API shipment creation, AWBs & tracking</p>
              </div>
              <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-400/30">
                {orders.length} Orders
              </span>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-auto pr-1">
              {orders.map((order) => {
                const productNames: Record<string, string> = {};
                const productImages: Record<string, string> = {};

                (order.products || []).forEach((item) => {
                  const p = products.find((prod) => prod.id === item.productId);
                  if (p) {
                    productNames[item.productId] = p.name;
                    productImages[item.productId] = resolveProductImageSrc(p.images?.[0]);
                  }
                });


                return (
                  <OrderFulfillmentCard
                    key={order.id}
                    order={order}
                    shipment={shipmentsMap[order.id] || null}
                    productNames={productNames}
                    productImages={productImages}
                    onShipped={() => void loadAll()}
                    onCancelled={() => void loadAll()}
                  />
                );
              })}
              {!orders.length ? <p className="text-sm text-zinc-400">No orders found.</p> : null}
            </div>
          </section>


          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <h2 className="text-xl text-zinc-100">Top Selling Products</h2>
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              {(analytics?.topProducts || []).map((item) => (
                <div key={item.productId} className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2">
                  <span>{item.name}</span>
                  <span>{item.qty} sold</span>
                </div>
              ))}
              {!analytics?.topProducts?.length ? <p className="text-zinc-400">No sales data yet.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl text-zinc-100">{value}</p>
    </article>
  );
}
