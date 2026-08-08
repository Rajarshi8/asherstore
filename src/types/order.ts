/**
 * src/types/order.ts
 *
 * Production Order data models & Appwrite database document interfaces.
 */

export interface OrderItem {
  productId: string;
  size: string;
  qty: number;
  price: number;
}

export interface OrderShippingAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export type PaymentStatus = "created" | "paid" | "failed";

export type ShippingStatus =
  | "pending"
  | "processing"
  | "packed"
  | "manifested"
  | "ready_to_ship"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "reached_hub"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "rto"
  | "exception";

export interface ProductionOrder {
  id: string; // Appwrite document $id
  orderId: string; // Internal Order ID e.g. order_17861...
  paymentId: string; // Razorpay payment ID
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: OrderShippingAddress | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  products: OrderItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  shipmentStatus: ShippingStatus;
  courierPartner: string;
  awbNumber: string;
  shipmentId: string;
  trackingUrl: string;
  pickupStatus: string;
  estimatedDelivery: string;
  labelUrl: string;
  invoiceUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatusPatch = Partial<
  Pick<
    ProductionOrder,
    | "paymentStatus"
    | "shipmentStatus"
    | "courierPartner"
    | "awbNumber"
    | "shipmentId"
    | "trackingUrl"
    | "pickupStatus"
    | "estimatedDelivery"
    | "labelUrl"
    | "invoiceUrl"
  >
>;
