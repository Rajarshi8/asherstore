"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Are you legit?",
    answer:
      "Yes, we are a trusted jersey brand offering authentic products, secure payments, and reliable delivery."
  },
  {
    question: "Do you ship overseas?",
    answer:
      "Currently, we do not offer international shipping. However, we plan to expand overseas soon."
  },
  {
    question: "How long will it take to deliver?",
    answer:
      "Delivery timelines vary by location. Once your order is dispatched, a tracking ID will be shared so you can view the estimated delivery date."
  },
  {
    question: "How to track order?",
    answer:
      "Once your order is dispatched, you will receive a tracking id. You can use it in our websites track order section."
  },
  {
    question: "What size should I order?",
    answer:
      "Use the Fit Assistant on the home page. Enter your height and weight to get a quick recommendation."
  },
  {
    question: "Can I request return or exchange?",
    answer:
      "Exchanges are accepted only in cases of damaged or defective products. Kindly review our Return & Exchange Policy for further information."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="grid gap-8 rounded-3xl border border-white/10 bg-zinc-950/80 p-6 md:grid-cols-[1fr_1.4fr] md:p-8">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.24em] text-rose-400">FAQ</p>
        <h2 className="text-4xl leading-[0.95] text-zinc-100 md:text-5xl">Before kickoff</h2>
        <p className="max-w-md text-sm leading-relaxed text-zinc-300 md:text-base">
          Everything fans ask before they lock in a jersey.
        </p>
        <p className="text-sm text-zinc-400">
          Need help right away? Write to theasherstoresupport@gmail.com
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-2 md:p-3">
        {faqs.map((item, idx) => {
          const open = openIndex === idx;

          return (
            <div key={item.question} className="border-b border-white/10 last:border-b-0">
              <button
                onClick={() => setOpenIndex(open ? null : idx)}
                className="flex w-full items-center justify-between gap-3 px-3 py-4 text-left text-sm font-semibold text-zinc-100 md:text-base"
              >
                {item.question}
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full border border-white/15 text-zinc-300 transition ${
                    open ? "rotate-180 bg-zinc-800" : ""
                  }`}
                >
                  <ChevronDown size={14} />
                </span>
              </button>
              {open ? <p className="px-3 pb-4 text-sm leading-relaxed text-zinc-300">{item.answer}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
