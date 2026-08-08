export const runtime = "nodejs";

import { assertAdminAccess } from "@/lib/admin-guard";
import { listOrdersRepo } from "@/repositories/orderRepository";
import { listAllShipmentsRepo } from "@/repositories/shipmentRepository";
import type { ProductionShipment } from "@/types/shipment";

export async function GET() {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  try {
    const [orders, allShipments] = await Promise.all([
      listOrdersRepo(300),
      listAllShipmentsRepo(500),
    ]);

    const shipmentsMap: Record<string, ProductionShipment> = {};
    for (const shp of allShipments) {
      shipmentsMap[shp.orderId] = shp;
    }

    return Response.json({ orders, shipments: shipmentsMap });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load admin orders" },
      { status: 500 }
    );
  }
}
