import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us | THE ASHER STORE",
  description: "Reach THE ASHER STORE support for orders, returns, and product queries."
};

const contactPoints = [
  "Order updates and delivery support",
  "Exchange assistance",
  "Product availability and sizing help"
];

export default function ContactUsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <article className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-rose-400">Support</p>
        <h1 className="mt-3 text-3xl text-zinc-100 md:text-4xl">Contact Us</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300 md:text-base">
          Our support team is available for all order and product-related help. Reach us through the channels below.
        </p>

        <section className="mt-6 rounded-xl border border-white/10 bg-zinc-950/60 p-4" aria-label="Contact details">
          <p className="text-sm text-zinc-300">
            Instagram:{" "}
            <a
              className="text-rose-300 hover:text-rose-200"
              href="https://www.instagram.com/theasher.store/"
              target="_blank"
              rel="noopener noreferrer"
            >
              @theasher.store
            </a>
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Email: <a className="text-rose-300 hover:text-rose-200" href="mailto:theasherstoresupport@gmail.com">theasherstoresupport@gmail.com</a>
          </p>
          <p className="mt-2 text-sm text-zinc-300">Phone: +91 79809 18650</p>
          <p className="mt-2 text-sm text-zinc-300">Hours: Mon-Sat, 10:00 AM - 7:00 PM</p>
        </section>

        <section className="mt-6" aria-label="Support categories">
          <h2 className="text-xl text-zinc-100">How We Can Help</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-300">
            {contactPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="https://wa.me/917980918650"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Contact number
          </a>
          <Link
            href="/dashboard"
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Track order
          </Link>
        </div>
      </article>
    </main>
  );
}
