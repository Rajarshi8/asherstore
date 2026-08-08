"use client";

import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";

import type { JerseySize, Product } from "@/lib/types";
import { formatINR, resolveProductImageSrc } from "@/lib/utils";
import { useShopStore } from "@/store/useShopStore";

type PayState = "idle" | "creating-order" | "payment-open" | "verifying" | "done";

export default function CartPage() {
  const router = useRouter();
  const cart = useShopStore((state) => state.cart);
  const updateQuantity = useShopStore((state) => state.updateQuantity);
  const removeFromCart = useShopStore((state) => state.removeFromCart);
  const clearCart = useShopStore((state) => state.clearCart);
  const user = useShopStore((state) => state.user);

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [payState, setPayState] = useState<PayState>("idle");
  const [scriptReady, setScriptReady] = useState(false);

  // Shipping Address Form State
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeServiceable, setPincodeServiceable] = useState<boolean | null>(null);

  const SHIPPING_CHARGE = 99;
  const PROMO_CODE_DISCOUNT_RATE = 0.1;
  const VALID_PROMO_CODES = ["ASHER10", "JERSEY10", "WELCOME10"];


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
        if (active) setCatalog([]);
      }
    }

    void loadCatalog();
    return () => { active = false; };
  }, []);

  const detailed = useMemo(
    () =>
      cart.map((item) => ({
        ...item,
        product: catalog.find((product) => product.id === item.productId),
      })),
    [cart, catalog]
  );

  const subtotal = detailed.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.qty,
    0
  );

  const shippingCharge = detailed.length ? SHIPPING_CHARGE : 0;
  const discountAmount = appliedPromoCode
    ? Math.round((subtotal + shippingCharge) * PROMO_CODE_DISCOUNT_RATE)
    : 0;
  const finalTotal = Math.max(0, subtotal + shippingCharge - discountAmount);

  function handleApplyPromoCode() {
    const normalized = promoCodeInput.trim().toUpperCase();
    if (!normalized) {
      toast.error("Enter a promo code first.");
      return;
    }
    if (!VALID_PROMO_CODES.includes(normalized)) {
      setAppliedPromoCode(null);
      toast.error("Invalid promo code.");
      return;
    }
    setAppliedPromoCode(normalized);
    toast.success("Promo applied. Discount added to shipping-inclusive total.");
  }

  function handleRemovePromoCode() {
    setAppliedPromoCode(null);
    setPromoCodeInput("");
  }

  // Auto-fill user name/phone if profile exists
  useEffect(() => {
    if (user) {
      setAddressForm((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user]);

  async function handleCheckPincode(pin: string) {
    if (pin.length !== 6) {
      setPincodeServiceable(null);
      return;
    }
    setPincodeChecking(true);
    try {
      const res = await fetch("/api/delhivery/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: pin }),
      });
      const json = (await res.json()) as { isServiceable?: boolean; city?: string; state?: string };
      if (json.isServiceable) {
        setPincodeServiceable(true);
        if (json.city) {
          setAddressForm((prev) => ({
            ...prev,
            city: prev.city || json.city || "",
            state: prev.state || json.state || "",
          }));
        }
        toast.success(`Delhivery delivers to ${pin} (${json.city || ""})`);
      } else {
        setPincodeServiceable(false);
        toast.error(`Pincode ${pin} is not currently serviceable by Delhivery.`);
      }
    } catch {
      setPincodeServiceable(null);
    } finally {
      setPincodeChecking(false);
    }
  }

  // ── Razorpay checkout ────────────────────────────────────────────────────
  const handleOrderNow = useCallback(async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (!scriptReady) {
      toast.error("Payment gateway is loading, please try again in a moment.");
      return;
    }

    // Address validation with explicit field messages
    const { name, phone, addressLine1, city, state, pincode } = addressForm;
    if (!name.trim()) {
      toast.error("Please enter your Full Name.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      toast.error("Please enter a valid 10-digit Phone Number.");
      return;
    }
    if (!addressLine1.trim()) {
      toast.error("Please enter your Street Address.");
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit Pincode.");
      return;
    }
    if (!city.trim()) {
      toast.error("Please enter your City.");
      return;
    }
    if (!state.trim()) {
      toast.error("Please enter your State.");
      return;
    }


    const pricedItems = detailed
      .map((entry) => {
        if (!entry.product) return null;
        return {
          productId: entry.productId,
          name: entry.product.name,
          size: entry.size as JerseySize,
          qty: entry.qty,
          price: entry.product.price,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!pricedItems.length || pricedItems.length !== detailed.length) {
      toast.error("Some cart items are unavailable. Refresh and try again.");
      return;
    }


    // Step 1 — Create Razorpay order via backend
    setPayState("creating-order");
    let orderId: string;
    let amount: number;
    let keyId: string;

    try {
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: pricedItems.map((i) => ({ productId: i.productId, size: i.size, qty: i.qty })),
          currency: "INR",
          shippingCharge: shippingCharge,
          promoCode: appliedPromoCode,
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
      amount = json.amount ?? Math.round(finalTotal * 100);
      keyId = json.keyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
    } catch (err) {
      setPayState("idle");
      toast.error(err instanceof Error ? err.message : "Order creation failed.");
      return;
    }

    // Step 2 — Open Razorpay modal
    setPayState("payment-open");

    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency: "INR",
      name: "THE ASHER STORE",
      description: "Jersey Order",
      order_id: orderId,
      prefill: {
        name: user.name || "",
        email: user.email || "",
      },
      theme: { color: "#06b6d4" },
      modal: {
        ondismiss: () => {
          setPayState("idle");
          toast("Payment cancelled.", { icon: "ℹ️" });
        },
      },
      handler: async (response) => {
        // Step 3 — Verify payment signature on backend
        setPayState("verifying");
        const toastId = toast.loading("Verifying payment…");

        try {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              items: pricedItems.map((i) => ({ productId: i.productId, size: i.size, qty: i.qty })),
              currency: "INR",
              shippingCharge: shippingCharge,
              promoCode: appliedPromoCode,
              phone: addressForm.phone,
              shippingAddress: {
                name: addressForm.name,
                phone: addressForm.phone,
                addressLine1: addressForm.addressLine1,
                addressLine2: addressForm.addressLine2,
                city: addressForm.city,
                state: addressForm.state,
                pincode: addressForm.pincode,
                country: "India",
              },
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
          setPayState("done");
          clearCart();
          router.push(`/checkout/success?orderId=${verifyJson.commerceOrderId ?? ""}`);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Verification failed.", { id: toastId });
          setPayState("idle");
        }
      },
    });

    rzp.on("payment.failed", (response) => {
      setPayState("idle");
      toast.error(`Payment failed: ${response.error.description}`);
    });

    rzp.open();
  }, [addressForm, clearCart, detailed, finalTotal, router, scriptReady, user]);


  const isLoading = payState === "creating-order" || payState === "verifying";

  const buttonLabel =
    payState === "creating-order"
      ? "Preparing Payment…"
      : payState === "verifying"
        ? "Verifying Payment…"
        : payState === "done"
          ? "Order Placed ✓"
          : "Order Now";

  return (
    <>
      {/* Razorpay Standard Checkout script */}
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
        onError={() => toast.error("Payment gateway failed to load. Refresh the page.")}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <div className="grid gap-6 md:grid-cols-[1fr_340px]">
          {/* Cart Items */}
          <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
            <h1 className="text-3xl text-zinc-100">Your Cart</h1>
            {!detailed.length ? (
              <p className="text-zinc-400">Cart is empty.</p>
            ) : (
              detailed.map((entry) => (
                <article
                  key={`${entry.productId}-${entry.size}`}
                  className="grid gap-3 rounded-xl border border-white/10 bg-zinc-950/70 p-3 sm:grid-cols-[110px_1fr_auto]"
                >
                  <div className="relative h-24 w-full overflow-hidden rounded-lg">
                    <Image
                      src={resolveProductImageSrc(entry.product?.images[0])}
                      alt={entry.product?.name || "Jersey"}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-zinc-100">{entry.product?.name}</p>
                    <p className="text-sm text-zinc-400">Size {entry.size}</p>
                    <p className="text-sm text-zinc-200">
                      {formatINR((entry.product?.price || 0) * entry.qty)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (entry.qty <= 1) {
                          toast("Use Remove to delete an item from your cart.");
                          return;
                        }
                        updateQuantity(entry.productId, entry.size, entry.qty - 1);
                      }}
                      className="rounded border border-white/20 px-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={entry.qty <= 1}
                    >
                      -
                    </button>
                    <span>{entry.qty}</span>
                    <button
                      onClick={() => updateQuantity(entry.productId, entry.size, entry.qty + 1)}
                      className="rounded border border-white/20 px-2"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(entry.productId, entry.size)}
                      className="ml-2 text-xs text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* Order Summary */}
          <aside className="h-fit rounded-2xl border border-white/10 bg-zinc-900/70 p-5 space-y-4">
            {/* Delivery Address Form */}
            <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] font-semibold text-cyan-300">
                  Shipping Address
                </p>
                {pincodeChecking ? (
                  <span className="text-[10px] text-zinc-400 animate-pulse">Checking pin...</span>
                ) : pincodeServiceable === true ? (
                  <span className="text-[10px] font-semibold text-emerald-400">✓ Serviceable</span>
                ) : pincodeServiceable === false ? (
                  <span className="text-[10px] font-semibold text-rose-400">✕ Unserviceable</span>
                ) : null}
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={addressForm.name}
                  onChange={(e) => setAddressForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                />
                <input
                  type="tel"
                  placeholder="10-digit Phone Number *"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                />
                <input
                  type="text"
                  placeholder="House / Street / Area *"
                  value={addressForm.addressLine1}
                  onChange={(e) => setAddressForm((p) => ({ ...p, addressLine1: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                />
                <input
                  type="text"
                  placeholder="Landmark / Apartment (Optional)"
                  value={addressForm.addressLine2}
                  onChange={(e) => setAddressForm((p) => ({ ...p, addressLine2: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City *"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                  />
                  <input
                    type="text"
                    placeholder="State *"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm((p) => ({ ...p, state: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                  />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6-digit Pincode *"
                  value={addressForm.pincode}
                  onChange={(e) => {
                    const pin = e.target.value.replace(/\D/g, "");
                    setAddressForm((p) => ({ ...p, pincode: pin }));
                    if (pin.length === 6) void handleCheckPincode(pin);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-400/50"
                />
              </div>
            </div>

            <div>
              <p className="text-sm text-zinc-400">Subtotal</p>
              <p className="mt-1 text-3xl font-semibold text-zinc-100">{formatINR(subtotal)}</p>
              <p className="mt-2 text-sm text-zinc-400">Shipping: {formatINR(shippingCharge)}</p>
            </div>


            {/* Promo Code */}
            <div className="mt-4 rounded-lg border border-white/10 bg-zinc-950/60 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Promo Code</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  placeholder="Enter promo code"
                  className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
                <button
                  onClick={handleApplyPromoCode}
                  disabled={!detailed.length}
                  className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              {appliedPromoCode ? (
                <div className="mt-2 flex items-center justify-between text-xs text-emerald-300">
                  <span>{appliedPromoCode} applied (10% off total incl. shipping)</span>
                  <button onClick={handleRemovePromoCode} className="text-zinc-300 hover:text-white">
                    Remove
                  </button>
                </div>
              ) : null}
            </div>

            {/* Totals */}
            <div className="mt-4 space-y-1 text-sm">
              <p className="flex items-center justify-between text-zinc-300">
                <span>Discount</span>
                <span>-{formatINR(discountAmount)}</span>
              </p>
              <p className="flex items-center justify-between font-semibold text-zinc-100">
                <span>Total</span>
                <span>{formatINR(finalTotal)}</span>
              </p>
            </div>

            {/* Order Now → Razorpay */}
            <button
              id="razorpay-order-now-btn"
              onClick={() => void handleOrderNow()}
              disabled={!detailed.length || isLoading || payState === "done" || !scriptReady}
              className={[
                "mt-4 inline-flex w-full justify-center rounded-lg px-4 py-3 text-sm font-semibold transition",
                isLoading || !scriptReady
                  ? "cursor-wait bg-cyan-400/60 text-zinc-950/70"
                  : !detailed.length || payState === "done"
                    ? "cursor-not-allowed bg-zinc-700 text-zinc-400 opacity-50"
                    : "cursor-pointer bg-cyan-400 text-zinc-950 hover:bg-cyan-300 active:scale-[0.98]",
              ].join(" ")}
            >
              {buttonLabel}
            </button>

            <p className="mt-3 text-center text-xs text-zinc-500">
              Secured by <span className="font-semibold text-zinc-400">Razorpay</span>
            </p>

            {/* Login prompt */}
            {showLoginPrompt ? (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm">
                <p className="font-semibold text-amber-300">Login required to place an order</p>
                <p className="mt-1 text-zinc-400">
                  Sign in so we can send you order updates and keep your purchase safe.
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/login?next=/cart"
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-center text-xs font-semibold text-zinc-950 hover:bg-zinc-100"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup?next=/cart"
                    className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-center text-xs font-semibold text-zinc-200 hover:border-white/40"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}
