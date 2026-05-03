import { eq } from "drizzle-orm";
import { db } from "@/db";
import { animations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { deleteAnimationHtml } from "@/lib/html-security";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const animation = await db.query.animations.findFirst({ where: eq(animations.id, id) });
    if (!animation) return fail("动画不存在。", 404);
    await deleteAnimationHtml(animation.filePath);
    await db.delete(animations).where(eq(animations.id, id));
    await audit(admin.id, "animation_delete", "animation", id, { title: animation.title });
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
