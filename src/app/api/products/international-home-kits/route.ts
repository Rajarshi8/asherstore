export const runtime = "nodejs";

import { listInternationalHomeKits } from "@/lib/appwrite-products";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

export async function GET() {
  try {
    const products = await listInternationalHomeKits(8);
    return Response.json({ products });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load international home kits");
  }
}
