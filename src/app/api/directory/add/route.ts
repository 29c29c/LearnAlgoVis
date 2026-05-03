import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { animations, directoryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { newId } from "@/lib/ids";

export const runtime = "nodejs";

const Schema = z.object({ animationId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = Schema.parse(await request.json());
    const animation = await db.query.animations.findFirst({ where: eq(animations.id, body.animationId) });
    if (!animation) return fail("动画不存在。", 404);
    const canAdd = animation.ownerId === user.id || (animation.visibility === "public" && animation.reviewStatus === "approved");
    if (!canAdd) return fail("该动画还不能添加到目录。", 403);
    const exists = await db.query.directoryItems.findFirst({
      where: and(eq(directoryItems.userId, user.id), eq(directoryItems.animationId, body.animationId)),
    });
    if (exists) return ok({ id: exists.id });
    const last = await db.select({ maxOrder: sql<number>`coalesce(max(${directoryItems.sortOrder}), 0)` })
      .from(directoryItems)
      .where(eq(directoryItems.userId, user.id));
    const itemId = newId("dir");
    await db.insert(directoryItems).values({
      id: itemId,
      userId: user.id,
      animationId: body.animationId,
      sortOrder: Number(last[0]?.maxOrder || 0) + 1000,
      createdAt: new Date(),
    });
    return ok({ id: itemId });
  } catch (error) {
    return handleRouteError(error);
  }
}
