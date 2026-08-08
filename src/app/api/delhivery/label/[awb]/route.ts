/**
 * GET /api/delhivery/label/[awb]
 *
 * Proxy streaming shipping label PDF from Delhivery.
 */
import { assertAdminAccess } from "@/lib/admin-guard";
import { fetchShippingLabelBuffer } from "@/services/delhivery/delhiveryLabel";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ awb: string }> }
) {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const resolvedParams = await params;
  const awb = decodeURIComponent(resolvedParams.awb || "").trim();
  if (!awb) {
    return Response.json({ error: "AWB is required" }, { status: 400 });
  }

  try {
    const { buffer, contentType } = await fetchShippingLabelBuffer(awb);
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="shipping-label-${awb}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch shipping label" },
      { status: 500 }
    );
  }
}
