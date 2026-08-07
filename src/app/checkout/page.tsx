"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";

import type { Product } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { useShopStore } from "@/store/useShopStore";

type CheckoutState = "idle" | "creating-order" | "payment-open" | "verifying" | "done";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useShopStore((state) => state.cart);
  const clearCart = useShopStore((state) => state.clearCart);

  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [state, setState] = useState<CheckoutState>("idle");
  const [scriptReady, setScriptReady] = useState(false);

  // ── Load live prices from API ─────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    async function loadPrices() {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const json = (await res.json()) as { products?: Product[] };
        if (!active || !res.ok) return;
        const nextMap = (json.products || []).reduce<Record<string, number>>((acc, item) => {
          acc[item.id] = item.price;
          return acc;
        }, {});
        setPriceMap(nextMap);
      } catch {
        if (active) setPriceMap({});
      }
    }

    void loadPrices();
    return () => { active = false; };
  }, []);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (priceMap[item.productId] || 0) * item.qty, 0),
    [cart, priceMap]
  );

  const missingPrices = cart.some((item) => typeof priceMap[item.productId] !== "number");

  useEffect(() => {
    if (missingPrices && cart.length) {
      toast.error("Some product prices are unavailable. Refresh and try again.");
    }
  }, [cart.length, missingPrices]);

  // ── Razorpay checkout flow ────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!scriptReady) {
      toast.error("Payment gateway is loading, please try again.");
      return;
    }
    if (!cart.length) {
      toast.error("Your cart is empty.");
      return;
    }
    if (missingPrices) {
      toast.error("Product prices could not be loaded. Please refresh.");
      return;
    }

    // Step 1 — Create Razorpay order on our backend
    setState("creating-order");
    let orderId: string;
    let amount: number;
    let keyId: string;

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({ productId: c.productId, size: c.size, qty: c.qty })),
          currency: "INR",
        }),
      });

      const json = (await res.json()) as {
        orderId?: string;
        amount?: number;
        keyId?: string;
        error?: string;
      };

      if (!res.ok || !json.orderId) {
        throw new Error(json.error || "Failed to create order. Please try again.");
      }

      orderId = json.orderId;
      amount = json.amount ?? Math.round(total * 100);
      keyId = json.keyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
    } catch (err) {
      setState("idle");
      toast.error(err instanceof Error ? err.message : "Order creation failed.");
      return;
    }

    // Step 2 — Open Razorpay modal
    setState("payment-open");
    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency: "INR",
      name: "THE ASHER STORE",
      description: "Jersey Order",
      order_id: orderId,
      theme: { color: "#f43f5e" },
      modal: {
        ondismiss: () => {
          setState("idle");
          toast("Payment cancelled.", { icon: "ℹ️" });
        },
      },
      handler: async (response) => {
        // Step 3 — Verify payment on our backend
        setState("verifying");
        const toastId = toast.loading("Verifying payment…");

        try {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              items: cart.map((c) => ({ productId: c.productId, size: c.size, qty: c.qty })),
              currency: "INR",
            }),
          });

          const verifyJson = (await verifyRes.json()) as {
            success?: boolean;
            commerceOrderId?: string;
            error?: string;
          };

          if (!verifyRes.ok || !verifyJson.success) {
            throw new Error(verifyJson.error || "Payment verification failed.");
          }

          toast.success("Payment successful! 🎉", { id: toastId });
          setState("done");
          clearCart();
          router.push(
            `/checkout/success?orderId=${verifyJson.commerceOrderId ?? ""}`
          );
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Verification failed.", { id: toastId });
          setState("idle");
        }
      },
    });

    rzp.on("payment.failed", (response) => {
      setState("idle");
      toast.error(`Payment failed: ${response.error.description}`);
    });

    rzp.open();
  }, [cart, clearCart, missingPrices, router, scriptReady, total]);

  const isLoading = state === "creating-order" || state === "verifying";

  const buttonLabel = {
    idle: `Pay ${formatINR(total)}`,
    "creating-order": "Preparing payment…",
    "payment-open": `Pay ${formatINR(total)}`,
    verifying: "Verifying payment…",
    done: "Order placed ✓",
  }[state];

  return (
    <>
      {/* Razorpay Standard Checkout script — loaded once per page */}
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
        onError={() => toast.error("Payment gateway failed to load. Refresh the page.")}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
          <h1 className="text-4xl text-zinc-100">Checkout</h1>

          {/* Order summary */}
          {cart.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">Your cart is empty.</p>
          ) : (
            <div className="mt-5 space-y-2">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.size}`}
                  className="flex items-center justify-between text-sm text-zinc-300"
                >
                  <span className="truncate max-w-[60%]">
                    Product ID: {item.productId} &bull; {item.size} &times; {item.qty}
                  </span>
                  <span>
                    {typeof priceMap[item.productId] === "number"
                      ? formatINR(priceMap[item.productId] * item.qty)
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-sm text-zinc-400">Payable amount</p>
            <p className="text-3xl font-semibold text-zinc-100">{formatINR(total)}</p>
          </div>

          <button
            id="razorpay-pay-button"
            onClick={() => void handlePay()}
            disabled={isLoading || cart.length === 0 || state === "done" || !scriptReady}
            className={[
              "mt-5 w-full rounded-lg px-4 py-3 text-sm font-semibold transition",
              isLoading || !scriptReady
                ? "cursor-wait bg-rose-600/60 text-white/70"
                : cart.length === 0 || state === "done"
                  ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
                  : "cursor-pointer bg-rose-600 text-white hover:bg-rose-500 active:scale-[0.98]",
            ].join(" ")}
          >
            {buttonLabel}
          </button>

          <Link
            href="/cart"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/5"
          >
            Back To Cart
          </Link>

          <p className="mt-4 text-center text-xs text-zinc-500">
            Secured by{" "}
            <span className="font-semibold text-zinc-400">Razorpay</span> · 256-bit SSL encryption
          </p>
        </div>
      </div>
    </>
  );
}
