export const runtime = "nodejs";

import { listLatestDrops } from "@/lib/appwrite-products";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

export async function GET() {
  try {
    const products = await listLatestDrops(8);
    return Response.json({ products });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load latest drops");
  }
}
