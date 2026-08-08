/**
 * POST /api/shipping/[orderId]/retry
 *
 * Admin-only: retry Delhivery shipment creation for orders
 * where automatic shipment failed after payment.
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
import { DelhiveryAPIError } from "@/services/delhivery/delhiveryClient";
import { logger } from "@/utils/logger";

export const runtime = "nodejs";

const schema = z.object({
  pickupDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const { orderId } = await params;
  if (!orderId) {
    return Response.json({ error: "Order ID is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const pickupDate = parsed.success ? parsed.data.pickupDate : undefined;

  // Load order
  const order = await getOrderByIdRepo(orderId);
  if (!order) {
    return Response.json({ error: `Order not found: ${orderId}` }, { status: 404 });
  }

  if (order.paymentStatus !== "paid") {
    return Response.json(
      { error: `Cannot ship unpaid order (Payment Status: ${order.paymentStatus})` },
      { status: 422 }
    );
  }

  // Idempotency — return existing if already shipped
  const existingShipment = await getShipmentByOrderIdRepo(orderId);
  if (existingShipment?.awbNumber) {
    return Response.json(
      {
        success: true,
        message: "Shipment already exists",
        awb: existingShipment.awbNumber,
        awbNumber: existingShipment.awbNumber,
        shipmentId: existingShipment.shipmentId,
        trackingUrl: existingShipment.trackingUrl,
        alreadyShipped: true,
      },
      { status: 200 }
    );
  }

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

  try {
    const serviceability = await checkPincodeServiceability(config, addr.pincode);
    if (!serviceability.isServiceable) {
      return Response.json(
        {
          error: `Pincode ${addr.pincode} is not serviceable by Delhivery.`,
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

  logger.info({
    event: "[DELHIVERY] Retry manifestation request",
    context: "RetryShipRoute",
    data: { orderId },
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
      event: "[DELHIVERY] Retry manifestation FAILED",
      context: "RetryShipRoute",
      data: { orderId, error: message },
    });
    return Response.json({ error: message }, { status: 502 });
  }

  const awbNumber = manifestPackage.waybill?.trim();
  if (!awbNumber) {
    return Response.json(
      { error: "Delhivery did not issue an AWB number for this shipment." },
      { status: 502 }
    );
  }

  logger.info({
    event: "[DELHIVERY] Retry: AWB received",
    context: "RetryShipRoute",
    data: { awbNumber, orderId },
  });

  const trackingUrl = `https://www.delhivery.com/track/package/${awbNumber}`;
  const shippingLabelUrl = `/api/delhivery/label/${encodeURIComponent(awbNumber)}`;
  const invoiceUrl = `/api/invoices/${encodeURIComponent(order.id)}`;

  let pickupRequestId = "";
  try {
    const pickupResult = await createPickupBooking(config, awbNumber, pickupDate);
    pickupRequestId = pickupResult.pickupId;
  } catch (error) {
    logger.warn({
      event: "[DELHIVERY] Retry: pickup booking failed (non-fatal)",
      context: "RetryShipRoute",
      data: { awbNumber, error: error instanceof Error ? error.message : String(error) },
    });
  }

  const shipment = await createShipmentRepo({
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
    event: "[APPWRITE] Retry: shipment + order saved",
    context: "RetryShipRoute",
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
    message: `Shipment created successfully! AWB: ${awbNumber}`,
  });
}
