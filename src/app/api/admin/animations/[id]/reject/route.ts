import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { animations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const Schema = z.object({ reason: z.string().trim().max(300).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = Schema.parse(await request.json());
    const animation = await db.query.animations.findFirst({ where: eq(animations.id, id) });
    if (!animation) return fail("动画不存在。", 404);
    await db.update(animations).set({
      reviewStatus: "rejected",
      rejectedReason: body.reason || "未通过审核",
      updatedAt: new Date(),
    }).where(eq(animations.id, id));
    await audit(admin.id, "animation_reject", "animation", id, { reason: body.reason });
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
