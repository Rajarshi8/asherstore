/**
 * src/services/delhivery/delhiveryClient.ts
 *
 * Base HTTP client for Delhivery Production APIs — SERVER-SIDE ONLY.
 * Token is read from process.env and trimmed to prevent whitespace errors.
 */

import "@/lib/env-loader";
import { logger } from "@/utils/logger";
import type { DelhiveryConfig } from "@/types/delhivery";

export class DelhiveryAPIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "DelhiveryAPIError";
  }
}

export function getDelhiveryConfig(): DelhiveryConfig {
  const token = (process.env.DELHIVERY_API_TOKEN || "").trim();
  const baseUrl = (process.env.DELHIVERY_BASE_URL || "https://track.delhivery.com").trim();

  // Trim all warehouse variables to prevent leading whitespace bugs
  const warehouse = {
    name: (process.env.DELHIVERY_WAREHOUSE_NAME || "THE ASHER STORE").trim(),
    phone: (process.env.DELHIVERY_WAREHOUSE_PHONE || "9123749541").trim(),
    address: (process.env.DELHIVERY_WAREHOUSE_ADDRESS || "2/85 Regent Colony Regent Park").trim(),
    city: (process.env.DELHIVERY_WAREHOUSE_CITY || "Kolkata").trim(),
    state: (process.env.DELHIVERY_WAREHOUSE_STATE || "West Bengal").trim(),
    pincode: (process.env.DELHIVERY_WAREHOUSE_PINCODE || "700040").trim(),
    country: (process.env.DELHIVERY_WAREHOUSE_COUNTRY || "India").trim(),
  };

  return { token, baseUrl, warehouse };
}

export async function delhiveryFetch<T>(
  config: DelhiveryConfig,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!config.token) {
    logger.error({
      event: "DELHIVERY_CONFIG_MISSING",
      context: "DelhiveryClient",
      error: "DELHIVERY_API_TOKEN is missing in environment variables.",
    });
    throw new DelhiveryAPIError(
      "DELHIVERY_API_TOKEN is not configured on the server.",
      "CONFIG_MISSING"
    );
  }

  const url = `${config.baseUrl}${path}`;

  logger.info({
    event: "DELHIVERY_REQUEST",
    context: "DelhiveryClient",
    data: { url, method: options.method || "GET" },
  });

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Token ${config.token}`,
      Accept: "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  logger.info({
    event: "DELHIVERY_RESPONSE",
    context: "DelhiveryClient",
    data: { status: response.status, url },
  });

  if (!response.ok) {
    const message =
      typeof json === "object" && json !== null && "error" in json
        ? String((json as { error: unknown }).error)
        : `Delhivery HTTP error: ${response.status}`;

    throw new DelhiveryAPIError(message, "API_HTTP_ERROR", response.status);
  }

  return json as T;
}
