"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import type { ProductionOrder } from "@/types/order";
import type { Product } from "@/lib/types";
import { formatINR, resolveProductImageSrc } from "@/lib/utils";
import {
  ShipmentTimeline,
  shipmentStatusToTimelineStep,
  type ScanEvent,
} from "@/components/dashboard/ShipmentTimeline";

interface TrackingData {
  awb: string;
  status: string;
  statusCode?: string;
  shipmentStatus?: string;
  manifestStatus?: string;
  expectedDelivery?: string;
  origin?: string;
  destination?: string;
  isDelivered?: boolean;
  events?: ScanEvent[];
  cached?: boolean;
}

interface OrderTrackingCardProps {
  order: ProductionOrder;
  catalog: Product[];
}

export function OrderTrackingCard({ order, catalog }: OrderTrackingCardProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);

  const orderItems = order.products || [];
  const primaryItem = orderItems[0];
  const primaryProduct = catalog.find((p) => p.id === primaryItem?.productId);
  const activeAwb = order.awbNumber || "";

  const hasShipment = Boolean(activeAwb);
  const isProcessing = !hasShipment && order.shipmentStatus === "processing";
  const shipmentFailed = !hasShipment && order.paymentStatus === "paid" && !isProcessing;

  async function handleOpenTracking() {
    setShowTimeline(true);
    if (!activeAwb) return;

    setLoadingTracking(true);
    try {
      const res = await fetch(`/api/delhivery/track?awb=${encodeURIComponent(activeAwb)}`);
      const json = await res.json() as TrackingData & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Failed to fetch tracking info");
      }
      setTrackingData(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load tracking data");
    } finally {
      setLoadingTracking(false);
    }
  }

  const currentStep = trackingData?.manifestStatus
    ? shipmentStatusToTimelineStep(trackingData.manifestStatus)
    : shipmentStatusToTimelineStep(order.shipmentStatus || "processing");

  const displayStatus = (order.shipmentStatus || "processing").replace(/_/g, " ");

  return (
    <article className="rounded-xl border border-white/10 bg-zinc-950/70 p-4 transition hover:border-white/20">
      {/* Order Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-200">Order #{order.orderId || order.id}</p>
          <p className="text-xs text-zinc-500">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="text-right text-xs text-zinc-400">
          <p className="font-semibold text-zinc-200">{formatINR(order.total)}</p>
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <span className="capitalize text-cyan-400 font-medium">{displayStatus}</span>
            <span className="text-zinc-600">&bull;</span>
            <span className="capitalize text-emerald-400">{order.paymentStatus}</span>
          </div>
        </div>
      </div>

      {/* Product Items */}
      {orderItems.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {orderItems.map((item) => {
            const product = catalog.find((entry) => entry.id === item.productId);
            const imageSrc = resolveProductImageSrc(product?.images?.[0]);
            const name = product?.name || item.productId;

            return (
              <div
                key={`${order.id}-${item.productId}-${item.size}`}
                className="flex gap-3 rounded-lg border border-white/10 bg-zinc-900/60 p-3"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10 flex-shrink-0">
                  <Image src={imageSrc} alt={name} fill sizes="64px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{name}</p>
                  <p className="text-xs text-zinc-400">Size {item.size} &bull; Qty {item.qty}</p>
                  <p className="text-xs text-zinc-300 font-medium">{formatINR(item.price * item.qty)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">No item details available for this order.</p>
      )}

      {/* AWB / Shipment Info Banner */}
      {hasShipment ? (
        <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cyan-200">
            <div>
              <span className="font-semibold">Courier:</span>{" "}
              {order.courierPartner || "Delhivery"}
              {" · "}
              <span className="font-semibold">AWB:</span>{" "}
              <span className="font-mono">{activeAwb}</span>
            </div>
            {(trackingData?.expectedDelivery || order.estimatedDelivery) && (
              <div className="text-cyan-300">
                <span className="font-semibold">Est. Delivery:</span>{" "}
                {trackingData?.expectedDelivery || order.estimatedDelivery}
              </div>
            )}
          </div>
          <a
            href={`https://www.delhivery.com/track/package/${activeAwb}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-xs text-cyan-500 hover:text-cyan-400 underline"
          >
            Track on Delhivery.com →
          </a>
        </div>
      ) : isProcessing ? (
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2.5 text-xs text-amber-300">
          <p className="font-semibold">⏳ Shipment Being Prepared</p>
          <p className="mt-0.5 text-amber-400/80">
            Your shipment is being created with Delhivery. Tracking will be available shortly.
          </p>
        </div>
      ) : shipmentFailed ? (
        <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-950/20 px-3 py-2.5 text-xs text-rose-300">
          <p className="font-semibold">⚠️ Shipment Pending</p>
          <p className="mt-0.5 text-rose-400/80">
            Payment was successful. Our team will prepare your shipment shortly.
          </p>
        </div>
      ) : null}

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
        {hasShipment ? (
          <button
            onClick={() => void handleOpenTracking()}
            className="rounded-lg bg-cyan-400 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-cyan-300 active:scale-95"
          >
            🚚 Track Shipment
          </button>
        ) : (
          <button
            disabled
            title="Tracking will be available once your shipment is created"
            className="rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-zinc-500 cursor-not-allowed opacity-60"
          >
            ⏳ Shipment Processing
          </button>
        )}

        <a
          href={order.invoiceUrl || `/api/invoices/${encodeURIComponent(order.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/5"
        >
          📄 Invoice
        </a>

        {primaryProduct ? (
          <Link
            href={`/products/${primaryProduct.id}`}
            className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/5"
          >
            Buy Again
          </Link>
        ) : null}
      </div>

      {/* Live Tracking Timeline Modal */}
      <AnimatePresence>
        {showTimeline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowTimeline(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">Live Shipment Tracking</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Order #{order.orderId || order.id}
                    {activeAwb && <> &bull; AWB: <span className="font-mono text-cyan-400">{activeAwb}</span></>}
                  </p>
                </div>
                <button
                  onClick={() => setShowTimeline(false)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white ml-4 flex-shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Loading State */}
              {loadingTracking ? (
                <div className="py-12 text-center">
                  <div className="mx-auto h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3" />
                  <p className="text-sm text-zinc-400">Fetching latest status from Delhivery...</p>
                </div>
              ) : !activeAwb ? (
                <div className="py-8 text-center">
                  <p className="text-2xl mb-2">⏳</p>
                  <p className="text-sm font-semibold text-zinc-200">Shipment Being Prepared</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Your shipment is being created with Delhivery. <br />
                    Tracking will be available once an AWB is assigned.
                  </p>
                </div>
              ) : (
                <ShipmentTimeline
                  currentStepId={currentStep}
                  events={trackingData?.events || []}
                  awb={activeAwb}
                  courierPartner={order.courierPartner || "Delhivery"}
                  expectedDelivery={trackingData?.expectedDelivery || order.estimatedDelivery}
                />
              )}

              {/* Cached data notice */}
              {trackingData?.cached && (
                <p className="mt-3 text-center text-xs text-zinc-600">
                  Showing cached tracking data · Retrying live feed...
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
