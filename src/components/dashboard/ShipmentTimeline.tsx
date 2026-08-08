"use client";

import { motion } from "framer-motion";

export type TimelineStep = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

const TIMELINE_STEPS: TimelineStep[] = [
  { id: "order_confirmed",   label: "Order Confirmed",    description: "Your order was placed",              icon: "📋" },
  { id: "payment_verified",  label: "Payment Verified",   description: "Payment captured by Razorpay",       icon: "💳" },
  { id: "packed",            label: "Shipment Created",   description: "Shipment created with Delhivery",    icon: "📦" },
  { id: "pickup_scheduled",  label: "Pickup Scheduled",   description: "Pickup booked with Delhivery",       icon: "🗓️" },
  { id: "picked_up",         label: "Picked Up",          description: "Delhivery has collected the parcel", icon: "🏭" },
  { id: "in_transit",        label: "In Transit",         description: "On the way to your city",            icon: "🚚" },
  { id: "reached_hub",       label: "Reached Hub",        description: "At the local delivery hub",          icon: "🏢" },
  { id: "out_for_delivery",  label: "Out For Delivery",   description: "With the delivery agent",            icon: "🛵" },
  { id: "delivered",         label: "Delivered",          description: "Successfully delivered 🎉",          icon: "✅" },
];

const STEP_INDEX: Record<string, number> = Object.fromEntries(
  TIMELINE_STEPS.map((s, i) => [s.id, i])
);

export interface ScanEvent {
  date: string;
  time: string;
  location: string;
  status: string;
  statusCode?: string;
  instructions?: string;
}

interface ShipmentTimelineProps {
  currentStepId: string;
  events?: ScanEvent[];
  awb?: string;
  courierPartner?: string;
  expectedDelivery?: string;
}

export function ShipmentTimeline({
  currentStepId,
  events = [],
  awb,
  courierPartner = "Delhivery",
  expectedDelivery,
}: ShipmentTimelineProps) {
  const currentIndex = STEP_INDEX[currentStepId] ?? 1;

  return (
    <div className="py-4">
      {/* Courier info bar */}
      {awb && (
        <div className="mb-4 rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-semibold">{courierPartner}</span>
              {" · "}
              <span className="font-mono">{awb}</span>
            </span>
            {expectedDelivery && (
              <span className="text-cyan-300">
                Est. Delivery:{" "}
                <span className="font-semibold">
                  {new Date(expectedDelivery).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </span>
            )}
          </div>
          <a
            href={`https://www.delhivery.com/track/package/${awb}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-cyan-400 underline hover:text-cyan-300"
          >
            Track on Delhivery →
          </a>
        </div>
      )}

      {/* Step Bubbles */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-white/10" />

        <div className="space-y-2">
          {TIMELINE_STEPS.map((step, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className="relative flex items-start gap-4 pl-0"
              >
                {/* Bubble */}
                <div className="relative z-10 flex-shrink-0">
                  {isCurrent ? (
                    <motion.div
                      className="h-10 w-10 rounded-full bg-cyan-400 flex items-center justify-center text-zinc-950 text-sm shadow-lg shadow-cyan-400/30"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      {step.icon}
                    </motion.div>
                  ) : isCompleted ? (
                    <motion.div
                      className="h-10 w-10 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 text-sm"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, delay: index * 0.06 }}
                    >
                      ✓
                    </motion.div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-600 text-sm">
                      {step.icon}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <p
                    className={`text-sm font-semibold leading-tight ${
                      isCurrent
                        ? "text-cyan-300"
                        : isCompleted
                        ? "text-zinc-100"
                        : "text-zinc-600"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      isCompleted ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Live Scan Events from Delhivery */}
      {events.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-3">
            Live Scan History
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {[...events].reverse().map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-lg bg-zinc-950/60 border border-white/5 p-2.5"
              >
                <div className="flex gap-3 text-xs text-zinc-400">
                  <div className="flex-shrink-0 text-zinc-600 min-w-[72px]">
                    <p>{event.date}</p>
                    <p>{event.time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 font-medium">{event.status}</p>
                    {event.statusCode && (
                      <span className="inline-block mt-0.5 rounded-full bg-zinc-800 px-1.5 py-0.5 text-zinc-500 font-mono text-[10px]">
                        {event.statusCode}
                      </span>
                    )}
                    {event.location && (
                      <p className="mt-0.5 text-zinc-500">📍 {event.location}</p>
                    )}
                    {event.instructions && (
                      <p className="mt-0.5 italic text-zinc-600">{event.instructions}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* No events yet */}
      {events.length === 0 && currentIndex >= 2 && (
        <div className="mt-4 rounded-lg bg-zinc-900/50 border border-white/5 p-3 text-center text-xs text-zinc-500">
          Tracking scan events will appear here once Delhivery begins processing your shipment.
        </div>
      )}
    </div>
  );
}

/** Map shipment status string to timeline step ID */
export function shipmentStatusToTimelineStep(status: string): string {
  const map: Record<string, string> = {
    pending: "order_confirmed",
    processing: "payment_verified",
    manifested: "packed",
    pickup_scheduled: "pickup_scheduled",
    picked_up: "picked_up",
    in_transit: "in_transit",
    reached_hub: "reached_hub",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    cancelled: "delivered",
    rto: "in_transit",
    exception: "in_transit",
    packed: "packed",
  };
  return map[status] || "payment_verified";
}
