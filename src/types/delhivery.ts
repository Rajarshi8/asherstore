/**
 * src/types/delhivery.ts
 *
 * Delhivery API DTOs & configuration interfaces.
 */

export interface DelhiveryConfig {
  token: string;
  baseUrl: string;
  warehouse: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}

export interface DelhiveryPincodeResult {
  pincode: string;
  city: string;
  state: string;
  country: string;
  isServiceable: boolean;
  prepaidAvailable: boolean;
  codAvailable: boolean;
}

export interface DelhiveryManifestInput {
  orderId: string;
  orderDate: string;
  customer: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  products: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  totalAmount: number;
  paymentMode?: "Prepaid" | "COD";
  weightKg?: number;
}

export interface DelhiveryManifestPackageResult {
  waybill: string;
  refnum: string;
  client: string;
  payment: string;
  status: string; // "Success" or "Fail"
  sortCode?: string;
  serviceable: boolean;
  remarks?: string[];
  errCode?: string;
}

export interface DelhiveryManifestResponse {
  upload_wbn?: string;
  success: boolean;
  package_count?: number;
  packages?: DelhiveryManifestPackageResult[];
  rmk?: string;
}

export interface DelhiveryPickupRequestResult {
  pickupId: string;
  scheduledDate: string;
  success: boolean;
  remarks?: string;
}

export interface DelhiveryTrackingEventDTO {
  date: string;
  time: string;
  location: string;
  status: string;
  statusCode: string;
  instructions?: string;
}

export interface DelhiveryTrackingDTO {
  awb: string;
  status: string;
  statusCode: string;
  expectedDelivery?: string;
  origin: string;
  destination: string;
  events: DelhiveryTrackingEventDTO[];
  isDelivered: boolean;
}
