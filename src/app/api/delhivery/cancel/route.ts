/**
 * POST /api/delhivery/cancel
 *
 * Admin route to cancel a shipment before pickup.
 */
import { z } from "zod";
import { assertAdminAccess } from "@/lib/admin-guard";
import { getDelhiveryConfig, delhiveryFetch } from "@/services/delhivery/delhiveryClient";
import { getShipmentByOrderIdRepo, updateShipmentRepo } from "@/repositories/shipmentRepository";
import { updateOrderRepo } from "@/repositories/orderRepository";

export const runtime = "nodejs";

const schema = z.object({
  orderId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const shipment = await getShipmentByOrderIdRepo(parsed.data.orderId);
  if (!shipment) {
    return Response.json({ error: "No shipment found for this order" }, { status: 404 });
  }

  if (shipment.manifestStatus === "delivered") {
    return Response.json({ error: "Cannot cancel a delivered shipment" }, { status: 422 });
  }

  if (shipment.manifestStatus === "cancelled") {
    return Response.json({ error: "Shipment is already cancelled" }, { status: 409 });
  }

  const config = getDelhiveryConfig();

  interface CancelResponse {
    status?: boolean;
    message?: string;
    error?: string;
  }

  const cancelBody = `waybill=${encodeURIComponent(shipment.awbNumber)}&cancellation=true`;

  try {
    const res = await delhiveryFetch<CancelResponse>(config, "/api/p/edit", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: cancelBody,
    });

    if (res.status === true) {
      await updateShipmentRepo(shipment.id, { manifestStatus: "cancelled" });
      await updateOrderRepo(parsed.data.orderId, { shipmentStatus: "cancelled" });
    }

    return Response.json({
      success: res.status === true,
      message: res.message || res.error || "Cancellation processed",
      awb: shipment.awbNumber,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Cancellation failed" },
      { status: 500 }
    );
  }
}
