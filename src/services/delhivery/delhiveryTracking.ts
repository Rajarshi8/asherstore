/**
 * src/services/delhivery/delhiveryTracking.ts
 *
 * Live shipment tracking service using Delhivery API.
 */

import { delhiveryFetch, DelhiveryAPIError } from "./delhiveryClient";
import type { DelhiveryConfig, DelhiveryTrackingDTO, DelhiveryTrackingEventDTO } from "@/types/delhivery";

export async function fetchLiveTracking(
  config: DelhiveryConfig,
  awb: string
): Promise<DelhiveryTrackingDTO> {
  const cleanAwb = awb.trim();
  if (!cleanAwb) {
    throw new DelhiveryAPIError("AWB number is required", "INVALID_AWB");
  }

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
    `/api/v1/packages/json/?waybill=${encodeURIComponent(cleanAwb)}&verbose=1`
  );

  const shipment = data.ShipmentData?.[0]?.Shipment;

  if (!shipment) {
    throw new DelhiveryAPIError(`No tracking data found for AWB ${cleanAwb}`, "AWB_NOT_FOUND");
  }

  const events: DelhiveryTrackingEventDTO[] = (shipment.Scans || [])
    .map((s): DelhiveryTrackingEventDTO | null => {
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
    .filter((e): e is DelhiveryTrackingEventDTO => e !== null)
    .reverse();

  return {
    awb: cleanAwb,
    status: shipment.Status?.Status || "Manifested",
    statusCode: shipment.Status?.StatusCode || "MNF",
    expectedDelivery: shipment.Status?.ExpectedDeliveryDate,
    origin: shipment.Origin || "",
    destination: shipment.Destination || "",
    events,
    isDelivered: Boolean(shipment.Delivered),
  };
}
