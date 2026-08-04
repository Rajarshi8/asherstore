"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown } from "lucide-react";

const policyLinks = [
  { label: "Exchange Policy", href: "/returns-exchange" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Shipping & Cancellation Policy", href: "/shipping-cancellation-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Contact Us", href: "/contact-us" }
];

export function Footer() {
  const [openPolicies, setOpenPolicies] = useState(true);

  return (
    <footer className="border-t border-white/10 bg-black/90 text-zinc-200">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16">

        {/* Main two-column layout */}
        <div className="grid gap-12 md:grid-cols-2">

          {/* LEFT — Policies */}
          <div className="space-y-5">
            {/* Clickable Bigger POLICIES Header */}
            <button
              onClick={() => setOpenPolicies((prev) => !prev)}
              className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
              aria-expanded={openPolicies}
            >
              <h3 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-[0.15em] text-white transition-colors group-hover:text-[#b5f23d]">
                POLICIES
              </h3>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-300 transition-all group-hover:border-[#b5f23d] group-hover:bg-[#b5f23d]/10 group-hover:text-[#b5f23d]">
                <ChevronDown
                  size={20}
                  className={`transition-transform duration-300 ${
                    openPolicies ? "rotate-180" : "rotate-0"
                  }`}
                />
              </div>
            </button>

            {/* Box Structure for Policy Items */}
            {openPolicies && (
              <div className="grid gap-3 sm:grid-cols-2">
                {policyLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group relative flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/80 p-4 transition-all duration-300 hover:border-[#b5f23d]/50 hover:bg-zinc-800/90 hover:scale-[1.01] shadow-sm"
                  >
                    <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                      {link.label}
                    </span>
                    <ArrowRight
                      size={15}
                      className="text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#b5f23d]"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Title + Newsletter + Connect */}
          <div className="flex flex-col gap-6">
            {/* Text Title — THE ASHER STORE (Matching Hero Display Font) */}
            <Link
              href="/"
              className="self-start text-3xl sm:text-4xl font-black uppercase tracking-tight text-white hover:text-[#b5f23d] transition-colors leading-none focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              aria-label="THE ASHER STORE home"
            >
              THE ASHER STORE
            </Link>

            {/* Newsletter */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
                Stay in the loop with new drops &amp; offers
              </p>
              <div className="flex items-center rounded-lg border border-white/15 bg-zinc-900/80 px-3">
                <input
                  placeholder="E-mail"
                  className="w-full bg-transparent py-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none"
                />
                <button
                  aria-label="Submit email"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-zinc-200 hover:bg-white/20"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Connect With Us / Social Links */}
            <div className="flex flex-col gap-5 pt-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400 text-center">
                Connect With Us
              </p>

              {/* Spaced row — Left: Instagram, Middle: Facebook, Right: WhatsApp */}
              <div className="flex items-center justify-between gap-4 text-sm text-zinc-300 w-full px-1">
                {/* Left — Instagram */}
                <Link
                  href="https://www.instagram.com/theasher.store?igsh=NHRmN2MwZmhhaXRo"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <svg className="h-4 w-4 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                  </svg>
                  <span>Instagram</span>
                </Link>

                {/* Middle — Facebook */}
                <Link
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <svg className="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.891h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                  <span>Facebook</span>
                </Link>

                {/* Right — WhatsApp */}
                <Link
                  href="https://wa.me/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  <span>WhatsApp</span>
                </Link>
              </div>

              {/* Join WhatsApp Community - Middle Aligned on next line */}
              <div className="pt-2 flex flex-col items-center gap-1.5">
                <Link
                  href="https://chat.whatsapp.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="group relative inline-flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-emerald-400 transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-white hover:scale-[1.02] shadow-sm"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  <span>Join WhatsApp Community</span>
                </Link>
                <p className="text-[11px] font-medium text-zinc-400 text-center">
                  Join for daily updates
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-12 border-t border-white/10 pt-6 flex items-center justify-between gap-4 text-sm text-zinc-400">
          <p>© 2026, THE ASHER STORE.</p>
        </div>

      </div>
    </footer>
  );
}
