/**
 * src/services/delhivery/delhiveryServiceability.ts
 *
 * Check pincode serviceability against Delhivery API.
 */

import { delhiveryFetch, DelhiveryAPIError } from "./delhiveryClient";
import type { DelhiveryConfig, DelhiveryPincodeResult } from "@/types/delhivery";

export async function checkPincodeServiceability(
  config: DelhiveryConfig,
  pincode: string
): Promise<DelhiveryPincodeResult> {
  const clean = pincode.trim().replace(/\D/g, "");

  if (clean.length !== 6) {
    throw new DelhiveryAPIError("Pincode must be exactly 6 digits.", "INVALID_PINCODE");
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
      prepaidAvailable: false,
      codAvailable: false,
    };
  }

  const isPrepaidOk = first.pre_paid === "Y" || first.pre_paid === "y" || !first.pre_paid;
  const isCodOk = first.cod === "Y" || first.cod === "y";

  return {
    pincode: clean,
    city: first.city || first.district || "",
    state: first.state_code || "",
    country: first.country_code || "India",
    isServiceable: isPrepaidOk,
    prepaidAvailable: isPrepaidOk,
    codAvailable: isCodOk,
  };
}
