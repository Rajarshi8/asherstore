/**
 * GET /api/shipping/[orderId]
 *
 * Unified order + shipment + live tracking endpoint.
 *
 * Throttled pull reconciliation: calls Delhivery live tracking
 * only if lastTrackingUpdate is older than 5 minutes.
 */
import { getCurrentUser } from "@/lib/appwrite-server";
import { getOrderByIdRepo, updateOrderRepo } from "@/repositories/orderRepository";
import { getShipmentByOrderIdRepo, updateShipmentRepo } from "@/repositories/shipmentRepository";
import { getDelhiveryConfig } from "@/services/delhivery/delhiveryClient";
import { fetchLiveTracking } from "@/services/delhivery/delhiveryTracking";
import { getTrackingEventsByAwb } from "@/repositories/trackingEventRepository";
import { logger } from "@/utils/logger";
import type { ManifestStatus } from "@/types/shipment";
import type { ShippingStatus } from "@/types/order";

export const runtime = "nodejs";

const TRACKING_THROTTLE_MINUTES = 5;

const STATUS_CODE_MAP: Record<string, { manifest: ManifestStatus; order: ShippingStatus }> = {
  MNF: { manifest: "manifested",       order: "manifested" },
  PKD: { manifest: "pickup_scheduled", order: "pickup_scheduled" },
  PU:  { manifest: "picked_up",        order: "picked_up" },
  IT:  { manifest: "in_transit",       order: "in_transit" },
  OH:  { manifest: "in_transit",       order: "reached_hub" },
  OP:  { manifest: "in_transit",       order: "reached_hub" },
  OFD: { manifest: "out_for_delivery", order: "out_for_delivery" },
  DL:  { manifest: "delivered",        order: "delivered" },
  RTO: { manifest: "rto",             order: "cancelled" },
  CNL: { manifest: "cancelled",        order: "cancelled" },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  if (!orderId) {
    return Response.json({ error: "Order ID is required" }, { status: 400 });
  }

  const order = await getOrderByIdRepo(orderId);
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  if (user.role !== "admin" && order.userId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const shipment = await getShipmentByOrderIdRepo(orderId);

  // No AWB yet — return order-only response with preparation message
  if (!shipment?.awbNumber) {
    return Response.json({
      order: {
        id: order.id,
        orderId: order.orderId,
        paymentStatus: order.paymentStatus,
        shipmentStatus: order.shipmentStatus,
        awbNumber: "",
        courierPartner: "",
        trackingUrl: "",
        estimatedDelivery: "",
        createdAt: order.createdAt,
      },
      shipment: null,
      tracking: null,
      message:
        order.paymentStatus === "paid"
          ? "Your payment was successful. Your shipment is being prepared."
          : "Order placed. Tracking will be available after payment and shipment creation.",
    });
  }

  const awbNumber = shipment.awbNumber;
  const lastUpdate = shipment.lastTrackingUpdate
    ? new Date(shipment.lastTrackingUpdate).getTime()
    : 0;
  const minutesSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60);

  let liveTracking = null;
  let reconciled = false;

  if (minutesSinceUpdate >= TRACKING_THROTTLE_MINUTES) {
    try {
      const config = getDelhiveryConfig();
      liveTracking = await fetchLiveTracking(config, awbNumber);

      const statusMapping = STATUS_CODE_MAP[liveTracking.statusCode?.toUpperCase()] ?? {
        manifest: "in_transit" as ManifestStatus,
        order: "in_transit" as ShippingStatus,
      };

      if (liveTracking.status !== shipment.currentStatus) {
        await updateShipmentRepo(shipment.id, {
          manifestStatus: statusMapping.manifest,
          currentStatus: liveTracking.status,
          ...(liveTracking.expectedDelivery
            ? { expectedDelivery: liveTracking.expectedDelivery }
            : {}),
        });

        await updateOrderRepo(orderId, {
          shipmentStatus: statusMapping.order,
          ...(liveTracking.expectedDelivery
            ? { estimatedDelivery: liveTracking.expectedDelivery }
            : {}),
        });

        reconciled = true;

        logger.info({
          event: "[APPWRITE] Tracking reconciled via pull",
          context: "ShippingRoute",
          data: {
            orderId,
            awbNumber,
            oldStatus: shipment.currentStatus,
            newStatus: liveTracking.status,
          },
        });
      }
    } catch (trackingErr) {
      logger.warn({
        event: "[DELHIVERY] Pull tracking failed — using cached data",
        context: "ShippingRoute",
        data: { orderId, awbNumber, error: trackingErr instanceof Error ? trackingErr.message : String(trackingErr) },
      });
    }
  }

  // Fetch scan events from tracking_events collection
  const scanEvents = await getTrackingEventsByAwb(awbNumber);

  const currentStatus = liveTracking?.status || shipment.currentStatus;
  const expectedDelivery = liveTracking?.expectedDelivery || shipment.expectedDelivery;

  return Response.json({
    order: {
      id: order.id,
      orderId: order.orderId,
      customerName: order.customerName,
      products: order.products,
      subtotal: order.subtotal,
      shippingCharge: order.shippingCharge,
      total: order.total,
      paymentStatus: order.paymentStatus,
      shipmentStatus: order.shipmentStatus,
      awbNumber,
      courierPartner: shipment.courierPartner || "Delhivery",
      trackingUrl: shipment.trackingUrl,
      estimatedDelivery: expectedDelivery,
      shippingLabelUrl: shipment.shippingLabelUrl,
      invoiceUrl: shipment.invoiceUrl,
      createdAt: order.createdAt,
    },
    shipment: {
      id: shipment.id,
      shipmentId: shipment.shipmentId,
      awbNumber,
      currentStatus,
      manifestStatus: shipment.manifestStatus,
      pickupRequestId: shipment.pickupRequestId,
      shippingLabelUrl: shipment.shippingLabelUrl,
      createdAt: shipment.createdAt,
    },
    tracking: {
      awbNumber,
      status: currentStatus,
      expectedDelivery,
      origin: liveTracking?.origin || "",
      destination: liveTracking?.destination || "",
      isDelivered:
        liveTracking?.isDelivered || shipment.manifestStatus === "delivered",
      events: liveTracking?.events || scanEvents.map((e) => ({
        date: e.timestamp.slice(0, 10),
        time: e.timestamp.slice(11, 19),
        location: e.statusLocation || "",
        status: e.status,
        statusCode: e.statusCode || "",
        instructions: e.instructions,
      })),
      trackingUrl: shipment.trackingUrl,
      courierPartner: "Delhivery",
      lastUpdated: reconciled ? new Date().toISOString() : shipment.lastTrackingUpdate,
      cached: !liveTracking,
    },
  });
}
