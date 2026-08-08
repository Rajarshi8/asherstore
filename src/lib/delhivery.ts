/**
 * src/lib/delhivery.ts
 *
 * Delhivery API Service — SERVER SIDE ONLY.
 *
 * SECURITY: The DELHIVERY_API_TOKEN is read exclusively from process.env on the
 * server. It is never passed to the client, never stored in NEXT_PUBLIC_ vars,
 * and never included in client-facing API responses.
 *
 * All functions in this file must only be called from:
 *   - Next.js API routes (src/app/api/**)
 *   - Server Actions
 *
 * Never import this file into a "use client" component.
 */

import "@/lib/env-loader";

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

export interface DelhiveryConfig {
  token: string;
  baseUrl: string;
  warehouse: DelhiveryWarehouse;
}

export interface DelhiveryWarehouse {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export function getDelhiveryConfig(): DelhiveryConfig {
  const token = (process.env.DELHIVERY_API_TOKEN || "").trim();
  const baseUrl = (process.env.DELHIVERY_BASE_URL || "https://track.delhivery.com").trim();

  return {
    token,
    baseUrl,
    warehouse: {
      name: process.env.DELHIVERY_WAREHOUSE_NAME || "THE ASHER STORE",
      phone: process.env.DELHIVERY_WAREHOUSE_PHONE || "",
      address: process.env.DELHIVERY_WAREHOUSE_ADDRESS || "",
      city: process.env.DELHIVERY_WAREHOUSE_CITY || "",
      state: process.env.DELHIVERY_WAREHOUSE_STATE || "",
      pincode: process.env.DELHIVERY_WAREHOUSE_PINCODE || "",
      country: process.env.DELHIVERY_WAREHOUSE_COUNTRY || "India",
    },
  };
}

function assertToken(config: DelhiveryConfig): void {
  if (!config.token) {
    throw new DelhiveryError(
      "DELHIVERY_API_TOKEN is not configured. Add it to .env (server-side only).",
      "CONFIG_MISSING"
    );
  }
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class DelhiveryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "DelhiveryError";
  }
}

// ---------------------------------------------------------------------------
// HTTP helper — all Delhivery API calls go through here
// ---------------------------------------------------------------------------

async function delhiveryFetch<T>(
  config: DelhiveryConfig,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  assertToken(config);

  const url = `${config.baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Token ${config.token}`,
      Accept: "application/json",
      ...(options.headers || {}),
    },
    // Never cache Delhivery API responses
    cache: "no-store",
  });

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error: unknown }).error)
        : `Delhivery API error: HTTP ${response.status}`;

    throw new DelhiveryError(message, "API_ERROR", response.status);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DelhiveryPincodeResult {
  pincode: string;
  city: string;
  state: string;
  country: string;
  isServiceable: boolean;
  deliveryDays?: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface DelhiveryShipmentInput {
  orderId: string;
  orderDate: string; // ISO string
  customer: ShippingAddress;
  products: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMode?: "Prepaid" | "COD";
  weightKg?: number;
}

export interface DelhiveryShipmentResult {
  awb: string;
  packageCount: number;
  remarks?: string;
  success: boolean;
  error?: string;
}

export interface DelhiveryTrackingEvent {
  date: string;
  time: string;
  location: string;
  status: string;
  statusCode: string;
  instructions?: string;
}

export interface DelhiveryTrackingResult {
  awb: string;
  status: string;
  statusCode: string;
  expectedDelivery?: string;
  origin: string;
  destination: string;
  events: DelhiveryTrackingEvent[];
  isDelivered: boolean;
}

// ---------------------------------------------------------------------------
// 1. Serviceability Check
// ---------------------------------------------------------------------------

/**
 * Check if a pincode is serviceable by Delhivery.
 *
 * Endpoint: GET /c/api/pin-codes/json/?filter_codes={pincode}
 */
export async function checkServiceability(
  config: DelhiveryConfig,
  pincode: string
): Promise<DelhiveryPincodeResult> {
  const clean = pincode.trim().replace(/\D/g, "");

  if (clean.length !== 6) {
    throw new DelhiveryError("Pincode must be 6 digits.", "INVALID_PINCODE");
  }

  interface PincodeApiResponse {
    delivery_codes?: Array<{
      postal_code?: {
        pin: number | string;
        city?: string;
        district?: string;
        state_code?: string;
        country_code?: string;
        pre_paid?: string;
        cod?: string;
      };
    }>;
  }

  const data = await delhiveryFetch<PincodeApiResponse>(
    config,
    `/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(clean)}`
  );

  const results = data.delivery_codes || [];
  const first = results[0]?.postal_code;

  if (!first || String(first.pin) !== clean) {
    return {
      pincode: clean,
      city: "",
      state: "",
      country: "India",
      isServiceable: false,
    };
  }

  const isPrepaidOk = first.pre_paid === "Y" || first.pre_paid === "y" || !first.pre_paid;

  return {
    pincode: clean,
    city: first.city || first.district || "",
    state: first.state_code || "",
    country: first.country_code || "India",
    isServiceable: isPrepaidOk,
  };
}


// ---------------------------------------------------------------------------
// 2. Create Shipment (Manifestation)
// ---------------------------------------------------------------------------

/**
 * Create a Delhivery shipment and obtain an AWB number.
 *
 * Endpoint: POST /api/cmu/create.json
 * Body format: form-urlencoded — format=json&data={...}
 */
export async function createShipment(
  config: DelhiveryConfig,
  input: DelhiveryShipmentInput
): Promise<DelhiveryShipmentResult> {
  const wh = config.warehouse;
  const orderDate = input.orderDate.slice(0, 10); // YYYY-MM-DD

  const productsDesc = input.products
    .map((p) => `${p.name} x${p.qty}`)
    .join(", ")
    .slice(0, 250);

  const shipmentPayload = {
    shipments: [
      {
        name: input.customer.name,
        add: [input.customer.addressLine1, input.customer.addressLine2]
          .filter(Boolean)
          .join(", "),
        pin: input.customer.pincode,
        city: input.customer.city,
        state: input.customer.state,
        country: input.customer.country || "India",
        phone: input.customer.phone.replace(/\D/g, "").slice(-10),
        order: input.orderId,
        payment_mode: input.paymentMode || "Prepaid",
        // Return address = warehouse
        return_pin: wh.pincode,
        return_city: wh.city,
        return_phone: wh.phone,
        return_add: wh.address,
        return_state: wh.state,
        return_country: wh.country,
        // Product info
        products_desc: productsDesc,
        hsn_code: "",
        cod_amount: "0",
        order_date: orderDate,
        total_amount: String(Math.round(input.totalAmount)),
        // Seller info
        seller_add: wh.address,
        seller_name: wh.name,
        seller_inv: `INV-${input.orderId}`.slice(0, 40),
        quantity: String(input.products.reduce((s, p) => s + p.qty, 0)),
        waybill: "", // Delhivery auto-assigns
        // Dimensions (defaults for jersey)
        shipment_width: "25",
        shipment_height: "5",
        weight: String(input.weightKg ?? 0.5),
        seller_gst_tin: "",
        shipping_mode: "Surface",
        address_type: "home",
      },
    ],
    pickup_location: {
      name: wh.name,
      add: wh.address,
      city: wh.city,
      pin_code: wh.pincode,
      country: wh.country,
      phone: wh.phone,
    },
  };

  const body = new URLSearchParams();
  body.set("format", "json");
  body.set("data", JSON.stringify(shipmentPayload));

  interface CreateShipmentResponse {
    packages?: Array<{
      waybill: string;
      status: string;
      remarks?: string;
      sort_code?: string;
    }>;
    upload_wbn?: string;
    success?: boolean;
    error?: string;
    cash_pickups_count?: number;
    prepaid_count?: number;
  }

  const data = await delhiveryFetch<CreateShipmentResponse>(
    config,
    "/api/cmu/create.json",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  const pkg = data.packages?.[0];

  if (!pkg?.waybill) {
    throw new DelhiveryError(
      data.error || "Shipment creation failed — no AWB returned.",
      "AWB_MISSING"
    );
  }

  return {
    awb: pkg.waybill,
    packageCount: data.packages?.length ?? 1,
    remarks: pkg.remarks,
    success: true,
  };
}

// ---------------------------------------------------------------------------
// 3. Generate Shipping Label
// ---------------------------------------------------------------------------

/**
 * Fetch a PDF shipping label URL for a given AWB.
 *
 * Returns a URL to stream the label. The caller should proxy this to the
 * client — never expose the Delhivery token in a redirect.
 *
 * Endpoint: GET /api/p/packing_slip?wbns={awb}&pdf=true
 */
export function getShippingLabelUrl(config: DelhiveryConfig, awb: string): string {
  // We return the URL and fetch it server-side when requested
  return `${config.baseUrl}/api/p/packing_slip?wbns=${encodeURIComponent(awb)}&pdf=true`;
}

/**
 * Fetch the shipping label binary and return as a Buffer.
 * Use this to proxy the PDF to the browser without exposing the token.
 */
export async function fetchShippingLabel(
  config: DelhiveryConfig,
  awb: string
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  assertToken(config);

  const url = getShippingLabelUrl(config, awb);
  const response = await fetch(url, {
    headers: { Authorization: `Token ${config.token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new DelhiveryError(
      `Failed to fetch shipping label: HTTP ${response.status}`,
      "LABEL_FETCH_FAILED",
      response.status
    );
  }

  const contentType = response.headers.get("content-type") || "application/pdf";
  const buffer = await response.arrayBuffer();

  return { buffer, contentType };
}

// ---------------------------------------------------------------------------
// 4. Create Pickup Request
// ---------------------------------------------------------------------------

export interface PickupRequestResult {
  pickupRequestId: string;
  scheduledDate: string;
  success: boolean;
  remarks?: string;
}

/**
 * Create a pickup request for a given AWB.
 *
 * Endpoint: POST /fm/request/new/
 */
export async function createPickupRequest(
  config: DelhiveryConfig,
  awb: string,
  pickupDate?: string // YYYY-MM-DD, defaults to tomorrow
): Promise<PickupRequestResult> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = pickupDate || tomorrow.toISOString().slice(0, 10);

  const body = new URLSearchParams();
  body.set("format", "json");
  body.set(
    "data",
    JSON.stringify({
      pickup_time: `${date} 10:00:00`,
      pickup_date: date,
      pickup_location: config.warehouse.name,
      expected_package_count: 1,
    })
  );

  interface PickupResponse {
    id?: string;
    pk?: string;
    pickup_date?: string;
    remarks?: string;
    error?: string;
  }

  const data = await delhiveryFetch<PickupResponse>(config, "/fm/request/new/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const id = data.id || data.pk || `pickup_${Date.now()}`;

  return {
    pickupRequestId: String(id),
    scheduledDate: data.pickup_date || date,
    success: true,
    remarks: data.remarks,
  };
}

// ---------------------------------------------------------------------------
// 5. Track Shipment
// ---------------------------------------------------------------------------

/**
 * Get live tracking data for a given AWB.
 *
 * Endpoint: GET /api/v1/packages/json/?waybill={awb}&verbose=1
 */
export async function trackShipment(
  config: DelhiveryConfig,
  awb: string
): Promise<DelhiveryTrackingResult> {
  interface TrackingApiResponse {
    ShipmentData?: Array<{
      Shipment?: {
        AWB: string;
        Status?: { Status?: string; StatusCode?: string; ExpectedDeliveryDate?: string };
        Origin?: string;
        Destination?: string;
        Scans?: Array<{
          ScanDetail?: {
            ScanDateTime?: string;
            ScanType?: string;
            Scan?: string;
            StatusCode?: string;
            Instructions?: string;
            ScannedLocation?: string;
          };
        }>;
        Delivered?: boolean;
      };
    }>;
  }

  const data = await delhiveryFetch<TrackingApiResponse>(
    config,
    `/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}&verbose=1`
  );

  const shipmentData = data.ShipmentData?.[0]?.Shipment;

  if (!shipmentData) {
    throw new DelhiveryError(`No tracking data found for AWB: ${awb}`, "AWB_NOT_FOUND");
  }

  const events: DelhiveryTrackingEvent[] = (shipmentData.Scans || [])
    .map((s): DelhiveryTrackingEvent | null => {
      const d = s.ScanDetail;
      if (!d) return null;
      const dt = d.ScanDateTime || "";
      const [datePart, timePart] = dt.split("T");
      return {
        date: datePart || dt,
        time: (timePart || "").replace(/\.\d+Z?$/, ""),
        location: d.ScannedLocation || "",
        status: d.Scan || d.ScanType || "",
        statusCode: d.StatusCode || "",
        instructions: d.Instructions,
      };
    })
    .filter((e): e is DelhiveryTrackingEvent => e !== null)
    .reverse(); // Newest first from Delhivery, we want oldest first for timeline


  return {
    awb,
    status: shipmentData.Status?.Status || "Unknown",
    statusCode: shipmentData.Status?.StatusCode || "",
    expectedDelivery: shipmentData.Status?.ExpectedDeliveryDate,
    origin: shipmentData.Origin || "",
    destination: shipmentData.Destination || "",
    events,
    isDelivered: Boolean(shipmentData.Delivered),
  };
}

// ---------------------------------------------------------------------------
// 6. Cancel Shipment
// ---------------------------------------------------------------------------

/**
 * Cancel a shipment by AWB.
 * Note: Shipments can only be cancelled before pickup.
 */
export async function cancelShipment(
  config: DelhiveryConfig,
  awb: string
): Promise<{ success: boolean; message: string }> {
  interface CancelResponse {
    status?: boolean;
    message?: string;
    error?: string;
  }

  const body = new URLSearchParams();
  body.set("waybill", awb);
  body.set("cancellation", "true");

  const data = await delhiveryFetch<CancelResponse>(
    config,
    "/api/p/edit",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  return {
    success: data.status === true,
    message: data.message || data.error || "Cancellation processed",
  };
}

// ---------------------------------------------------------------------------
// Helper: Map Delhivery status codes to internal timeline steps
// ---------------------------------------------------------------------------

export type TimelineStep =
  | "order_confirmed"
  | "payment_verified"
  | "packed"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "reached_hub"
  | "out_for_delivery"
  | "delivered";

const STATUS_CODE_MAP: Record<string, TimelineStep> = {
  "PU": "picked_up",
  "IT": "in_transit",
  "OFD": "out_for_delivery",
  "DL": "delivered",
  "RTO": "in_transit",
  "UD": "in_transit",
  "OH": "reached_hub",
  "OP": "reached_hub",
};

export function mapDelhiveryStatusToTimeline(statusCode: string): TimelineStep {
  return STATUS_CODE_MAP[statusCode.toUpperCase()] || "in_transit";
}
