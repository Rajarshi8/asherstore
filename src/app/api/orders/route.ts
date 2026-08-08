import { z } from "zod";

import { createOrderRepo, listOrdersByUserIdRepo } from "@/repositories/orderRepository";
import { appwriteErrorResponse, getCurrentUser } from "@/lib/appwrite-server";

export const runtime = "nodejs";

const schema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      size: z.enum(["S", "M", "L", "XL", "XXL", "XXXL"]),
      qty: z.number().min(1),
      price: z.number().min(1),
    })
  ),
  total: z.number().min(1),
  currency: z.string().default("INR"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ orders: [], message: "No items found" });
  }

  try {
    const rows = await listOrdersByUserIdRepo(user.id, 100);
    return Response.json({ orders: rows });
  } catch {
    return Response.json({ orders: [] });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({
      order: null,
      error: "Please login to place an order",
      message: "No items found",
    });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid order payload" }, { status: 400 });
  }

  try {
    const row = await createOrderRepo({
      userId: user.id,
      customerName: user.name || "Customer",
      customerEmail: user.email,
      customerPhone: user.phone || "",
      shippingAddress: null,
      products: parsed.data.items,
      subtotal: parsed.data.total,
      shippingCharge: 99,
      discount: 0,
      total: parsed.data.total,
      paymentStatus: "created",
      shipmentStatus: "processing",
    });

    return Response.json({ order: row }, { status: 201 });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to create order");
  }
}
