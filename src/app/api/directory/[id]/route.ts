import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { directoryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";

export const runtime = "nodejs";

const PatchSchema = z.object({
  customTitle: z.string().trim().max(80).nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = PatchSchema.parse(await request.json());
    await db.update(directoryItems)
      .set({ customTitle: body.customTitle || null })
      .where(and(eq(directoryItems.id, id), eq(directoryItems.userId, user.id)));
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const item = await db.query.directoryItems.findFirst({
      where: and(eq(directoryItems.id, id), eq(directoryItems.userId, user.id)),
    });
    if (!item) return fail("目录项不存在。", 404);
    await db.delete(directoryItems).where(eq(directoryItems.id, id));
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
