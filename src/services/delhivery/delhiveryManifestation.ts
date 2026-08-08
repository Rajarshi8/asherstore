/**
 * src/services/delhivery/delhiveryManifestation.ts
 *
 * Shipment Manifestation (Creation) & Pickup Request Services.
 */

import { delhiveryFetch, DelhiveryAPIError } from "./delhiveryClient";
import { logger } from "@/utils/logger";
import type {
  DelhiveryConfig,
  DelhiveryManifestInput,
  DelhiveryManifestPackageResult,
  DelhiveryManifestResponse,
  DelhiveryPickupRequestResult,
} from "@/types/delhivery";


export async function createShipmentManifestation(
  config: DelhiveryConfig,
  input: DelhiveryManifestInput
): Promise<DelhiveryManifestPackageResult> {
  const wh = config.warehouse;
  const orderDate = input.orderDate.slice(0, 10); // YYYY-MM-DD

  const productsDesc = input.products
    .map((p) => `${p.name} x${p.qty}`)
    .join(", ")
    .slice(0, 245);

  const payload = {
    shipments: [
      {
        name: input.customer.name.trim(),
        add: [input.customer.addressLine1, input.customer.addressLine2]
          .filter(Boolean)
          .join(", ")
          .trim(),
        pin: input.customer.pincode.trim(),
        city: input.customer.city.trim(),
        state: input.customer.state.trim(),
        country: input.customer.country || "India",
        phone: input.customer.phone.replace(/\D/g, "").slice(-10),
        order: input.orderId,
        payment_mode: input.paymentMode || "Prepaid",
        return_pin: wh.pincode,
        return_city: wh.city,
        return_phone: wh.phone,
        return_add: wh.address,
        return_state: wh.state,
        return_country: wh.country,
        products_desc: productsDesc,
        cod_amount: "0",
        order_date: orderDate,
        total_amount: String(Math.round(input.totalAmount)),
        seller_add: wh.address,
        seller_name: wh.name,
        seller_inv: `INV-${input.orderId}`.slice(0, 40),
        quantity: String(input.products.reduce((s, p) => s + p.qty, 0)),
        shipment_width: "25",
        shipment_height: "5",
        weight: String(input.weightKg ?? 0.5),
        shipping_mode: "Surface",
        address_type: "home",
      },
    ],
    pickup_location: {
      name: wh.name,
    },
  };

  const body = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

  logger.info({
    event: "DELHIVERY_MANIFEST_REQUEST",
    context: "DelhiveryManifestation",
    data: { orderId: input.orderId, warehouse: wh.name },
  });

  const response = await delhiveryFetch<DelhiveryManifestResponse>(
    config,
    "/api/cmu/create.json",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const pkg = response.packages?.[0];

  logger.info({
    event: "DELHIVERY_MANIFEST_RESPONSE",
    context: "DelhiveryManifestation",
    data: {
      success: response.success,
      waybill: pkg?.waybill,
      status: pkg?.status,
      errCode: pkg?.errCode,
    },
  });

  if (!pkg || pkg.status !== "Success" || !pkg.waybill) {
    const errorMsg =
      pkg?.remarks?.join(", ") ||
      response.rmk ||
      "Shipment creation failed at Delhivery gateway.";

    throw new DelhiveryAPIError(errorMsg, pkg?.errCode || "MANIFESTATION_FAILED");
  }


  return pkg;
}

export async function createPickupBooking(
  config: DelhiveryConfig,
  awb: string,
  pickupDate?: string
): Promise<DelhiveryPickupRequestResult> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = pickupDate || tomorrow.toISOString().slice(0, 10);

  const payload = {
    pickup_time: "10:00:00",
    pickup_date: date,
    pickup_location: config.warehouse.name,
    expected_package_count: 1,
  };

  const body = `format=json&data=${encodeURIComponent(JSON.stringify(payload))}`;

  interface PickupApiResponse {
    id?: string;
    pk?: string;
    pickup_date?: string;
    remarks?: string;
    error?: string;
  }

  try {
    const response = await delhiveryFetch<PickupApiResponse>(config, "/fm/request/new/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const pickupId = String(response.id || response.pk || `pickup_${Date.now()}`);

    return {
      pickupId,
      scheduledDate: response.pickup_date || date,
      success: true,
      remarks: response.remarks,
    };
  } catch (error) {
    logger.warn({
      event: "DELHIVERY_PICKUP_REQUEST_WARN",
      context: "DelhiveryManifestation",
      error,
      data: { awb },
    });
    return {
      pickupId: `pickup_${Date.now()}`,
      scheduledDate: date,
      success: false,
      remarks: error instanceof Error ? error.message : "Pickup booking failed",
    };
  }
}
