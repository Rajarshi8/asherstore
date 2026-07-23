"use client";

import { Truck, RotateCcw, Clock, ShieldCheck } from "lucide-react";

export interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const defaultFeatures: FeatureItem[] = [
  {
    icon: <Truck size={24} className="text-zinc-200" />,
    title: "Free Shipping",
    subtitle: "Free shipping on all orders",
  },
  {
    icon: <RotateCcw size={24} className="text-zinc-200" />,
    title: "100% Money Back",
    subtitle: "You have 14 days to return",
  },
  {
    icon: <Clock size={24} className="text-zinc-200" />,
    title: "Support 24/7",
    subtitle: "Contact us 24 hours a day",
  },
  {
    icon: <ShieldCheck size={24} className="text-zinc-200" />,
    title: "100% Payment Secure",
    subtitle: "Your payment is safe with us",
  },
];

interface FeatureStripProps {
  features?: FeatureItem[];
}

export function FeatureStrip({ features = defaultFeatures }: FeatureStripProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 p-4 md:p-6 backdrop-blur-xl shadow-2xl">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
        {features.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-4 ${
              index !== 0 ? "lg:pl-6" : ""
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-100 transition-colors group-hover:border-white/20">
              {item.icon}
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-zinc-100">{item.title}</h4>
              <p className="text-xs text-zinc-400">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
