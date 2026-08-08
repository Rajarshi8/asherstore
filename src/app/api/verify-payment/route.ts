/**
 * POST /api/verify-payment
 *
 * 1. Verify Razorpay signature and payment amounts
 * 2. Create Appwrite Order (paymentStatus=paid)
 * 3. Attempt automatic Delhivery shipment creation
 *    - Payment ALWAYS succeeds even if Delhivery fails
 *    - If Delhivery succeeds: AWB stored, order updated, tracking available
 *    - If Delhivery fails: order stays with shipmentStatus=processing, admin can retry
 */
import crypto from "crypto";
import { z } from "zod";

import { appwriteErrorResponse, getCurrentUser } from "@/lib/appwrite-server";
import { createOrderRepo, updateOrderRepo } from "@/repositories/orderRepository";
import { createShipmentRepo, getShipmentByOrderIdRepo } from "@/repositories/shipmentRepository";
import type { OrderShippingAddress } from "@/types/order";
import { checkoutItemsSchema, priceCheckoutItems } from "@/lib/checkout-payment";
import { fetchRazorpayOrder, fetchRazorpayPayment } from "@/lib/razorpay-api";
import { getRazorpayServerConfig } from "@/lib/razorpay-config";
import { getDelhiveryConfig } from "@/services/delhivery/delhiveryClient";
import { checkPincodeServiceability } from "@/services/delhivery/delhiveryServiceability";
import {
  createShipmentManifestation,
  createPickupBooking,
} from "@/services/delhivery/delhiveryManifestation";
import { logger } from "@/utils/logger";

export const runtime = "nodejs";

const shippingAddressSchema = z
  .object({
    name: z.string().trim().min(1),
    phone: z.string().trim().min(10),
    addressLine1: z.string().trim().min(1),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    pincode: z.string().trim().min(6).max(6),
    country: z.string().trim().optional().default("India"),
  })
  .optional();

const schema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  items: checkoutItemsSchema,
  currency: z.literal("INR").default("INR"),
  shippingCharge: z.number().optional().default(99),
  promoCode: z.string().nullable().optional(),
  phone: z.string().trim().optional(),
  shippingAddress: shippingAddressSchema,
});

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Attempt automatic Delhivery shipment creation after payment.
 * Returns shipment info on success, null on any failure.
 * NEVER throws — all errors are caught and logged.
 */
async function attemptAutoShipment(
  orderDocId: string,
  orderId: string,
  orderCreatedAt: string,
  shippingAddress: OrderShippingAddress | null,
  customerName: string,
  customerPhone: string,
  products: Array<{ productId: string; size: string; qty: number; price: number }>,
  totalAmount: number
): Promise<{
  awbNumber: string;
  shipmentId: string;
  trackingUrl: string;
  shippingLabelUrl: string;
  pickupRequestId: string;
} | null> {
  try {
    // Guard: must have a valid shipping address and phone
    if (!shippingAddress || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.pincode) {
      logger.warn({
        event: "AUTO_SHIP_SKIPPED_NO_ADDRESS",
        context: "VerifyPayment",
        data: { orderDocId },
      });
      return null;
    }

    const phone = (customerPhone || shippingAddress.phone || "").replace(/\D/g, "").slice(-10);
    if (!phone || phone.length < 10) {
      logger.warn({
        event: "AUTO_SHIP_SKIPPED_NO_PHONE",
        context: "VerifyPayment",
        data: { orderDocId },
      });
      return null;
    }

    // Guard: idempotency — don't ship if already shipped
    const existingShipment = await getShipmentByOrderIdRepo(orderDocId);
    if (existingShipment?.awbNumber) {
      logger.info({
        event: "[DELHIVERY] AUTO_SHIP_ALREADY_EXISTS",
        context: "VerifyPayment",
        data: { orderDocId, awbNumber: existingShipment.awbNumber },
      });
      return {
        awbNumber: existingShipment.awbNumber,
        shipmentId: existingShipment.shipmentId,
        trackingUrl: existingShipment.trackingUrl || `https://www.delhivery.com/track/package/${existingShipment.awbNumber}`,
        shippingLabelUrl: existingShipment.shippingLabelUrl || `/api/delhivery/label/${encodeURIComponent(existingShipment.awbNumber)}`,
        pickupRequestId: existingShipment.pickupRequestId || "",
      };
    }

    const config = getDelhiveryConfig();

    // Check serviceability (non-blocking if check fails — proceed optimistically)
    try {
      const svc = await checkPincodeServiceability(config, shippingAddress.pincode);
      if (!svc.isServiceable) {
        logger.warn({
          event: "AUTO_SHIP_PINCODE_NOT_SERVICEABLE",
          context: "VerifyPayment",
          data: { orderDocId, pincode: shippingAddress.pincode },
        });
        return null;
      }
    } catch (svcErr) {
      // Serviceability API failure — proceed with manifestation anyway
      logger.warn({
        event: "AUTO_SHIP_SERVICEABILITY_CHECK_FAILED",
        context: "VerifyPayment",
        error: svcErr,
        data: { orderDocId },
      });
    }

    // Create Delhivery shipment
    const manifestPackage = await createShipmentManifestation(config, {
      orderId,
      orderDate: orderCreatedAt,
      customer: {
        name: customerName || shippingAddress.name || "Customer",
        phone,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        country: shippingAddress.country || "India",
      },
      products: products.map((p) => ({
        name: `Jersey (${p.productId})`,
        qty: p.qty,
        price: p.price,
      })),
      totalAmount,
      paymentMode: "Prepaid",
      weightKg: 0.5,
    });

    const awbNumber = manifestPackage.waybill?.trim();
    if (!awbNumber) {
      logger.warn({
        event: "[DELHIVERY] AUTO_SHIP_NO_AWB",
        context: "VerifyPayment",
        data: { orderDocId },
      });
      return null;
    }

    logger.info({
      event: "[DELHIVERY] AUTO_SHIP_AWB_RECEIVED",
      context: "VerifyPayment",
      data: { orderDocId, orderId, awbNumber },
    });

    // Book pickup (non-blocking)
    let pickupRequestId = "";
    try {
      const pickupResult = await createPickupBooking(config, awbNumber);
      pickupRequestId = pickupResult.pickupId;
    } catch (pickupErr) {
      logger.warn({
        event: "[DELHIVERY] AUTO_SHIP_PICKUP_FAILED",
        context: "VerifyPayment",
        error: pickupErr,
        data: { awbNumber },
      });
    }

    const shippingLabelUrl = `/api/delhivery/label/${encodeURIComponent(awbNumber)}`;
    const invoiceUrl = `/api/invoices/${encodeURIComponent(orderDocId)}`;
    const trackingUrl = `https://www.delhivery.com/track/package/${awbNumber}`;

    // Store shipment in Appwrite (with exact Appwrite schema field names)
    const shipment = await createShipmentRepo({
      orderId: orderDocId,
      awbNumber,
      courierPartner: "Delhivery",
      trackingUrl,
      pickupRequestId,
      currentStatus: "Ready To Ship",
      manifestStatus: "ready_to_ship",
      shippingLabelUrl,
      invoiceUrl,
    });

    // Update order with shipment details
    await updateOrderRepo(orderDocId, {
      shipmentStatus: "ready_to_ship",
      awbNumber,
      shipmentId: shipment.shipmentId,
      trackingUrl,
      pickupStatus: pickupRequestId ? "scheduled" : "pending",
      labelUrl: shippingLabelUrl,
      invoiceUrl,
    });

    logger.info({
      event: "[APPWRITE] AUTO_SHIP_SUCCESS",
      context: "VerifyPayment",
      data: { orderDocId, awbNumber, shipmentId: shipment.shipmentId },
    });

    return {
      awbNumber,
      shipmentId: shipment.shipmentId,
      trackingUrl,
      shippingLabelUrl,
      pickupRequestId,
    };
  } catch (err) {
    logger.error({
      event: "AUTO_SHIP_FAILED",
      context: "VerifyPayment",
      error: err,
      data: { orderDocId },
    });
    return null;
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid verification payload" }, { status: 400 });
  }

  const razorpayConfig = getRazorpayServerConfig();
  if (razorpayConfig.missing.length) {
    return Response.json(
      { error: "Payment gateway is not configured", missing: razorpayConfig.missing },
      { status: 503 }
    );
  }

  try {
    const { pricedItems, totalPaise, subtotal, shippingCharge, discountAmount, totalRupees } =
      await priceCheckoutItems(parsed.data.items, {
        shippingCharge: parsed.data.shippingCharge,
        promoCode: parsed.data.promoCode,
      });

    const expectedSignature = crypto
      .createHmac("sha256", razorpayConfig.keySecret)
      .update(`${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`)
      .digest("hex");

    if (!signaturesMatch(expectedSignature, parsed.data.razorpay_signature)) {
      return Response.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const [gatewayOrder, gatewayPayment] = await Promise.all([
      fetchRazorpayOrder(razorpayConfig, parsed.data.razorpay_order_id),
      fetchRazorpayPayment(razorpayConfig, parsed.data.razorpay_payment_id),
    ]);

    if (
      gatewayPayment.order_id !== parsed.data.razorpay_order_id ||
      gatewayOrder.id !== parsed.data.razorpay_order_id
    ) {
      return Response.json({ error: "Gateway order mismatch" }, { status: 400 });
    }

    if (typeof gatewayPayment.amount === "number" && gatewayPayment.amount !== totalPaise) {
      return Response.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    if (gatewayPayment.status !== "captured" && gatewayPayment.status !== "authorized") {
      return Response.json({ error: "Payment is not captured" }, { status: 400 });
    }

    const phone = parsed.data.phone || user.phone || "";
    const shippingAddress: OrderShippingAddress | null = parsed.data.shippingAddress
      ? {
          name: parsed.data.shippingAddress.name,
          phone: parsed.data.shippingAddress.phone,
          addressLine1: parsed.data.shippingAddress.addressLine1,
          addressLine2: parsed.data.shippingAddress.addressLine2,
          city: parsed.data.shippingAddress.city,
          state: parsed.data.shippingAddress.state,
          pincode: parsed.data.shippingAddress.pincode,
          country: parsed.data.shippingAddress.country || "India",
        }
      : null;

    // Step 1: Create order in Appwrite (always succeeds)
    const order = await createOrderRepo({
      orderId: parsed.data.razorpay_order_id,
      paymentId: parsed.data.razorpay_payment_id,
      userId: user.id,
      customerName: shippingAddress?.name || user.name || "Customer",
      customerEmail: user.email,
      customerPhone: phone || shippingAddress?.phone || "",
      shippingAddress,
      city: shippingAddress?.city || "",
      state: shippingAddress?.state || "",
      pincode: shippingAddress?.pincode || "",
      products: pricedItems,
      subtotal,
      shippingCharge,
      discount: discountAmount,
      tax: 0,
      total: totalRupees,
      paymentStatus: "paid",
      shipmentStatus: "processing",
    });

    logger.info({
      event: "ORDER_CREATED_AFTER_PAYMENT",
      context: "VerifyPayment",
      data: { orderId: order.id, razorpayOrderId: parsed.data.razorpay_order_id },
    });

    // Step 2: Attempt automatic shipment (non-blocking — payment always succeeds)
    const customerName = shippingAddress?.name || user.name || "Customer";
    const customerPhone = phone || shippingAddress?.phone || "";

    const shipmentResult = await attemptAutoShipment(
      order.id,
      order.orderId || order.id,
      order.createdAt,
      shippingAddress,
      customerName,
      customerPhone,
      pricedItems,
      totalRupees
    );

    // Step 3: Return response
    return Response.json({
      success: true,
      order: {
        id: order.id,
        orderId: order.orderId,
        paymentId: order.paymentId,
        amount: totalRupees,
        status: "paid",
        userId: user.id,
        createdAt: order.createdAt,
      },
      commerceOrderId: order.id,
      // Shipment info (null if Delhivery failed)
      shipment: shipmentResult
        ? {
            awb: shipmentResult.awbNumber,
            awbNumber: shipmentResult.awbNumber,
            shipmentId: shipmentResult.shipmentId,
            trackingUrl: shipmentResult.trackingUrl,
            shippingLabelUrl: shipmentResult.shippingLabelUrl,
            courierPartner: "Delhivery",
            status: "ready_to_ship",
          }
        : null,
      shipmentStatus: shipmentResult ? "ready_to_ship" : "processing",
      shipmentMessage: shipmentResult
        ? `Shipment created. AWB: ${shipmentResult.awbNumber}`
        : "Payment successful. Your shipment is being prepared by our team.",
    });
  } catch (error) {
    return appwriteErrorResponse(error, "Payment verification failed");
  }
}
