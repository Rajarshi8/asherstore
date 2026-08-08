/**
 * src/lib/appwrite-orders.ts
 *
 * Appwrite repository for the "orders" collection.
 *
 * APPWRITE CONSOLE — ADD THESE FIELDS to your existing orders collection:
 *   - phone           (string, optional)
 *   - shippingAddress (string, optional — JSON stringified ShippingAddress)
 *   - razorpayOrderId (string, optional)
 *   - razorpayPaymentId (string, optional)
 *   - awb             (string, optional)
 *   - trackingUrl     (string, optional)
 *   - courier         (string, optional, default: "Delhivery")
 *
 * All new fields are optional so existing orders remain valid.
 */

import "@/lib/env-loader";
import { Query } from "node-appwrite";
import { createAdminDatabase } from "@/lib/appwrite-server";

export interface OrderItem {
  productId: string;
  size: string;
  qty: number;
  price: number;
}

/** Shipping address stored as JSON inside the order document. */
export interface OrderShippingAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface AppOrder {
  id: string;
  userId: string;
  userEmail: string;
  // Customer details (populated at checkout)
  phone: string;
  shippingAddress: OrderShippingAddress | null;
  // Razorpay IDs for cross-reference
  razorpayOrderId: string;
  razorpayPaymentId: string;
  // Items & financials
  items: OrderItem[];
  total: number;
  currency: string;
  // Status
  paymentStatus: "created" | "paid" | "failed";
  shippingStatus:
    | "pending"
    | "processing"
    | "packed"
    | "shipped"
    | "out_for_delivery"
    | "delivered";
  // Delhivery
  awb: string;
  trackingUrl: string;
  courier: string;
  createdAt: string;
}

export type OrderStatusPatch = {
  shippingStatus?: AppOrder["shippingStatus"];
  paymentStatus?: AppOrder["paymentStatus"];
  awb?: string;
  trackingUrl?: string;
  courier?: string;
};

const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const ordersCollectionId = process.env.APPWRITE_COLLECTION_ORDERS_ID || "";

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

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

function toOrder(row: Record<string, unknown>): AppOrder {
  const createdAtValue =
    typeof row.$createdAt === "string"
      ? row.$createdAt
      : typeof row.createdAt === "string"
      ? row.createdAt
      : new Date().toISOString();

  const paymentStatus =
    row.paymentStatus === "paid" || row.paymentStatus === "failed"
      ? (row.paymentStatus as string)
      : "created";

  const validShippingStatuses = [
    "pending",
    "processing",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
  ];
  const shippingStatus = validShippingStatuses.includes(row.shippingStatus as string)
    ? (row.shippingStatus as string)
    : "processing";

  return {
    id: typeof row.$id === "string" ? row.$id : typeof row.id === "string" ? row.id : "",
    userId: typeof row.userId === "string" ? row.userId : "",
    userEmail: typeof row.userEmail === "string" ? row.userEmail : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    shippingAddress: parseShippingAddress(row.shippingAddress),
    razorpayOrderId: typeof row.razorpayOrderId === "string" ? row.razorpayOrderId : "",
    razorpayPaymentId: typeof row.razorpayPaymentId === "string" ? row.razorpayPaymentId : "",
    items: parseItems(row.items),
    total: typeof row.total === "number" ? row.total : 0,
    currency: typeof row.currency === "string" ? row.currency : "INR",
    paymentStatus: paymentStatus as AppOrder["paymentStatus"],
    shippingStatus: shippingStatus as AppOrder["shippingStatus"],
    awb: typeof row.awb === "string" ? row.awb : "",
    trackingUrl: typeof row.trackingUrl === "string" ? row.trackingUrl : "",
    courier: typeof row.courier === "string" ? row.courier : "Delhivery",
    createdAt: new Date(createdAtValue).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function listOrderDocuments(queries: unknown[] = [], limit = 200) {
  const db = createAdminDatabase();
  const queryParams = [...queries, Query.limit(limit)] as unknown[];
  const response = await db.listDocuments(
    databaseId,
    ordersCollectionId,
    queryParams as unknown as string[]
  );
  return Array.isArray(response.documents) ? response.documents : [];
}

export async function listOrders(limit = 200): Promise<AppOrder[]> {
  const rows = await listOrderDocuments([Query.orderDesc("$createdAt")], limit);
  return rows.map(toOrder);
}

export async function listOrdersByUserId(userId: string, limit = 100): Promise<AppOrder[]> {
  const rows = await listOrderDocuments(
    [Query.equal("userId", userId), Query.orderDesc("$createdAt")],
    limit
  );
  return rows.map(toOrder);
}

export async function getOrderById(orderId: string): Promise<AppOrder | null> {
  try {
    const db = createAdminDatabase();
    const row = await db.getDocument(databaseId, ordersCollectionId, orderId);
    return toOrder(row as Record<string, unknown>);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function updateOrder(
  orderId: string,
  patch: OrderStatusPatch
): Promise<AppOrder | null> {
  try {
    const db = createAdminDatabase();
    const fullPatch: Record<string, unknown> = {
      ...(patch.shippingStatus !== undefined && { shippingStatus: patch.shippingStatus }),
      ...(patch.paymentStatus !== undefined && { paymentStatus: patch.paymentStatus }),
      ...(patch.awb !== undefined && { awb: patch.awb }),
      ...(patch.trackingUrl !== undefined && { trackingUrl: patch.trackingUrl }),
      ...(patch.courier !== undefined && { courier: patch.courier }),
    };

    try {
      const row = await db.updateDocument(databaseId, ordersCollectionId, orderId, fullPatch);
      return toOrder(row as Record<string, unknown>);
    } catch {
      // Fallback for core fields if extended fields are missing in Appwrite schema
      const corePatch: Record<string, unknown> = {
        ...(patch.shippingStatus !== undefined && { shippingStatus: patch.shippingStatus }),
        ...(patch.paymentStatus !== undefined && { paymentStatus: patch.paymentStatus }),
      };
      const row = await db.updateDocument(databaseId, ordersCollectionId, orderId, corePatch);
      return toOrder(row as Record<string, unknown>);
    }
  } catch {
    return null;
  }
}

export interface CreateOrderParams {
  userId: string;
  userEmail: string;
  phone?: string;
  shippingAddress?: OrderShippingAddress | null;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  items: OrderItem[];
  total: number;
  currency: string;
  paymentStatus: AppOrder["paymentStatus"];
  shippingStatus: AppOrder["shippingStatus"];
}

export async function createOrder(params: CreateOrderParams): Promise<AppOrder> {
  const db = createAdminDatabase();
  const docId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const fullData: Record<string, unknown> = {
    userId: params.userId,
    userEmail: params.userEmail,
    phone: params.phone || "",
    shippingAddress: params.shippingAddress ? JSON.stringify(params.shippingAddress) : "",
    razorpayOrderId: params.razorpayOrderId || "",
    razorpayPaymentId: params.razorpayPaymentId || "",
    items: JSON.stringify(params.items),
    total: params.total,
    currency: params.currency,
    paymentStatus: params.paymentStatus,
    shippingStatus: params.shippingStatus,
    awb: "",
    trackingUrl: "",
    courier: "Delhivery",
  };

  try {
    const row = await db.createDocument(databaseId, ordersCollectionId, docId, fullData);
    return toOrder(row as Record<string, unknown>);
  } catch (error) {
    const errorMsg =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

    if (errorMsg.includes("Unknown attribute") || errorMsg.includes("Invalid document structure")) {
      console.warn("[Appwrite Schema Notice] Extended attribute not found in Appwrite collection, saving core order fields.");

      const coreData: Record<string, unknown> = {
        userId: params.userId,
        userEmail: params.userEmail,
        items: JSON.stringify(params.items),
        total: params.total,
        currency: params.currency,
        paymentStatus: params.paymentStatus,
        shippingStatus: params.shippingStatus,
      };

      const row = await db.createDocument(databaseId, ordersCollectionId, docId, coreData);
      const createdOrder = toOrder(row as Record<string, unknown>);

      // Attach client-side memory fields so response object has full data
      return {
        ...createdOrder,
        phone: params.phone || "",
        shippingAddress: params.shippingAddress || null,
        razorpayOrderId: params.razorpayOrderId || "",
        razorpayPaymentId: params.razorpayPaymentId || "",
      };
    }

    throw error;
  }
}

