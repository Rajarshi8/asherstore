/**
 * src/repositories/trackingEventRepository.ts
 *
 * Appwrite repository for the "tracking_events" collection.
 * Each document = one unique scan event from Delhivery.
 * Idempotency enforced via deterministic eventKey.
 *
 * Appwrite Collection Required Fields:
 *   eventKey      (string, required — unique index)
 *   shipmentId    (string, required)
 *   orderId       (string, required)
 *   awbNumber     (string, required, indexed)
 *   status        (string, required)
 *   statusCode    (string, optional)
 *   statusLocation (string, optional)
 *   instructions  (string, optional)
 *   timestamp     (string, required)
 *   createdAt     (string, required)
 *
 * Set APPWRITE_COLLECTION_TRACKING_EVENTS_ID in .env after creating the collection.
 */

import "@/lib/env-loader";
import { ID, Query } from "node-appwrite";
import { createAdminDatabase } from "@/lib/appwrite-server";
import { logger } from "@/utils/logger";

const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const collectionId =
  process.env.APPWRITE_COLLECTION_TRACKING_EVENTS_ID || "tracking_events";

export interface TrackingEventInput {
  shipmentId: string;
  orderId: string;
  awbNumber: string;
  status: string;
  statusCode?: string;
  statusLocation?: string;
  instructions?: string;
  timestamp: string; // ISO datetime string from Delhivery
}

export interface TrackingEventRecord extends TrackingEventInput {
  id: string;
  eventKey: string;
  createdAt: string;
}

/**
 * Generate a deterministic event key for idempotency.
 * Combines AWB + statusCode + timestamp + location.
 */
export function buildEventKey(
  awb: string,
  statusCode: string,
  timestamp: string,
  location: string
): string {
  const normalized = `${awb}_${statusCode}_${timestamp}_${location}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .slice(0, 200);
  return normalized;
}

function toTrackingEvent(doc: Record<string, unknown>): TrackingEventRecord {
  return {
    id: typeof doc.$id === "string" ? doc.$id : "",
    eventKey: typeof doc.eventKey === "string" ? doc.eventKey : "",
    shipmentId: typeof doc.shipmentId === "string" ? doc.shipmentId : "",
    orderId: typeof doc.orderId === "string" ? doc.orderId : "",
    awbNumber: typeof doc.awbNumber === "string" ? doc.awbNumber : "",
    status: typeof doc.status === "string" ? doc.status : "",
    statusCode: typeof doc.statusCode === "string" ? doc.statusCode : "",
    statusLocation: typeof doc.statusLocation === "string" ? doc.statusLocation : "",
    instructions: typeof doc.instructions === "string" ? doc.instructions : "",
    timestamp: typeof doc.timestamp === "string" ? doc.timestamp : "",
    createdAt:
      typeof doc.$createdAt === "string"
        ? doc.$createdAt
        : typeof doc.createdAt === "string"
        ? doc.createdAt
        : new Date().toISOString(),
  };
}

/**
 * Attempt to insert a tracking event.
 * If the eventKey already exists, return null (idempotent).
 */
export async function upsertTrackingEvent(
  input: TrackingEventInput
): Promise<TrackingEventRecord | null> {
  const eventKey = buildEventKey(
    input.awbNumber,
    input.statusCode || "",
    input.timestamp,
    input.statusLocation || ""
  );

  const db = createAdminDatabase();

  // Check for existing event with same key
  try {
    const existing = await db.listDocuments(databaseId, collectionId, [
      Query.equal("eventKey", eventKey),
      Query.limit(1),
    ]);

    if (existing.documents.length > 0) {
      logger.info({
        event: "TRACKING_EVENT_DUPLICATE_SKIPPED",
        context: "TrackingEventRepository",
        data: { eventKey, awb: input.awbNumber },
      });
      return null; // Already exists — idempotent
    }
  } catch {
    // Collection might not exist yet — proceed with insert attempt
  }

  try {
    const doc = await db.createDocument(databaseId, collectionId, ID.unique(), {
      eventKey,
      shipmentId: input.shipmentId,
      orderId: input.orderId,
      awbNumber: input.awbNumber,
      status: input.status,
      statusCode: input.statusCode || "",
      statusLocation: input.statusLocation || "",
      instructions: input.instructions || "",
      timestamp: input.timestamp,
      createdAt: new Date().toISOString(),
    });

    logger.info({
      event: "TRACKING_EVENT_STORED",
      context: "TrackingEventRepository",
      data: { eventKey, awb: input.awbNumber, status: input.status },
    });

    return toTrackingEvent(doc as Record<string, unknown>);
  } catch (error) {
    // Log but don't throw — tracking events are supplemental
    logger.warn({
      event: "TRACKING_EVENT_INSERT_FAILED",
      context: "TrackingEventRepository",
      error,
      data: { eventKey },
    });
    return null;
  }
}

/**
 * Get all tracking events for a shipment, newest first.
 */
export async function getTrackingEventsByAwb(
  awb: string,
  limit = 50
): Promise<TrackingEventRecord[]> {
  try {
    const db = createAdminDatabase();
    const res = await db.listDocuments(databaseId, collectionId, [
      Query.equal("awbNumber", awb),
      Query.orderDesc("timestamp"),
      Query.limit(limit),
    ]);
    return res.documents.map((d) => toTrackingEvent(d as Record<string, unknown>));
  } catch {
    return [];
  }
}
