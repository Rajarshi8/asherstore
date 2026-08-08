import { z } from "zod";

import { getProductById } from "@/lib/appwrite-products";
import type { JerseySize } from "@/lib/types";

const sizeEnum = z.enum(["S", "M", "L", "XL", "XXL", "XXXL"]);

const checkoutItemSchema = z.object({
  productId: z.string().trim().min(1),
  size: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    sizeEnum
  ),
  qty: z.coerce.number().int().min(1).max(10),
});

export const checkoutItemsSchema = z.array(checkoutItemSchema).min(1).max(30);

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;

export type PricedCheckoutItem = {
  productId: string;
  size: JerseySize;
  qty: number;
  price: number;
};

export type PricedCheckoutSummary = {
  pricedItems: PricedCheckoutItem[];
  subtotal: number;
  shippingCharge: number;
  discountAmount: number;
  totalRupees: number;
  totalPaise: number;
};

const VALID_PROMO_CODES = ["ASHER10", "JERSEY10", "WELCOME10"];

export async function priceCheckoutItems(
  items: CheckoutItemInput[],
  options?: {
    shippingCharge?: number;
    promoCode?: string | null;
  }
): Promise<PricedCheckoutSummary> {
  const parsedItems = checkoutItemsSchema.parse(items);

  const pricedItems = await Promise.all(
    parsedItems.map(async (item) => {
      const product = await getProductById(item.productId);

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (!product.sizes.includes(item.size)) {
        throw new Error(`Selected size is not available for ${product.name}`);
      }

      return {
        productId: product.id,
        size: item.size,
        qty: item.qty,
        price: product.price,
      } satisfies PricedCheckoutItem;
    })
  );

  const subtotal = pricedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingCharge = pricedItems.length ? (options?.shippingCharge ?? 99) : 0;

  const code = (options?.promoCode || "").trim().toUpperCase();
  const discountRate = VALID_PROMO_CODES.includes(code) ? 0.1 : 0;
  const discountAmount = Math.round((subtotal + shippingCharge) * discountRate);

  const totalRupees = Math.max(0, subtotal + shippingCharge - discountAmount);
  const totalPaise = Math.round(totalRupees * 100);

  return {
    pricedItems,
    subtotal,
    shippingCharge,
    discountAmount,
    totalRupees,
    totalPaise,
  };
}