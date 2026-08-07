"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle } from "lucide-react";

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");

  return (
    <div className="mx-auto flex w-full max-w-3xl px-4 py-12 md:px-6">
      <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-emerald-400" strokeWidth={1.5} />
        </div>

        <h1 className="mt-4 text-3xl font-bold text-emerald-200">Payment Successful!</h1>
        <p className="mt-2 text-sm text-emerald-100/80">
          Thank you for your order. We&apos;re processing it now.
        </p>

        {orderId && (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-black/20 px-4 py-3">
            <p className="text-xs text-emerald-300/70 uppercase tracking-wider">Order ID</p>
            <p className="mt-1 font-mono text-sm text-emerald-200 break-all">{orderId}</p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
          >
            View My Orders
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-emerald-300/30 px-5 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/10"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-3xl px-4 py-12">
          <div className="w-full animate-pulse rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 h-64" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
