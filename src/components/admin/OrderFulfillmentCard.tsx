"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { formatINR } from "@/lib/utils";
import type { ProductionOrder } from "@/types/order";
import type { ProductionShipment } from "@/types/shipment";

interface OrderFulfillmentCardProps {
  order: ProductionOrder;
  shipment: ProductionShipment | null;
  productNames: Record<string, string>; // productId → name
  productImages: Record<string, string>; // productId → image URL
  onShipped: (orderId: string, awb: string) => void;
  onCancelled: (orderId: string) => void;
}


const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
  created: "bg-amber-400/20 text-amber-300 border-amber-400/30",
  failed: "bg-rose-400/20 text-rose-300 border-rose-400/30",
  pending: "bg-zinc-400/20 text-zinc-300 border-zinc-400/30",
  processing: "bg-blue-400/20 text-blue-300 border-blue-400/30",
  packed: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
  shipped: "bg-violet-400/20 text-violet-300 border-violet-400/30",
  out_for_delivery: "bg-orange-400/20 text-orange-300 border-orange-400/30",
  delivered: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
  manifested: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
  cancelled: "bg-rose-400/20 text-rose-300 border-rose-400/30",
};

export function OrderFulfillmentCard({
  order,
  shipment,
  productNames,
  productImages,
  onShipped,
  onCancelled,
}: OrderFulfillmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [serviceability, setServiceability] = useState<{
    checked: boolean;
    ok: boolean;
    city?: string;
  } | null>(null);

  const addr = order.shippingAddress;
  const alreadyShipped = Boolean(shipment?.awbNumber || order.awbNumber);
  // Auto-ship failed: paid but no AWB and status is still processing
  const autoShipFailed =
    !alreadyShipped &&
    order.paymentStatus === "paid" &&
    (order.shipmentStatus === "processing" || !order.shipmentStatus);

  async function handleCheckServiceability() {
    if (!addr?.pincode) {
      toast.error("No pincode available for this order.");
      return;
    }
    const res = await fetch("/api/delhivery/serviceability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pincode: addr.pincode }),
    });
    const json = (await res.json()) as {
      isServiceable?: boolean;
      city?: string;
      error?: string;
    };
    if (json.isServiceable) {
      setServiceability({ checked: true, ok: true, city: json.city });
      toast.success(`✅ Pincode ${addr.pincode} is serviceable (${json.city})`);
    } else {
      setServiceability({ checked: true, ok: false });
      toast.error(`❌ Pincode ${addr.pincode} is NOT serviceable by Delhivery.`);
    }
  }

  async function handleShipOrder() {
    setShipping(true);
    const toastId = toast.loading("Creating shipment with Delhivery…");
    try {
      const res = await fetch("/api/delhivery/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          pickupDate: pickupDate || undefined,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        awb?: string;
        error?: string;
        trackingUrl?: string;
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Shipment creation failed");
      }

      toast.success(`Shipment created! AWB: ${json.awb ?? ""}`, { id: toastId });
      setShowShipModal(false);
      onShipped(order.id, json.awb ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed", { id: toastId });
    } finally {
      setShipping(false);
    }
  }

  async function handleRetryShipment() {
    setRetrying(true);
    const toastId = toast.loading("Retrying shipment creation with Delhivery…");
    try {
      const res = await fetch(`/api/shipping/${encodeURIComponent(order.id)}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupDate: pickupDate || undefined }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        awb?: string;
        error?: string;
        alreadyShipped?: boolean;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Retry failed");
      }
      toast.success(
        json.alreadyShipped
          ? `Shipment already exists. AWB: ${json.awb ?? ""}`
          : `Shipment created! AWB: ${json.awb ?? ""}`,
        { id: toastId }
      );
      onShipped(order.id, json.awb ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed", { id: toastId });
    } finally {
      setRetrying(false);
    }
  }

  async function handleCancelShipment() {
    if (!shipment) return;
    if (!confirm(`Cancel shipment AWB ${shipment.awbNumber}? This cannot be undone.`)) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/delhivery/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || "Cancel failed");
      toast.success("Shipment cancelled.");
      onCancelled(order.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 font-mono truncate">#{order.id}</p>
          <p className="text-sm font-semibold text-zinc-100 mt-0.5">
            {order.customerName || order.shippingAddress?.name || order.customerEmail}
          </p>
          <p className="text-xs text-zinc-400">{order.customerEmail}</p>
          {(order.customerPhone || order.shippingAddress?.phone) && (
            <p className="text-xs text-zinc-400">📞 {order.customerPhone || order.shippingAddress?.phone}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`text-[10px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-0.5 ${STATUS_COLORS[order.paymentStatus] || STATUS_COLORS.pending}`}>
            {order.paymentStatus}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-0.5 ${STATUS_COLORS[shipment?.manifestStatus || order.shipmentStatus] || STATUS_COLORS.processing}`}>
            {shipment?.manifestStatus || order.shipmentStatus}
          </span>
          <span className="text-sm font-bold text-zinc-100">{formatINR(order.total)}</span>
        </div>
      </div>

      {/* Address & AWB */}
      <div className="flex flex-wrap gap-4 px-4 py-3 bg-zinc-950/30 text-xs text-zinc-400">
        {addr && (
          <div className="min-w-[180px]">
            <p className="text-zinc-500 uppercase tracking-wider font-bold text-[10px] mb-1">Ship To</p>
            <p className="text-zinc-200">{addr.addressLine1}</p>
            {addr.addressLine2 && <p>{addr.addressLine2}</p>}
            <p>{addr.city}, {addr.state} — {addr.pincode}</p>
          </div>
        )}
        {(shipment?.awbNumber || order.awbNumber) && (
          <div>
            <p className="text-zinc-500 uppercase tracking-wider font-bold text-[10px] mb-1">AWB</p>
            <p className="text-cyan-300 font-mono font-bold">{shipment?.awbNumber || order.awbNumber}</p>
            {order.estimatedDelivery && (
              <p className="text-zinc-400">ETA: {order.estimatedDelivery}</p>
            )}
          </div>
        )}
        <div className="ml-auto text-zinc-500 text-[11px] self-end">
          {new Date(order.createdAt).toLocaleString("en-IN")}
        </div>
      </div>

      {/* Items (collapsible) */}
      <div className="px-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between py-3 text-xs text-zinc-400 hover:text-zinc-200 transition"
        >
          <span>{(order.products || []).length} item{(order.products || []).length !== 1 ? "s" : ""}</span>
          <span>{expanded ? "▲ Hide" : "▼ Show items"}</span>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pb-4">
                {(order.products || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-zinc-950/60 p-2.5">
                    {productImages[item.productId] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={productImages[item.productId]}
                        alt={productNames[item.productId] || item.productId}
                        className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-100 truncate">
                        {productNames[item.productId] || item.productId}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Size: {item.size} · Qty: {item.qty}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-200 flex-shrink-0">
                      {formatINR(item.price * item.qty)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-white/10 bg-zinc-950/20">
        {/* Ship Order — shown when not yet shipped */}
        {!alreadyShipped && order.paymentStatus === "paid" && (
          <button
            onClick={() => setShowShipModal(true)}
            className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-cyan-300 transition"
          >
            🚚 Ship Order
          </button>
        )}

        {/* Retry Shipment — shown when auto-ship failed (paid + no AWB + processing) */}
        {autoShipFailed && (
          <button
            onClick={() => void handleRetryShipment()}
            disabled={retrying}
            title="Auto-shipment failed after payment. Click to retry."
            className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300 transition disabled:opacity-50"
          >
            {retrying ? "Retrying…" : "🔁 Retry Shipment"}
          </button>
        )}

        {/* Print / Download Invoice */}
        <a
          href={order.invoiceUrl || `/api/invoices/${encodeURIComponent(order.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5 transition"
        >
          🧾 Invoice
        </a>

        {/* Shipping label — admin downloads via proxy */}
        {(shipment?.awbNumber || order.awbNumber) && (
          <a
            href={`/api/delhivery/label/${encodeURIComponent(shipment?.awbNumber || order.awbNumber)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-violet-400/30 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-400/10 transition"
          >
            📦 Shipping Label
          </a>
        )}

        {/* Track */}
        {(shipment?.awbNumber || order.awbNumber) && (
          <a
            href={order.trackingUrl || `https://www.delhivery.com/track/package/${shipment?.awbNumber || order.awbNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/10 transition"
          >
            📍 Track
          </a>
        )}

        {/* Cancel */}
        {shipment && !["delivered", "cancelled", "rto"].includes(shipment.manifestStatus) && (
          <button
            onClick={() => void handleCancelShipment()}
            disabled={cancelling}
            className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 transition disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "✕ Cancel Shipment"}
          </button>
        )}
      </div>


      {/* Ship Order Modal */}
      <AnimatePresence>
        {showShipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowShipModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6"
            >
              <h3 className="text-lg font-bold text-zinc-100 mb-1">Ship Order</h3>
              <p className="text-sm text-zinc-400 mb-4">
                This will manifest a shipment with Delhivery and generate an AWB.
              </p>

              {addr && (
                <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3 text-sm text-zinc-300 mb-4">
                  <p className="font-semibold text-zinc-100">{addr.name}</p>
                  <p>{addr.addressLine1}{addr.addressLine2 ? ", " + addr.addressLine2 : ""}</p>
                  <p>{addr.phone || order.customerPhone}</p>

                </div>
              )}

              {/* Serviceability check */}
              <button
                onClick={() => void handleCheckServiceability()}
                className="mb-4 rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10 transition w-full"
              >
                Check Pincode Serviceability
              </button>
              {serviceability && (
                <p className={`text-xs mb-4 text-center font-semibold ${serviceability.ok ? "text-emerald-400" : "text-rose-400"}`}>
                  {serviceability.ok ? `✅ Serviceable — ${serviceability.city}` : "❌ Not serviceable by Delhivery"}
                </p>
              )}

              <label className="block mb-4">
                <span className="text-xs text-zinc-400 uppercase tracking-wider">Pickup Date (optional)</span>
                <input
                  type="date"
                  value={pickupDate}
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-zinc-100 text-sm"
                />
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowShipModal(false)}
                  className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleShipOrder()}
                  disabled={shipping || (serviceability !== null && !serviceability.ok)}
                  className="flex-1 rounded-lg bg-cyan-400 py-2.5 text-sm font-bold text-zinc-950 hover:bg-cyan-300 disabled:opacity-50 transition"
                >
                  {shipping ? "Creating Shipment…" : "Confirm & Ship"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
