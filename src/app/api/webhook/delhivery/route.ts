/**
 * POST /api/webhook/delhivery
 *
 * Real-time scan event webhook from Delhivery Push API.
 *
 * Configure webhook URL in Delhivery dashboard:
 *   https://your-domain.com/api/webhook/delhivery
 *
 * Idempotency: each scan event gets a deterministic eventKey.
 * Duplicate deliveries are silently skipped.
 *
 * Fields updated in Appwrite Shipments (schema-aligned only):
 *   currentStatus, manifestStatus, expectedDelivery, lastTrackingUpdate, updatedAt
 *
 * Fields updated in Appwrite Orders:
 *   shipmentStatus, estimatedDelivery
 *
 * Tracking events (per-scan history) are stored in the
 * separate tracking_events collection via TrackingEventRepository.
 */
import { getShipmentByAwbRepo, updateShipmentRepo } from "@/repositories/shipmentRepository";
import { updateOrderRepo } from "@/repositories/orderRepository";
import { upsertTrackingEvent } from "@/repositories/trackingEventRepository";
import { logger } from "@/utils/logger";
import type { ManifestStatus } from "@/types/shipment";
import type { ShippingStatus } from "@/types/order";

export const runtime = "nodejs";

const STATUS_MAP: Record<string, { manifest: ManifestStatus; order: ShippingStatus }> = {
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
  EXP: { manifest: "exception",        order: "in_transit" },
};

interface DelhiveryWebhookEvent {
  waybill?: string;
  status?: string;
  "status-code"?: string;
  "scanned-location"?: string;
  instructions?: string;
  "expected-date"?: string;
  "updated-at"?: string;
  "pickup-date"?: string;
}

interface DelhiveryWebhookBody {
  waybill?: string;
  status?: string;
  "status-code"?: string;
  "scanned-location"?: string;
  instructions?: string;
  "expected-date"?: string;
  "updated-at"?: string;
  data?: DelhiveryWebhookEvent[];
  ShipmentData?: Array<{
    Shipment?: {
      AWB?: string;
      Status?: { Status?: string; StatusCode?: string; ExpectedDeliveryDate?: string };
      Scans?: Array<{
        ScanDetail?: {
          ScanDateTime?: string;
          Scan?: string;
          StatusCode?: string;
          Instructions?: string;
          ScannedLocation?: string;
        };
      }>;
    };
  }>;
}

function extractEvents(body: DelhiveryWebhookBody): DelhiveryWebhookEvent[] {
  // Format 1: { data: [...events] }
  if (Array.isArray(body.data) && body.data.length > 0) {
    return body.data;
  }
  // Format 2: ShipmentData array (tracking API format reused as webhook)
  if (Array.isArray(body.ShipmentData)) {
    const events: DelhiveryWebhookEvent[] = [];
    for (const entry of body.ShipmentData) {
      const shipment = entry.Shipment;
      if (!shipment?.AWB) continue;
      const statusInfo = shipment.Status;
      for (const scan of shipment.Scans || []) {
        const d = scan.ScanDetail;
        if (d) {
          events.push({
            waybill: shipment.AWB,
            status: d.Scan || statusInfo?.Status || "",
            "status-code": d.StatusCode || statusInfo?.StatusCode || "",
            "scanned-location": d.ScannedLocation || "",
            instructions: d.Instructions || "",
            "updated-at": d.ScanDateTime || "",
            "expected-date": statusInfo?.ExpectedDeliveryDate,
          });
        }
      }
    }
    return events;
  }
  // Format 3: single root-level event
  if (body.waybill || body.status) {
    return [body as DelhiveryWebhookEvent];
  }
  return [];
}

export async function POST(request: Request) {
  // Parse body
  let body: unknown;
  try {
    const text = await request.text();
    body = JSON.parse(text);
  } catch {
    return Response.json({ received: true }, { status: 200 });
  }

  // Optional webhook secret validation
  const webhookSecret = process.env.DELHIVERY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const authHeader =
      request.headers.get("Authorization") || request.headers.get("authorization");
    if (!authHeader || authHeader !== `Token ${webhookSecret}`) {
      logger.warn({
        event: "[DELHIVERY] Webhook unauthorized request",
        context: "DelhiveryWebhook",
      });
      return Response.json({ received: true }, { status: 200 });
    }
  }

  logger.info({
    event: "[DELHIVERY] Webhook received",
    context: "DelhiveryWebhook",
  });

  const events = extractEvents(body as DelhiveryWebhookBody);
  if (!events.length) {
    return Response.json({ received: true }, { status: 200 });
  }

  for (const event of events) {
    const awbNumber = (event.waybill || "").trim();
    if (!awbNumber) continue;

    const statusCode = (event["status-code"] || "").trim().toUpperCase();
    const statusText = event.status || statusCode || "Unknown";
    const location = event["scanned-location"] || "";
    const instructions = event.instructions || "";
    const expectedDelivery = event["expected-date"];
    const rawTimestamp = event["updated-at"] || event["pickup-date"] || new Date().toISOString();

    let timestamp = rawTimestamp;
    try {
      const d = new Date(rawTimestamp);
      if (!isNaN(d.getTime())) {
        timestamp = d.toISOString();
      }
    } catch {
      timestamp = new Date().toISOString();
    }

    logger.info({
      event: "[DELHIVERY] Webhook processing scan event",
      context: "DelhiveryWebhook",
      data: { awbNumber, statusCode, statusText, location },
    });

    try {
      // Look up shipment by awbNumber (Appwrite field name)
      const shipment = await getShipmentByAwbRepo(awbNumber);
      if (!shipment) {
        logger.warn({
          event: "[APPWRITE] Webhook: no shipment found for AWB",
          context: "DelhiveryWebhook",
          data: { awbNumber },
        });
        continue;
      }

      const mapping = STATUS_MAP[statusCode] ?? {
        manifest: "in_transit" as ManifestStatus,
        order: "in_transit" as ShippingStatus,
      };

      // Idempotent tracking event insert
      await upsertTrackingEvent({
        shipmentId: shipment.shipmentId,
        orderId: shipment.orderId,
        awbNumber,
        status: statusText,
        statusCode,
        statusLocation: location,
        instructions,
        timestamp,
      });

      // Update Shipments (schema-valid fields only — no trackingEvents)
      await updateShipmentRepo(shipment.id, {
        manifestStatus: mapping.manifest,
        currentStatus: statusText,
        ...(expectedDelivery ? { expectedDelivery } : {}),
      });

      // Update Orders
      await updateOrderRepo(shipment.orderId, {
        shipmentStatus: mapping.order,
        ...(expectedDelivery ? { estimatedDelivery: expectedDelivery } : {}),
      });

      logger.info({
        event: "[APPWRITE] Webhook: shipment + order updated",
        context: "DelhiveryWebhook",
        data: {
          awbNumber,
          orderId: shipment.orderId,
          statusCode,
          manifestStatus: mapping.manifest,
          orderStatus: mapping.order,
        },
      });
    } catch (error) {
      logger.error({
        event: "[APPWRITE] Webhook: error processing event",
        context: "DelhiveryWebhook",
        error,
        data: { awbNumber, statusCode },
      });
    }
  }

  return Response.json({ received: true }, { status: 200 });
}
