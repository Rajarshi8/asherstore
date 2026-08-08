/**
 * GET /api/delhivery/track?awb=XXXXXX
 *
 * Live shipment tracking — fetches live status from Delhivery and
 * updates Appwrite Shipments + Orders documents.
 *
 * Query param: awb (the Delhivery AWB number, stored as awbNumber in Appwrite)
 */
import { z } from "zod";
import { getCurrentUser } from "@/lib/appwrite-server";
import { getDelhiveryConfig } from "@/services/delhivery/delhiveryClient";
import { fetchLiveTracking } from "@/services/delhivery/delhiveryTracking";
import { getShipmentByAwbRepo, updateShipmentRepo } from "@/repositories/shipmentRepository";
import { getOrderByIdRepo, updateOrderRepo } from "@/repositories/orderRepository";
import { logger } from "@/utils/logger";
import type { ManifestStatus } from "@/types/shipment";
import type { ShippingStatus } from "@/types/order";

export const runtime = "nodejs";

const schema = z.object({
  awb: z.string().trim().min(1),
});

const STATUS_CODE_MAP: Record<string, { manifest: ManifestStatus; order: ShippingStatus }> = {
  MNF: { manifest: "manifested",        order: "manifested" },
  PKD: { manifest: "pickup_scheduled",  order: "pickup_scheduled" },
  PU:  { manifest: "picked_up",         order: "picked_up" },
  IT:  { manifest: "in_transit",        order: "in_transit" },
  OH:  { manifest: "in_transit",        order: "reached_hub" },
  OP:  { manifest: "in_transit",        order: "reached_hub" },
  OFD: { manifest: "out_for_delivery",  order: "out_for_delivery" },
  DL:  { manifest: "delivered",         order: "delivered" },
  RTO: { manifest: "rto",              order: "cancelled" },
  CNL: { manifest: "cancelled",         order: "cancelled" },
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({ awb: searchParams.get("awb") });
  if (!parsed.success) {
    return Response.json({ error: "Missing or invalid AWB parameter" }, { status: 400 });
  }

  const awbNumber = parsed.data.awb;

  // Look up shipment using awbNumber (Appwrite field name)
  const shipment = await getShipmentByAwbRepo(awbNumber);
  if (!shipment) {
    return Response.json({ error: `No shipment found for AWB ${awbNumber}` }, { status: 404 });
  }

  // Non-admins can only track their own orders
  if (user.role !== "admin") {
    const order = await getOrderByIdRepo(shipment.orderId);
    if (!order || order.userId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const config = getDelhiveryConfig();

  try {
    logger.info({
      event: "[DELHIVERY] Fetching live tracking",
      context: "TrackRoute",
      data: { awbNumber, orderId: shipment.orderId },
    });

    const tracking = await fetchLiveTracking(config, awbNumber);

    logger.info({
      event: "[DELHIVERY] Live tracking response",
      context: "TrackRoute",
      data: {
        awbNumber,
        status: tracking.status,
        statusCode: tracking.statusCode,
        expectedDelivery: tracking.expectedDelivery,
        eventCount: tracking.events.length,
      },
    });

    const statusMapping = STATUS_CODE_MAP[tracking.statusCode?.toUpperCase()] ?? {
      manifest: "in_transit" as ManifestStatus,
      order: "in_transit" as ShippingStatus,
    };

    // Update Shipments document (only schema-valid fields)
    await updateShipmentRepo(shipment.id, {
      manifestStatus: statusMapping.manifest,
      currentStatus: tracking.status,
      ...(tracking.expectedDelivery ? { expectedDelivery: tracking.expectedDelivery } : {}),
    });

    // Update Orders document
    await updateOrderRepo(shipment.orderId, {
      shipmentStatus: statusMapping.order,
      estimatedDelivery: tracking.expectedDelivery || undefined,
    });

    return Response.json({
      awb: awbNumber,
      awbNumber,
      orderId: shipment.orderId,
      status: tracking.status,
      statusCode: tracking.statusCode,
      manifestStatus: statusMapping.manifest,
      shipmentStatus: statusMapping.order,
      expectedDelivery: tracking.expectedDelivery,
      origin: tracking.origin,
      destination: tracking.destination,
      events: tracking.events,
      isDelivered: tracking.isDelivered,
      courierPartner: "Delhivery",
      trackingUrl: shipment.trackingUrl,
    });
  } catch (error) {
    logger.warn({
      event: "[DELHIVERY] Live tracking failed — returning cached data",
      context: "TrackRoute",
      data: { awbNumber, error: error instanceof Error ? error.message : String(error) },
    });

    // Return cached data from Appwrite on Delhivery network failure
    return Response.json({
      awb: awbNumber,
      awbNumber,
      orderId: shipment.orderId,
      status: shipment.currentStatus,
      manifestStatus: shipment.manifestStatus,
      shipmentStatus: shipment.manifestStatus,
      expectedDelivery: shipment.expectedDelivery,
      events: [],
      isDelivered: shipment.manifestStatus === "delivered",
      courierPartner: "Delhivery",
      trackingUrl: shipment.trackingUrl,
      cached: true,
      error: error instanceof Error ? error.message : "Tracking unavailable",
    });
  }
}
