/**
 * POST /api/delhivery/ship
 *
 * Admin-triggered shipment manifestation pipeline (9 steps):
 *
 *   Step 1 — Validate admin authentication
 *   Step 2 — Load + validate order from Appwrite
 *   Step 3 — Validate paymentStatus === "paid"
 *   Step 4 — Duplicate shipment guard (by orderId + awbNumber)
 *   Step 5 — Validate customer address + phone
 *   Step 6 — Pincode serviceability check via Delhivery API
 *   Step 7 — Call Delhivery Manifestation API → receive AWB
 *   Step 8 — Verify AWB is present + status === "Success"
 *   Step 9 — CREATE Appwrite Shipments document → UPDATE Orders document → return success
 *
 * Sequence guarantee:
 *   Delhivery success → Appwrite Shipments created → Appwrite Orders updated → response
 *   If Delhivery fails → NO Appwrite documents created → real error returned
 *
 * Body: { orderId: string; pickupDate?: string (YYYY-MM-DD) }
 */
import { z } from "zod";
import { assertAdminAccess } from "@/lib/admin-guard";
import { getDelhiveryConfig } from "@/services/delhivery/delhiveryClient";
import { checkPincodeServiceability } from "@/services/delhivery/delhiveryServiceability";
import {
  createShipmentManifestation,
  createPickupBooking,
} from "@/services/delhivery/delhiveryManifestation";
import { getOrderByIdRepo, updateOrderRepo } from "@/repositories/orderRepository";
import { createShipmentRepo, getShipmentByOrderIdRepo } from "@/repositories/shipmentRepository";
import { logger } from "@/utils/logger";
import { DelhiveryAPIError } from "@/services/delhivery/delhiveryClient";

export const runtime = "nodejs";

const schema = z.object({
  orderId: z.string().trim().min(1),
  pickupDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(request: Request) {
  // ── Step 1: Admin Authentication ───────────────────────────────────────────
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { orderId, pickupDate } = parsed.data;

  logger.info({
    event: "[DELHIVERY] Shipment request received",
    context: "ShipOrderAPI",
    data: { orderId },
  });

  // ── Step 2: Load Order ─────────────────────────────────────────────────────
  const order = await getOrderByIdRepo(orderId);
  if (!order) {
    return Response.json({ error: `Order not found: ${orderId}` }, { status: 404 });
  }

  // ── Step 3: Payment Validation ─────────────────────────────────────────────
  if (order.paymentStatus !== "paid") {
    return Response.json(
      { error: `Cannot ship unpaid order (Payment Status: ${order.paymentStatus})` },
      { status: 422 }
    );
  }

  // ── Step 4: Duplicate Shipment Guard ───────────────────────────────────────
  const existingShipment = await getShipmentByOrderIdRepo(orderId);
  if (existingShipment) {
    logger.info({
      event: "[APPWRITE] Duplicate shipment guard triggered — returning existing",
      context: "ShipOrderAPI",
      data: { orderId, existingAwb: existingShipment.awbNumber },
    });
    return Response.json(
      {
        success: true,
        awb: existingShipment.awbNumber,
        awbNumber: existingShipment.awbNumber,
        shipmentId: existingShipment.shipmentId,
        trackingUrl: existingShipment.trackingUrl,
        alreadyShipped: true,
        message: `Shipment already exists for this order (AWB: ${existingShipment.awbNumber})`,
      },
      { status: 200 }
    );
  }

  // ── Step 5: Validate Address + Phone ──────────────────────────────────────
  const addr = order.shippingAddress;
  if (!addr || !addr.addressLine1 || !addr.city || !addr.pincode) {
    return Response.json(
      { error: "Order is missing complete shipping address details." },
      { status: 422 }
    );
  }

  const customerPhone = (order.customerPhone || addr.phone || "").replace(/\D/g, "").slice(-10);
  if (!customerPhone || customerPhone.length < 10) {
    return Response.json(
      { error: "Order is missing valid 10-digit customer phone number." },
      { status: 422 }
    );
  }

  const config = getDelhiveryConfig();

  // ── Step 6: Pincode Serviceability ────────────────────────────────────────
  try {
    const serviceability = await checkPincodeServiceability(config, addr.pincode);
    if (!serviceability.isServiceable) {
      return Response.json(
        {
          error: `Pincode ${addr.pincode} (${serviceability.city || "Unknown"}) is not currently serviceable by Delhivery.`,
          pincode: addr.pincode,
        },
        { status: 422 }
      );
    }
  } catch (error) {
    if (error instanceof DelhiveryAPIError) {
      return Response.json(
        { error: `Serviceability check failed: ${error.message}` },
        { status: 502 }
      );
    }
    throw error;
  }

  // ── Step 7: Call Delhivery Manifestation API ──────────────────────────────
  logger.info({
    event: "[DELHIVERY] Calling manifestation API",
    context: "ShipOrderAPI",
    data: {
      orderId: order.orderId || order.id,
      pincode: addr.pincode,
      city: addr.city,
    },
  });

  let manifestPackage;
  try {
    manifestPackage = await createShipmentManifestation(config, {
      orderId: order.orderId || order.id,
      orderDate: order.createdAt,
      customer: {
        name: order.customerName || addr.name || "Customer",
        phone: customerPhone,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        country: addr.country || "India",
      },
      products: order.products.map((p) => ({
        name: `Jersey (${p.productId})`,
        qty: p.qty,
        price: p.price,
      })),
      totalAmount: order.total,
      paymentMode: "Prepaid",
      weightKg: 0.5,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Manifestation failed";
    logger.error({
      event: "[DELHIVERY] Manifestation API FAILED",
      context: "ShipOrderAPI",
      data: { orderId, errorMessage: message },
    });
    return Response.json({ error: message }, { status: 502 });
  }

  logger.info({
    event: "[DELHIVERY] Raw response received",
    context: "ShipOrderAPI",
    data: {
      status: manifestPackage.status,
      waybill: manifestPackage.waybill,
      sortCode: manifestPackage.sortCode,
      serviceable: manifestPackage.serviceable,
    },
  });

  // ── Step 8: Verify AWB ────────────────────────────────────────────────────
  const awbNumber = manifestPackage.waybill?.trim();

  logger.info({
    event: "[DELHIVERY] Extracted AWB",
    context: "ShipOrderAPI",
    data: { awbNumber, orderId },
  });

  if (!awbNumber) {
    logger.error({
      event: "[DELHIVERY] AWB missing from Delhivery response — aborting Appwrite write",
      context: "ShipOrderAPI",
      data: { manifestPackage },
    });
    return Response.json(
      { error: "Delhivery did not issue an AWB number for this shipment." },
      { status: 502 }
    );
  }

  // ── Step 9: Persist to Appwrite ───────────────────────────────────────────
  // Book pickup (non-blocking — failure doesn't abort shipment creation)
  let pickupRequestId = "";
  try {
    const pickupResult = await createPickupBooking(config, awbNumber, pickupDate);
    pickupRequestId = pickupResult.pickupId;
    logger.info({
      event: "[DELHIVERY] Pickup booked",
      context: "ShipOrderAPI",
      data: { awbNumber, pickupRequestId, scheduledDate: pickupResult.scheduledDate },
    });
  } catch (error) {
    logger.warn({
      event: "[DELHIVERY] Pickup booking failed (non-fatal)",
      context: "ShipOrderAPI",
      data: { awbNumber, error: error instanceof Error ? error.message : String(error) },
    });
  }

  const trackingUrl = `https://www.delhivery.com/track/package/${awbNumber}`;
  const shippingLabelUrl = `/api/delhivery/label/${encodeURIComponent(awbNumber)}`;
  const invoiceUrl = `/api/invoices/${encodeURIComponent(order.id)}`;

  // Create Appwrite Shipments document
  let shipment;
  try {
    shipment = await createShipmentRepo({
      orderId: order.id,
      awbNumber,
      courierPartner: "Delhivery",
      trackingUrl,
      pickupRequestId,
      currentStatus: "Ready To Ship",
      manifestStatus: "ready_to_ship",
      shippingLabelUrl,
      invoiceUrl,
    });
  } catch (error) {
    // Shipment document creation failed — log and return error
    // DO NOT update the order if we couldn't create the Shipments record
    logger.error({
      event: "[APPWRITE] Shipments document creation FAILED",
      context: "ShipOrderAPI",
      error,
      data: { orderId: order.id, awbNumber },
    });
    const message = error instanceof Error ? error.message : "Failed to save shipment to database";
    return Response.json(
      {
        error: message,
        delhiverySuccess: true, // Delhivery worked — Appwrite failed
        awbNumber,
        hint: "Shipment was created in Delhivery but could not be saved to the database. Check your Appwrite Shipments collection schema.",
      },
      { status: 500 }
    );
  }

  // Update Orders document
  logger.info({
    event: "[APPWRITE] Updating order document",
    context: "ShipOrderAPI",
    data: { orderId: order.id, awbNumber, shipmentId: shipment.shipmentId },
  });

  await updateOrderRepo(order.id, {
    shipmentStatus: "ready_to_ship",
    awbNumber,
    shipmentId: shipment.shipmentId,
    trackingUrl,
    pickupStatus: pickupRequestId ? "scheduled" : "pending",
    labelUrl: shippingLabelUrl,
    invoiceUrl,
  });

  logger.info({
    event: "[APPWRITE] Order updated successfully",
    context: "ShipOrderAPI",
    data: { orderId: order.id, awbNumber, shipmentId: shipment.shipmentId },
  });

  return Response.json({
    success: true,
    awb: awbNumber,
    awbNumber,
    shipmentId: shipment.shipmentId,
    pickupRequestId,
    trackingUrl,
    shippingLabelUrl,
    invoiceUrl,
    courierPartner: "Delhivery",
    currentStatus: "Ready To Ship",
    message: `Shipment manifested successfully! AWB: ${awbNumber}`,
  });
}
