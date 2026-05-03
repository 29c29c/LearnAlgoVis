import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { animations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const Schema = z.object({ visibility: z.enum(["private", "public"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = Schema.parse(await request.json());
    const animation = await db.query.animations.findFirst({
      where: and(eq(animations.id, id), eq(animations.ownerId, user.id)),
    });
    if (!animation) return fail("未找到可管理的动画。", 404);
    await db.update(animations).set({
      visibility: body.visibility,
      reviewStatus: body.visibility === "public" ? "pending" : "private",
      rejectedReason: null,
      updatedAt: new Date(),
    }).where(eq(animations.id, id));
    await audit(user.id, "animation_visibility", "animation", id, { visibility: body.visibility });
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
