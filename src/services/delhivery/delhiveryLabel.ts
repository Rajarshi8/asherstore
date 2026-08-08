/**
 * src/services/delhivery/delhiveryLabel.ts
 *
 * Shipping label PDF fetching & proxying.
 */

import { delhiveryFetch, getDelhiveryConfig, DelhiveryAPIError } from "./delhiveryClient";

export async function fetchShippingLabelBuffer(
  awb: string
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const config = getDelhiveryConfig();
  const cleanAwb = awb.trim();

  if (!cleanAwb) {
    throw new DelhiveryAPIError("AWB is required for shipping label", "INVALID_AWB");
  }

  const url = `${config.baseUrl}/api/p/packing_slip?wbns=${encodeURIComponent(cleanAwb)}&pdf=true`;

  const response = await fetch(url, {
    headers: { Authorization: `Token ${config.token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new DelhiveryAPIError(
      `Failed to fetch shipping label from Delhivery: HTTP ${response.status}`,
      "LABEL_FETCH_FAILED",
      response.status
    );
  }

  const contentType = response.headers.get("content-type") || "application/pdf";
  const buffer = await response.arrayBuffer();

  return { buffer, contentType };
}
