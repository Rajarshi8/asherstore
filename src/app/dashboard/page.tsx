"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import Image from "next/image";

import { ProductCard } from "@/components/ui/ProductCard";
import type { JerseySize, Product, UserProfile } from "@/lib/types";
import { formatINR, resolveProductImageSrc } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";
import { useShopStore } from "@/store/useShopStore";

interface DashboardOrder {
  id: string;
  total: number;
  shippingStatus: string;
  paymentStatus: string;
  createdAt: string;
  items?: Array<{
    productId: string;
    size: JerseySize;
    qty: number;
    price: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [teamProductsLoading, setTeamProductsLoading] = useState(true);
  const [favoriteTeamSaving, setFavoriteTeamSaving] = useState(false);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [favoriteTeam, setFavoriteTeam] = useState<string>("");
  const [favoriteTeamInput, setFavoriteTeamInput] = useState<string>("");
  const [teamProducts, setTeamProducts] = useState<Product[]>([]);
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);

  const user = useShopStore((state) => state.user);
  const setAuth = useShopStore((state) => state.setAuth);
  const clearAuth = useShopStore((state) => state.logout);
  const wishlist = useShopStore((state) => state.wishlist);
  const recentlyViewed = useShopStore((state) => state.recentlyViewed);

  async function loadTeamProducts(team: string) {
    setTeamProductsLoading(true);

    try {
      if (!team) {
        setTeamProducts([]);
        return;
      }

      const productsRes = await fetch(
        `/api/products?team=${encodeURIComponent(team)}`,
        { cache: "no-store" }
      );
      const productsJson = (await productsRes.json()) as {
        products?: Product[];
        error?: string;
      };

      if (!productsRes.ok) {
        throw new Error(productsJson.error || "Failed to load team jerseys");
      }

      setTeamProducts(productsJson.products || []);
    } finally {
      setTeamProductsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });

        const meJson = (await meRes.json()) as { user?: UserProfile; error?: string };

        if (!meRes.ok || !meJson.user) {
          if (active) {
            clearAuth();
            router.replace("/login?next=/dashboard");
          }
          return;
        }

        if (active) {
          setAuth({ user: meJson.user, token: "session" });
        }

        const selectedTeam =
          meJson.user.favoriteTeam || meJson.user.favoriteTeams?.[0] || "";

        if (active) {
          setFavoriteTeam(selectedTeam);
          setFavoriteTeamInput(selectedTeam);
        }

        setOrdersLoading(true);
        setTeamProductsLoading(true);

        const [ordersRes, productsRes] = await Promise.all([
          fetch("/api/orders", { cache: "no-store" }),
          selectedTeam
            ? fetch(`/api/products?team=${encodeURIComponent(selectedTeam)}`, {
                cache: "no-store",
              })
            : Promise.resolve(null),
        ]);

        const ordersJson = (await ordersRes.json()) as { orders?: DashboardOrder[]; error?: string };
        if (!ordersRes.ok) {
          throw new Error(ordersJson.error || "Failed to load orders");
        }

        if (active) {
          setOrders(ordersJson.orders || []);
          setOrdersLoading(false);
        }

        if (productsRes) {
          const productsJson = (await productsRes.json()) as {
            products?: Product[];
            error?: string;
          };

          if (!productsRes.ok) {
            throw new Error(productsJson.error || "Failed to load team jerseys");
          }

          if (active) {
            setTeamProducts(productsJson.products || []);
            setTeamProductsLoading(false);
          }
        } else if (active) {
          setTeamProducts([]);
          setTeamProductsLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load dashboard");
          setOrdersLoading(false);
          setTeamProductsLoading(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [clearAuth, router, setAuth]);

  useEffect(() => {
    async function loadTeamOptions() {
      try {
        const res = await fetch("/api/teams", { cache: "no-store" });
        const json = (await res.json()) as { teams?: { id: string; name: string }[] };
        if (res.ok) {
          setTeamOptions(json.teams || []);
        }
      } catch {
        // silently ignore
      }
    }

    void loadTeamOptions();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const json = (await res.json()) as { products?: Product[] };
        if (active && res.ok) {
          setCatalog(json.products || []);
        }
      } catch {
        if (active) {
          setCatalog([]);
        }
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await signOut();
      clearAuth();
      toast.success("You have been logged out");
      router.push("/login");
    } catch {
      toast.error("Logout failed. Try again.");
    }
  }

  async function handleFavoriteTeamSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTeam = favoriteTeamInput.trim();

    if (!nextTeam) {
      toast.error("Please select a favorite team");
      return;
    }

    setFavoriteTeamSaving(true);

    try {
      const res = await fetch("/api/profile/favorite-team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteTeam: nextTeam }),
      });
      const json = (await res.json()) as { user?: UserProfile; error?: string };

      if (!res.ok || !json.user) {
        throw new Error(json.error || "Failed to update favorite team");
      }

      setAuth({ user: json.user, token: "session" });
      setFavoriteTeam(nextTeam);
      setFavoriteTeamInput(nextTeam);
      await loadTeamProducts(nextTeam);
      toast.success("Favorite team updated");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to update favorite team");
    } finally {
      setFavoriteTeamSaving(false);
    }
  }

  const wishlistProducts = useMemo(
    () => catalog.filter((item) => wishlist.includes(item.id)),
    [catalog, wishlist]
  );
  const recentProducts = useMemo(
    () => catalog.filter((item) => recentlyViewed.includes(item.id)),
    [catalog, recentlyViewed]
  );

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 text-zinc-300">
          Loading your dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 md:px-6">
      <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl text-zinc-100">
              Welcome, {user?.name || "User"}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">{user?.email || "No email"}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Role: {user?.role || "user"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:border-rose-400"
          >
            Logout
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
        <h2 className="text-2xl text-zinc-100">Orders</h2>
        {ordersLoading ? (
          <p className="text-sm text-zinc-400">Loading orders...</p>
        ) : !orders.length ? (
          <p className="text-sm text-zinc-400">No items found.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const orderItems = order.items || [];

              return (
                <article key={order.id} className="rounded-xl border border-white/10 bg-zinc-950/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-zinc-300">Order: {order.id}</p>
                      <p className="text-xs text-zinc-500">
                        Placed: {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-xs text-zinc-400">
                      <p>Status: {order.shippingStatus}</p>
                      <p>Payment: {order.paymentStatus}</p>
                      <p className="text-sm text-zinc-200">Total: {formatINR(order.total)}</p>
                    </div>
                  </div>

                  {orderItems.length ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {orderItems.map((item) => {
                        const product = catalog.find((entry) => entry.id === item.productId);
                        const imageSrc = resolveProductImageSrc(product?.images?.[0]);
                        const name = product?.name || item.productId;

                        return (
                          <div key={`${order.id}-${item.productId}-${item.size}`} className="flex gap-3 rounded-lg border border-white/10 bg-zinc-900/60 p-3">
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
                              <Image src={imageSrc} alt={name} fill sizes="64px" className="object-cover" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-zinc-100">{name}</p>
                              <p className="text-xs text-zinc-400">Size {item.size} · Qty {item.qty}</p>
                              <p className="text-xs text-zinc-300">{formatINR(item.price * item.qty)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-zinc-500">No item details available for this order.</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-cyan-400/20 bg-zinc-900/70 p-5">
        <h2 className="text-2xl text-zinc-100">
          {favoriteTeam ? `Your Team: ${favoriteTeam}` : "Your Team"}
        </h2>
        <form onSubmit={handleFavoriteTeamSave} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={favoriteTeamInput}
            onChange={(event) => setFavoriteTeamInput(event.target.value)}
            className="w-full rounded-lg border border-cyan-400/30 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-cyan-300 sm:max-w-md"
          >
            <option value="" disabled>Select your favourite team</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.name}>{team.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={favoriteTeamSaving}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-70"
          >
            {favoriteTeamSaving ? "Saving..." : "Save Team"}
          </button>
        </form>
        {teamProductsLoading ? (
          <p className="text-sm text-zinc-400">Loading personalized jerseys...</p>
        ) : !favoriteTeam ? (
          <p className="text-sm text-zinc-400">
            Set your favorite team in your profile to get personalized picks.
          </p>
        ) : !teamProducts.length ? (
          <p className="text-sm text-zinc-400">No jerseys found for this team.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {teamProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl text-zinc-100">Wishlist</h2>
        {wishlistProducts.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {wishlistProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No items in wishlist.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl text-zinc-100">Recently Viewed</h2>
        {recentProducts.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Nothing viewed yet.</p>
        )}
      </section>

      {error ? (
        <section className="rounded-2xl border border-rose-500/40 bg-rose-900/20 p-4 text-sm text-rose-200">
          {error}
        </section>
      ) : null}
    </div>
  );
}
