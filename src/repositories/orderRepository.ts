/**
 * src/repositories/orderRepository.ts
 *
 * Database access layer for Appwrite "orders" collection.
 * Features self-healing schema resilience so missing or unknown attributes never break payment flow.
 */

import "@/lib/env-loader";
import { Query } from "node-appwrite";
import { createAdminDatabase } from "@/lib/appwrite-server";
import { logger } from "@/utils/logger";
import type {
  ProductionOrder,
  OrderShippingAddress,
  OrderItem,
  OrderStatusPatch,
} from "@/types/order";

const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const ordersCollectionId = process.env.APPWRITE_COLLECTION_ORDERS_ID || "orders";

function parseItems(value: unknown): OrderItem[] {
  const toItems = (raw: unknown): OrderItem[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (typeof item !== "object" || item === null) return null;
        const row = item as Record<string, unknown>;
        const productId = typeof row.productId === "string" ? row.productId : "";
        const size = typeof row.size === "string" ? row.size : "";
        const qty = typeof row.qty === "number" ? row.qty : 0;
        const price = typeof row.price === "number" ? row.price : 0;
        if (!productId || !size || qty <= 0 || price < 0) return null;
        return { productId, size, qty, price };
      })
      .filter((item): item is OrderItem => Boolean(item));
  };

  if (typeof value === "string") {
    try {
      return toItems(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }
  return toItems(value);
}

function parseShippingAddress(value: unknown): OrderShippingAddress | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as OrderShippingAddress;
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && value !== null) {
    return value as OrderShippingAddress;
  }
  return null;
}

function cleanString(val: unknown): string {
  if (typeof val !== "string") return "";
  const trimmed = val.trim();
  if (
    trimmed === "PENDING" ||
    trimmed === "NONE" ||
    trimmed === "N/A" ||
    trimmed === "{}" ||
    trimmed === "0"
  ) {
    return "";
  }
  return trimmed;
}

function toProductionOrder(doc: Record<string, unknown>): ProductionOrder {
  const id = typeof doc.$id === "string" ? doc.$id : typeof doc.id === "string" ? doc.id : "";
  const createdAt =
    typeof doc.$createdAt === "string"
      ? doc.$createdAt
      : typeof doc.createdAt === "string"
      ? doc.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof doc.$updatedAt === "string"
      ? doc.$updatedAt
      : typeof doc.updatedAt === "string"
      ? doc.updatedAt
      : new Date().toISOString();

  const addr = parseShippingAddress(doc.shippingAddress);
  const awbNumber = cleanString(doc.awbNumber) || cleanString(doc.awb);
  const shipmentId = cleanString(doc.shipmentId);
  const trackingUrl = cleanString(doc.trackingUrl);
  const pickupStatus = cleanString(doc.pickupStatus);
  const estimatedDelivery = cleanString(doc.estimatedDelivery);
  const labelUrl = cleanString(doc.labelUrl);
  const paymentId = cleanString(doc.paymentId) || cleanString(doc.razorpayPaymentId);

  return {
    id,
    orderId: typeof doc.orderId === "string" ? doc.orderId : id,
    paymentId,
    userId: typeof doc.userId === "string" ? doc.userId : "",
    customerName: typeof doc.customerName === "string" ? doc.customerName : addr?.name || "Customer",
    customerEmail: typeof doc.customerEmail === "string" ? doc.customerEmail : typeof doc.userEmail === "string" ? doc.userEmail : "",
    customerPhone: typeof doc.customerPhone === "string" ? doc.customerPhone : typeof doc.phone === "string" ? doc.phone : addr?.phone || "",
    shippingAddress: addr,
    city: typeof doc.city === "string" ? doc.city : addr?.city || "",
    state: typeof doc.state === "string" ? doc.state : addr?.state || "",
    country: typeof doc.country === "string" ? doc.country : addr?.country || "India",
    pincode: typeof doc.pincode === "string" ? doc.pincode : addr?.pincode || "",
    products: parseItems(doc.products || doc.items),
    subtotal: typeof doc.subtotal === "number" ? doc.subtotal : typeof doc.total === "number" ? doc.total : 0,
    shippingCharge: typeof doc.shippingCharge === "number" ? doc.shippingCharge : 99,
    discount: typeof doc.discount === "number" ? doc.discount : 0,
    tax: typeof doc.tax === "number" ? doc.tax : 0,
    total: typeof doc.total === "number" ? doc.total : 0,
    paymentStatus: (doc.paymentStatus as ProductionOrder["paymentStatus"]) || "created",
    shipmentStatus: (doc.shipmentStatus as ProductionOrder["shipmentStatus"]) || (doc.shippingStatus as ProductionOrder["shipmentStatus"]) || "processing",
    courierPartner: typeof doc.courierPartner === "string" ? doc.courierPartner : typeof doc.courier === "string" ? doc.courier : "Delhivery",
    awbNumber,
    shipmentId,
    trackingUrl,
    pickupStatus,
    estimatedDelivery,
    labelUrl,
    invoiceUrl: typeof doc.invoiceUrl === "string" ? doc.invoiceUrl : `/api/invoices/${id}`,
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
  };
}

export async function getOrderByIdRepo(orderId: string): Promise<ProductionOrder | null> {
  try {
    const db = createAdminDatabase();
    const doc = await db.getDocument(databaseId, ordersCollectionId, orderId);
    return toProductionOrder(doc as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listOrdersRepo(limit = 200): Promise<ProductionOrder[]> {
  try {
    const db = createAdminDatabase();
    const res = await db.listDocuments(databaseId, ordersCollectionId, [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ]);
    return res.documents.map((d) => toProductionOrder(d as Record<string, unknown>));
  } catch (error) {
    logger.error({ event: "LIST_ORDERS_REPO_FAILED", context: "OrderRepository", error });
    return [];
  }
}

export async function listOrdersByUserIdRepo(
  userId: string,
  limit = 100
): Promise<ProductionOrder[]> {
  try {
    const db = createAdminDatabase();
    const res = await db.listDocuments(databaseId, ordersCollectionId, [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ]);
    return res.documents.map((d) => toProductionOrder(d as Record<string, unknown>));
  } catch {
    return [];
  }
}

export interface CreateOrderRepoInput {
  orderId?: string;
  paymentId?: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: OrderShippingAddress | null;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  products: OrderItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  tax?: number;
  total: number;
  paymentStatus: ProductionOrder["paymentStatus"];
  shipmentStatus: ProductionOrder["shipmentStatus"];
  awbNumber?: string;
  shipmentId?: string;
}

export async function createOrderRepo(input: CreateOrderRepoInput): Promise<ProductionOrder> {
  const db = createAdminDatabase();
  const docId = input.orderId || `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const addr = input.shippingAddress;
  const initialAwb = input.awbNumber && input.awbNumber.trim() ? input.awbNumber.trim() : "PENDING";
  const initialShipmentId = input.shipmentId && input.shipmentId.trim() ? input.shipmentId.trim() : "PENDING";
  const initialPaymentId = input.paymentId && input.paymentId.trim() ? input.paymentId.trim() : "PENDING";

  const basePayload: Record<string, unknown> = {
    orderId: docId,
    paymentId: initialPaymentId,
    userId: input.userId,
    customerName: input.customerName || addr?.name || "Customer",
    customerEmail: input.customerEmail,
    userEmail: input.customerEmail,
    customerPhone: input.customerPhone || addr?.phone || "NONE",
    phone: input.customerPhone || addr?.phone || "NONE",
    shippingAddress: addr ? JSON.stringify(addr) : "{}",
    city: input.city || addr?.city || "NONE",
    state: input.state || addr?.state || "NONE",
    country: input.country || addr?.country || "India",
    pincode: input.pincode || addr?.pincode || "NONE",
    products: JSON.stringify(input.products),
    items: JSON.stringify(input.products),
    subtotal: input.subtotal,
    shippingCharge: input.shippingCharge,
    discount: input.discount,
    tax: input.tax || 0,
    total: input.total,
    currency: "INR",
    paymentStatus: input.paymentStatus,
    shipmentStatus: input.shipmentStatus,
    shippingStatus: input.shipmentStatus,
    courierPartner: "Delhivery",
    courier: "Delhivery",
    awbNumber: initialAwb,
    awb: initialAwb,
    shipmentId: initialShipmentId,
    trackingUrl: `https://www.delhivery.com/track/package/${initialAwb}`,
    pickupStatus: "PENDING",
    estimatedDelivery: "PENDING",
    labelUrl: `/api/delhivery/label/${encodeURIComponent(initialAwb)}`,
    shippingLabelUrl: `/api/delhivery/label/${encodeURIComponent(initialAwb)}`,
    invoiceUrl: `/api/invoices/${docId}`,
    razorpayOrderId: docId,
    razorpayPaymentId: initialPaymentId,
  };

  const currentPayload = { ...basePayload };

  // Self-healing attempt loop: Dynamic regex matching for "Unknown attribute: 'xyz'" or "Unknown attribute 'xyz'"
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const doc = await db.createDocument(databaseId, ordersCollectionId, docId, currentPayload);
      return toProductionOrder(doc as Record<string, unknown>);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn({
        event: "CREATE_ORDER_ATTEMPT_FAILED",
        context: "OrderRepository",
        data: { attempt, error: errMsg },
      });

      // Matches: Unknown attribute: "xyz", Unknown attribute "xyz", Attribute "xyz" does not exist
      const match = errMsg.match(/(?:Unknown attribute|Attribute|unknown property)\s*:?\s*["']?([a-zA-Z0-9_$]+)["']?/i);
      if (match && match[1] && match[1] in currentPayload) {
        delete currentPayload[match[1]];
        continue;
      }

      if (attempt === 19) throw err;
    }
  }

  return toProductionOrder({ $id: docId, ...basePayload });
}

export async function updateOrderRepo(
  orderDocId: string,
  patch: OrderStatusPatch
): Promise<ProductionOrder | null> {
  try {
    const db = createAdminDatabase();
    const payload: Record<string, unknown> = {};

    if (patch.paymentStatus !== undefined) payload.paymentStatus = patch.paymentStatus;
    if (patch.shipmentStatus !== undefined) {
      payload.shipmentStatus = patch.shipmentStatus;
      payload.shippingStatus = patch.shipmentStatus;
    }
    if (patch.courierPartner !== undefined) {
      payload.courierPartner = patch.courierPartner;
      payload.courier = patch.courierPartner;
    }
    if (patch.awbNumber !== undefined) {
      payload.awbNumber = patch.awbNumber;
      payload.awb = patch.awbNumber;
    }
    if (patch.shipmentId !== undefined) payload.shipmentId = patch.shipmentId;
    if (patch.trackingUrl !== undefined) payload.trackingUrl = patch.trackingUrl;
    if (patch.pickupStatus !== undefined) payload.pickupStatus = patch.pickupStatus;
    if (patch.estimatedDelivery !== undefined) payload.estimatedDelivery = patch.estimatedDelivery;
    if (patch.labelUrl !== undefined) {
      payload.labelUrl = patch.labelUrl;
      payload.shippingLabelUrl = patch.labelUrl;
    }
    if (patch.invoiceUrl !== undefined) payload.invoiceUrl = patch.invoiceUrl;

    const currentPayload = { ...payload };

    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const doc = await db.updateDocument(databaseId, ordersCollectionId, orderDocId, currentPayload);
        return toProductionOrder(doc as Record<string, unknown>);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const match = errMsg.match(/(?:Unknown attribute|Attribute|unknown property)\s*:?\s*["']?([a-zA-Z0-9_$]+)["']?/i);
        if (match && match[1] && match[1] in currentPayload) {
          delete currentPayload[match[1]];
          continue;
        }
        if (attempt === 9) throw err;
      }
    }
    return null;
  } catch (error) {
    logger.error({ event: "UPDATE_ORDER_REPO_FAILED", context: "OrderRepository", error });
    return null;
  }
}
