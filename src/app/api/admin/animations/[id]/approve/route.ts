import { eq } from "drizzle-orm";
import { db } from "@/db";
import { animations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const animation = await db.query.animations.findFirst({ where: eq(animations.id, id) });
    if (!animation) return fail("动画不存在。", 404);
    await db.update(animations).set({
      visibility: "public",
      reviewStatus: "approved",
      aiReviewStatus: "manual_approved",
      workshopPublished: true,
      rejectedReason: null,
      updatedAt: new Date(),
    }).where(eq(animations.id, id));
    await audit(admin.id, "animation_approve", "animation", id);
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
