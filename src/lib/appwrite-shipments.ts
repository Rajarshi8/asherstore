/**
 * src/lib/appwrite-shipments.ts
 *
 * Appwrite repository for the "shipments" collection.
 * Stores Delhivery shipment data linked to orders.
 *
 * APPWRITE CONSOLE SETUP REQUIRED:
 * Create a new collection named "shipments" in your Appwrite database with:
 *   - shipmentId    (string, required, unique)
 *   - orderId       (string, required, indexed)
 *   - awb           (string, required, unique)
 *   - trackingUrl   (string, optional)
 *   - pickupRequestId (string, optional)
 *   - shipmentStatus  (string, required, default: "pending")
 *   - expectedDelivery (string, optional)
 *   - shippingLabelUrl (string, optional)
 *   - rawTrackingData  (string, optional — stores JSON blob up to 64KB)
 *   - courier        (string, default: "Delhivery")
 *   - createdAt      (string, required)
 *   - updatedAt      (string, required)
 *
 * Add APPWRITE_COLLECTION_SHIPMENTS_ID to .env once created.
 */

import "@/lib/env-loader";
import { ID, Query } from "node-appwrite";
import { createAdminDatabase } from "@/lib/appwrite-server";

const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const shipmentsCollectionId = process.env.APPWRITE_COLLECTION_SHIPMENTS_ID || "shipments";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShipmentStatus =
  | "pending"
  | "manifested"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "reached_hub"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "cancelled"
  | "rto"; // Return To Origin

export interface AppShipment {
  id: string;
  shipmentId: string;
  orderId: string;
  awb: string;
  trackingUrl: string;
  pickupRequestId: string;
  shipmentStatus: ShipmentStatus;
  expectedDelivery: string;
  shippingLabelUrl: string;
  rawTrackingData: string; // JSON string of latest tracking events
  courier: string;
  createdAt: string;
  updatedAt: string;
}

export type ShipmentStatusPatch = Partial<
  Pick<
    AppShipment,
    | "shipmentStatus"
    | "expectedDelivery"
    | "trackingUrl"
    | "shippingLabelUrl"
    | "pickupRequestId"
    | "rawTrackingData"
  >
>;

// ---------------------------------------------------------------------------
// Internal mapper
// ---------------------------------------------------------------------------

function toShipment(row: Record<string, unknown>): AppShipment {
  return {
    id: typeof row.$id === "string" ? row.$id : "",
    shipmentId: typeof row.shipmentId === "string" ? row.shipmentId : "",
    orderId: typeof row.orderId === "string" ? row.orderId : "",
    awb: typeof row.awb === "string" ? row.awb : "",
    trackingUrl: typeof row.trackingUrl === "string" ? row.trackingUrl : "",
    pickupRequestId: typeof row.pickupRequestId === "string" ? row.pickupRequestId : "",
    shipmentStatus: (row.shipmentStatus as ShipmentStatus) || "pending",
    expectedDelivery: typeof row.expectedDelivery === "string" ? row.expectedDelivery : "",
    shippingLabelUrl: typeof row.shippingLabelUrl === "string" ? row.shippingLabelUrl : "",
    rawTrackingData: typeof row.rawTrackingData === "string" ? row.rawTrackingData : "[]",
    courier: typeof row.courier === "string" ? row.courier : "Delhivery",
    createdAt: typeof row.$createdAt === "string" ? row.$createdAt : new Date().toISOString(),
    updatedAt: typeof row.$updatedAt === "string" ? row.$updatedAt : new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

export interface CreateShipmentParams {
  orderId: string;
  awb: string;
  trackingUrl?: string;
  pickupRequestId?: string;
  shipmentStatus?: ShipmentStatus;
  expectedDelivery?: string;
  shippingLabelUrl?: string;
  courier?: string;
}

export async function createShipmentRecord(params: CreateShipmentParams): Promise<AppShipment> {
  const db = createAdminDatabase();
  const now = new Date().toISOString();
  const shipmentId = `shp_${params.orderId}_${Date.now()}`;

  // Guard: prevent duplicate shipment for the same order
  const existing = await getShipmentByOrderId(params.orderId);
  if (existing) {
    throw new Error(`Shipment already exists for order ${params.orderId} (AWB: ${existing.awb})`);
  }

  const row = await db.createDocument(databaseId, shipmentsCollectionId, ID.unique(), {
    shipmentId,
    orderId: params.orderId,
    awb: params.awb,
    trackingUrl: params.trackingUrl || `https://www.delhivery.com/track/package/${params.awb}`,
    pickupRequestId: params.pickupRequestId || "",
    shipmentStatus: params.shipmentStatus || "manifested",
    expectedDelivery: params.expectedDelivery || "",
    shippingLabelUrl: params.shippingLabelUrl || "",
    rawTrackingData: "[]",
    courier: params.courier || "Delhivery",
    createdAt: now,
    updatedAt: now,
  });

  return toShipment(row as Record<string, unknown>);
}

export async function getShipmentByOrderId(orderId: string): Promise<AppShipment | null> {
  try {
    const db = createAdminDatabase();
    const res = await db.listDocuments(databaseId, shipmentsCollectionId, [
      Query.equal("orderId", orderId),
      Query.limit(1),
    ]);
    if (!res.documents.length) return null;
    return toShipment(res.documents[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getShipmentByAwb(awb: string): Promise<AppShipment | null> {
  try {
    const db = createAdminDatabase();
    const res = await db.listDocuments(databaseId, shipmentsCollectionId, [
      Query.equal("awb", awb),
      Query.limit(1),
    ]);
    if (!res.documents.length) return null;
    return toShipment(res.documents[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function updateShipmentStatus(
  shipmentDocId: string,
  patch: ShipmentStatusPatch
): Promise<AppShipment | null> {
  try {
    const db = createAdminDatabase();
    const row = await db.updateDocument(databaseId, shipmentsCollectionId, shipmentDocId, {
      ...(patch.shipmentStatus !== undefined && { shipmentStatus: patch.shipmentStatus }),
      ...(patch.expectedDelivery !== undefined && { expectedDelivery: patch.expectedDelivery }),
      ...(patch.trackingUrl !== undefined && { trackingUrl: patch.trackingUrl }),
      ...(patch.shippingLabelUrl !== undefined && { shippingLabelUrl: patch.shippingLabelUrl }),
      ...(patch.pickupRequestId !== undefined && { pickupRequestId: patch.pickupRequestId }),
      ...(patch.rawTrackingData !== undefined && { rawTrackingData: patch.rawTrackingData }),
      updatedAt: new Date().toISOString(),
    });
    return toShipment(row as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listAllShipments(limit = 200): Promise<AppShipment[]> {
  try {
    const db = createAdminDatabase();
    const res = await db.listDocuments(databaseId, shipmentsCollectionId, [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ]);
    return res.documents.map((d) => toShipment(d as Record<string, unknown>));
  } catch {
    return [];
  }
}

/**
 * Map Delhivery status codes to our internal ShipmentStatus enum.
 */
export function mapStatusCode(code: string): ShipmentStatus {
  const map: Record<string, ShipmentStatus> = {
    PU: "picked_up",
    IT: "in_transit",
    OFD: "out_for_delivery",
    DL: "delivered",
    RTO: "rto",
    UD: "in_transit",
    OH: "reached_hub",
    OP: "reached_hub",
    PKD: "pickup_scheduled",
    MNF: "manifested",
    CNL: "cancelled",
    EXP: "exception",
  };
  return map[code.toUpperCase()] || "in_transit";
}
