/**
 * src/repositories/shipmentRepository.ts
 *
 * Database access layer for Appwrite "shipments" collection.
 * Features self-healing schema resilience so missing or unknown attributes never break shipment creation.
 *
 * Appwrite collection attributes (source of truth):
 *   shipmentId        string  REQUIRED
 *   orderId           string  REQUIRED
 *   awbNumber         string  REQUIRED
 *   courierPartner    string  REQUIRED
 *   trackingUrl       string
 *   pickupRequestId   string
 *   currentStatus     string  REQUIRED
 *   manifestStatus    string
 *   expectedDelivery  datetime
 *   shippingLabelUrl  string
 *   invoiceUrl        string
 *   lastTrackingUpdate string
 *   createdAt         datetime
 *   updatedAt         datetime
 */

import "@/lib/env-loader";
import { ID, Query } from "node-appwrite";
import { createAdminDatabase } from "@/lib/appwrite-server";
import { logger } from "@/utils/logger";
import type {
  ProductionShipment,
  ShipmentStatusPatch,
  ManifestStatus,
} from "@/types/shipment";

const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const shipmentsCollectionId = process.env.APPWRITE_COLLECTION_SHIPMENTS_ID || "shipments";

// ---------------------------------------------------------------------------
// Internal mapper — reads from Appwrite document → ProductionShipment
// ---------------------------------------------------------------------------

function cleanString(val: unknown): string {
  if (typeof val !== "string") return "";
  const trimmed = val.trim();
  if (trimmed === "PENDING" || trimmed === "NONE" || trimmed === "N/A" || trimmed === "{}") return "";
  return trimmed;
}

function toProductionShipment(doc: Record<string, unknown>): ProductionShipment {
  const id = typeof doc.$id === "string" ? doc.$id : "";
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

  return {
    id,
    shipmentId: typeof doc.shipmentId === "string" ? doc.shipmentId : id,
    orderId: typeof doc.orderId === "string" ? doc.orderId : "",
    awbNumber: cleanString(doc.awbNumber) || cleanString(doc.awb),
    courierPartner: typeof doc.courierPartner === "string" ? doc.courierPartner : "Delhivery",
    trackingUrl: typeof doc.trackingUrl === "string" ? doc.trackingUrl : "",
    pickupRequestId: cleanString(doc.pickupRequestId) || cleanString(doc.pickupId),
    currentStatus: typeof doc.currentStatus === "string" ? doc.currentStatus : "Ready To Ship",
    manifestStatus: (doc.manifestStatus as ManifestStatus) || "manifested",
    expectedDelivery: typeof doc.expectedDelivery === "string" ? doc.expectedDelivery : "",
    shippingLabelUrl: typeof doc.shippingLabelUrl === "string" ? doc.shippingLabelUrl : "",
    invoiceUrl: typeof doc.invoiceUrl === "string" ? doc.invoiceUrl : "",
    lastTrackingUpdate: typeof doc.lastTrackingUpdate === "string" ? doc.lastTrackingUpdate : "",
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateShipmentRepoInput {
  shipmentId?: string;
  orderId: string;
  awbNumber: string;          // Delhivery AWB — required, NEVER auto-generated
  courierPartner?: string;
  trackingUrl?: string;
  pickupRequestId?: string;
  currentStatus?: string;
  manifestStatus?: ManifestStatus;
  expectedDelivery?: string;
  shippingLabelUrl?: string;
  invoiceUrl?: string;
}

export async function createShipmentRepo(
  input: CreateShipmentRepoInput
): Promise<ProductionShipment> {
  // Guard: AWB is mandatory — never auto-generate
  if (!input.awbNumber || input.awbNumber.trim() === "") {
    throw new Error(
      "[APPWRITE] Cannot create Shipments document: awbNumber is missing or empty."
    );
  }
  if (!input.orderId || input.orderId.trim() === "") {
    throw new Error(
      "[APPWRITE] Cannot create Shipments document: orderId is missing or empty."
    );
  }

  const db = createAdminDatabase();
  const now = new Date().toISOString();
  const shipmentId = input.shipmentId || `shp_${input.orderId}_${Date.now()}`;

  // Duplicate guard: check by orderId first, then by awbNumber
  logger.info({
    event: "[APPWRITE] Checking for duplicate shipment",
    context: "ShipmentRepository",
    data: { orderId: input.orderId, awbNumber: input.awbNumber },
  });

  const existingByOrder = await getShipmentByOrderIdRepo(input.orderId);
  if (existingByOrder) {
    logger.warn({
      event: "[APPWRITE] Duplicate shipment by orderId — returning existing",
      context: "ShipmentRepository",
      data: { orderId: input.orderId, existingAwb: existingByOrder.awbNumber },
    });
    throw new Error(
      `Shipment already exists for order ${input.orderId} (AWB: ${existingByOrder.awbNumber})`
    );
  }

  const existingByAwb = await getShipmentByAwbRepo(input.awbNumber);
  if (existingByAwb) {
    logger.warn({
      event: "[APPWRITE] Duplicate shipment by awbNumber — returning existing",
      context: "ShipmentRepository",
      data: { awbNumber: input.awbNumber, existingOrderId: existingByAwb.orderId },
    });
    throw new Error(
      `AWB ${input.awbNumber} is already assigned to order ${existingByAwb.orderId}`
    );
  }

  // Build base payload satisfying all possible Appwrite attribute variants
  const baseShipmentPayload: Record<string, unknown> = {
    shipmentId,
    orderId: input.orderId,
    awbNumber: input.awbNumber.trim(),
    awb: input.awbNumber.trim(),
    courierPartner: input.courierPartner || "Delhivery",
    courier: input.courierPartner || "Delhivery",
    trackingUrl:
      input.trackingUrl ||
      `https://www.delhivery.com/track/package/${input.awbNumber.trim()}`,
    pickupRequestId: input.pickupRequestId || "PENDING",
    pickupId: input.pickupRequestId || "PENDING",
    currentStatus: input.currentStatus || "Ready To Ship",
    manifestStatus: input.manifestStatus || "ready_to_ship",
    shipmentStatus: input.manifestStatus || "ready_to_ship",
    shippingLabelUrl:
      input.shippingLabelUrl ||
      `/api/delhivery/label/${encodeURIComponent(input.awbNumber.trim())}`,
    labelUrl:
      input.shippingLabelUrl ||
      `/api/delhivery/label/${encodeURIComponent(input.awbNumber.trim())}`,
    invoiceUrl:
      input.invoiceUrl ||
      `/api/invoices/${encodeURIComponent(input.orderId)}`,
    lastTrackingUpdate: now,
    createdAt: now,
    updatedAt: now,
    expectedDelivery: input.expectedDelivery || now,
  };

  const currentPayload = { ...baseShipmentPayload };

  // Self-healing attempt loop: Dynamic regex matching for "Unknown attribute: 'xyz'" or "Unknown attribute 'xyz'"
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const doc = await db.createDocument(
        databaseId,
        shipmentsCollectionId,
        ID.unique(),
        currentPayload
      );
      logger.info({
        event: "[APPWRITE] Shipment document created successfully",
        context: "ShipmentRepository",
        data: {
          docId: (doc as Record<string, unknown>).$id,
          awbNumber: input.awbNumber,
          orderId: input.orderId,
        },
      });
      return toProductionShipment(doc as Record<string, unknown>);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn({
        event: "CREATE_SHIPMENT_ATTEMPT_FAILED",
        context: "ShipmentRepository",
        data: { attempt, error: errMsg },
      });

      const match = errMsg.match(/(?:Unknown attribute|Attribute|unknown property)\s*:?\s*["']?([a-zA-Z0-9_$]+)["']?/i);
      if (match && match[1] && match[1] in currentPayload) {
        delete currentPayload[match[1]];
        continue;
      }

      if (attempt === 14) throw err;
    }
  }

  return toProductionShipment({ $id: ID.unique(), ...baseShipmentPayload });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getShipmentByOrderIdRepo(
  orderId: string
): Promise<ProductionShipment | null> {
  try {
    const db = createAdminDatabase();
    const res = await db.listDocuments(databaseId, shipmentsCollectionId, [
      Query.equal("orderId", orderId),
      Query.limit(1),
    ]);
    if (!res.documents.length) return null;
    return toProductionShipment(res.documents[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getShipmentByAwbRepo(
  awbNumber: string
): Promise<ProductionShipment | null> {
  try {
    const db = createAdminDatabase();
    const res = await db.listDocuments(databaseId, shipmentsCollectionId, [
      Query.equal("awbNumber", awbNumber),
      Query.limit(1),
    ]);
    if (!res.documents.length) return null;
    return toProductionShipment(res.documents[0] as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listAllShipmentsRepo(limit = 200): Promise<ProductionShipment[]> {
  try {
    const db = createAdminDatabase();
    const res = await db.listDocuments(databaseId, shipmentsCollectionId, [
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ]);
    return res.documents.map((d) =>
      toProductionShipment(d as Record<string, unknown>)
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateShipmentRepo(
  shipmentDocId: string,
  patch: ShipmentStatusPatch
): Promise<ProductionShipment | null> {
  try {
    const db = createAdminDatabase();
    const now = new Date().toISOString();

    const payload: Record<string, unknown> = {
      updatedAt: now,
      lastTrackingUpdate: now,
    };

    if (patch.manifestStatus !== undefined) {
      payload.manifestStatus = patch.manifestStatus;
      payload.shipmentStatus = patch.manifestStatus;
    }
    if (patch.currentStatus !== undefined) payload.currentStatus = patch.currentStatus;
    if (patch.expectedDelivery !== undefined) payload.expectedDelivery = patch.expectedDelivery;
    if (patch.lastTrackingUpdate !== undefined) payload.lastTrackingUpdate = patch.lastTrackingUpdate;
    if (patch.trackingUrl !== undefined) payload.trackingUrl = patch.trackingUrl;
    if (patch.pickupRequestId !== undefined) {
      payload.pickupRequestId = patch.pickupRequestId;
      payload.pickupId = patch.pickupRequestId;
    }
    if (patch.shippingLabelUrl !== undefined) {
      payload.shippingLabelUrl = patch.shippingLabelUrl;
      payload.labelUrl = patch.shippingLabelUrl;
    }
    if (patch.invoiceUrl !== undefined) payload.invoiceUrl = patch.invoiceUrl;

    const currentPayload = { ...payload };

    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const doc = await db.updateDocument(
          databaseId,
          shipmentsCollectionId,
          shipmentDocId,
          currentPayload
        );
        return toProductionShipment(doc as Record<string, unknown>);
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
    logger.error({
      event: "[APPWRITE] Update shipment FAILED",
      context: "ShipmentRepository",
      error,
      data: { shipmentDocId },
    });
    return null;
  }
}
