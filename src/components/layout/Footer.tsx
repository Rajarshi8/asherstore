import Link from "next/link";
import { ArrowRight } from "lucide-react";

const policyLinks = [
  { label: "Exchange Policy", href: "/returns-exchange" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Shipping & Cancellation Policy", href: "/shipping-cancellation-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Contact Us", href: "/contact-us" }
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/90 text-zinc-200">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16">

        {/* Main two-column layout */}
        <div className="grid gap-12 md:grid-cols-2">

          {/* LEFT — Policies */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold uppercase tracking-[0.18em] text-white md:text-xl">
              Policies
            </h3>
            <nav aria-label="Policy links">
              <ul className="space-y-3 text-base text-zinc-300">
                {policyLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* RIGHT — Logo + Newsletter */}
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <Link
              href="/"
              className="self-start focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              aria-label="THE ASHER STORE home"
            >
              <span className="text-2xl font-black uppercase tracking-[0.12em] text-white md:text-3xl">
                ASHER<span className="text-rose-500">.</span>
              </span>
            </Link>

            {/* Newsletter */}
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-zinc-400">
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

            {/* Instagram */}
            <Link
              href="https://www.instagram.com/theasher.store?igsh=NHRmN2MwZmhhaXRo"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="inline-flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
              <span>Instagram</span>
            </Link>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-12 border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-400">
          <p>© 2026, THE ASHER STORE. Built for fans.</p>
          <p className="flex flex-wrap gap-3">
            <Link href="/privacy-policy" className="hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
              Privacy policy
            </Link>
            <span>•</span>
            <Link href="/terms-and-conditions" className="hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
              Terms
            </Link>
            <span>•</span>
            <Link href="/shipping-cancellation-policy" className="hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
              Shipping policy
            </Link>
            <span>•</span>
            <Link href="/contact-us" className="hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
              Contact
            </Link>
          </p>
        </div>

      </div>
    </footer>
  );
}
