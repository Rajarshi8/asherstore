/**
 * src/types/shipment.ts
 *
 * Production Shipment data models aligned EXACTLY with the Appwrite "shipments"
 * collection schema. Every field name here matches an Appwrite attribute name.
 *
 * Appwrite collection attributes:
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

export type ManifestStatus =
  | "pending"
  | "manifested"
  | "ready_to_ship"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "rto"
  | "exception";

export interface ShipmentTrackingEvent {
  date: string;
  time: string;
  location: string;
  status: string;
  statusCode: string;
  instructions?: string;
}

/**
 * Mirrors the Appwrite "shipments" collection document 1:1.
 * Use this type everywhere — do NOT add fields that don't exist in Appwrite.
 */
export interface ProductionShipment {
  id: string;              // Appwrite document $id (read-only)
  shipmentId: string;      // Internal shipment ID
  orderId: string;         // Links to Orders collection
  awbNumber: string;       // Delhivery AWB — the primary tracking number
  courierPartner: string;  // "Delhivery"
  trackingUrl: string;
  pickupRequestId: string;
  currentStatus: string;   // Human-readable current status from Delhivery
  manifestStatus: ManifestStatus;
  expectedDelivery: string; // ISO date string or ""
  shippingLabelUrl: string;
  invoiceUrl: string;
  lastTrackingUpdate: string;
  createdAt: string;
  updatedAt: string;
  // trackingEvents is fetched separately from tracking_events collection
  trackingEvents?: ShipmentTrackingEvent[];
}

export type ShipmentStatusPatch = {
  manifestStatus?: ManifestStatus;
  currentStatus?: string;
  expectedDelivery?: string;
  lastTrackingUpdate?: string;
  trackingUrl?: string;
  pickupRequestId?: string;
  shippingLabelUrl?: string;
  invoiceUrl?: string;
};
