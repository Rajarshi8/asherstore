/**
 * POST /api/delhivery/serviceability
 *
 * Check pincode serviceability.
 * Body: { pincode: string }
 */
import { z } from "zod";
import { getCurrentUser } from "@/lib/appwrite-server";
import { getDelhiveryConfig } from "@/services/delhivery/delhiveryClient";
import { checkPincodeServiceability } from "@/services/delhivery/delhiveryServiceability";

export const runtime = "nodejs";

const schema = z.object({
  pincode: z.string().trim().min(6).max(6),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid pincode format" }, { status: 400 });
  }

  const config = getDelhiveryConfig();

  try {
    const result = await checkPincodeServiceability(config, parsed.data.pincode);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Serviceability check failed" },
      { status: 422 }
    );
  }
}
