"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

import type { Product } from "@/lib/types";
import { useShopStore } from "@/store/useShopStore";

const mainNavLinks = [
  { label: "Home", href: "/" },
  { label: "Categories", href: "/category" },
  { label: "About Us", href: "/about-us" },
  { label: "Contact Us", href: "/contact-us" },
];

const mobileNavLinks = mainNavLinks.filter((link) => link.label !== "Home");

const mobileOnlyLinks = [
  { label: "Matchday Deals", href: "/matchday-deals" },
  { label: "Policies", href: "/refund-policy" },
  { label: "Contact Us", href: "/contact-us" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);

  const cartCount = useShopStore((state) => state.cart.reduce((sum, item) => sum + item.qty, 0));

  // Close everything on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [menuOpen]);

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

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return catalog
      .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [catalog, query]);

  const closeAll = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <>
    <header className="relative sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
      {/* ── Main top bar ── */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg border border-white/15 p-2 text-zinc-200 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/" className="flex items-center gap-3 text-white" onClick={closeAll}>
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/60">
              <Image
                src="/pictures/Asher%20Store.jpeg"
                alt="Asher Store"
                width={40}
                height={40}
                className="h-full w-full object-cover"
                priority
              />
            </span>
            <span className="text-xl font-black tracking-[0.16em]">
              ASHER STORE
              <span className="ml-1 align-top text-rose-500">.</span>
            </span>
          </Link>
        </div>

        {/* ── Desktop nav ── */}
        <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
          {mainNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-white transition-colors text-sm ${
                pathname === link.href ? "font-semibold text-white" : ""
              }`}
              onClick={closeAll}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ── Desktop search ── */}
        <div className="relative hidden w-full max-w-xs lg:max-w-sm md:block">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jerseys, kits, collections..."
            className="w-full rounded-full border border-white/20 bg-white/95 py-1.5 pl-9 pr-4 text-xs font-medium text-zinc-900 placeholder-zinc-500 outline-none ring-2 ring-transparent transition-all focus:bg-white focus:ring-white/40 shadow-sm"
          />
          {results.length > 0 ? (
            <div className="absolute mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl z-50">
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="block rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                  onClick={() => setQuery("")}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-zinc-200">
          <Show when="signed-in">
            <Link href="/dashboard" className="rounded-lg border border-white/10 p-2 hover:border-rose-400" title="Dashboard" onClick={closeAll}>
              <User size={16} />
            </Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-lg border border-white/10 p-2 hover:border-rose-400 cursor-pointer animate-fade-in" title="Sign In">
                <User size={16} />
              </button>
            </SignInButton>
          </Show>
          <Link href="/cart" className="relative rounded-lg border border-white/10 p-2 hover:border-rose-400" onClick={closeAll}>
            <ShoppingBag size={16} />
            {cartCount > 0 ? (
              <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-xs font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

    </header>

      {/* ── Mobile drawer + backdrop — portalled to body to escape header stacking context ── */}
      {mounted ? createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-100 bg-black/75 transition-opacity duration-300 md:hidden ${
              menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={closeAll}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            className={`fixed left-0 top-0 z-110 flex h-full w-1/2 flex-col border-r border-white/15 bg-[#0a0a0a] shadow-[4px_0_40px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-in-out md:hidden ${
              menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-black tracking-[0.16em] text-white">
                ASHER<span className="text-rose-500">.</span>
              </span>
              <button
                className="rounded-lg border border-white/15 p-1.5 text-zinc-400 hover:text-white"
                onClick={closeAll}
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mobile search */}
            <div className="border-b border-white/10 px-4 py-3">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-2 pl-8 pr-3 text-sm text-zinc-100 outline-none ring-rose-400 transition focus:ring"
                />
              </div>
              {results.length > 0 ? (
                <div className="mt-2 rounded-xl border border-white/10 bg-zinc-900 p-2">
                  {results.map((item) => (
                    <Link
                      key={item.id}
                      href={`/products/${item.id}`}
                      className="block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      onClick={() => { setQuery(""); closeAll(); }}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Mobile nav items */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {mobileNavLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`block rounded-lg px-3 py-3 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white ${
                        pathname === link.href ? "bg-zinc-900 font-semibold text-white" : ""
                      }`}
                      onClick={closeAll}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="my-3 border-t border-white/10" />

              <ul className="space-y-1">
                {mobileOnlyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`block rounded-lg px-3 py-3 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white ${
                        pathname === link.href ? "bg-zinc-900 font-semibold text-white" : ""
                      }`}
                      onClick={closeAll}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Drawer footer links */}
            <div className="border-t border-white/10 px-3 py-4 space-y-1">
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                  onClick={closeAll}
                >
                  <User size={15} /> Dashboard
                </Link>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <UserButton />
                  <span className="text-sm text-zinc-400 font-medium">Manage Account</span>
                </div>
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white text-left cursor-pointer">
                    <User size={15} /> Sign In
                  </button>
                </SignInButton>
              </Show>
              <Link
                href="/cart"
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                onClick={closeAll}
              >
                <ShoppingBag size={15} /> Cart {cartCount > 0 ? `(${cartCount})` : ""}
              </Link>
            </div>
          </div>
        </>,
        document.body
      ) : null}
    </>
  );
}
