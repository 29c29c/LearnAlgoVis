import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { directoryFolders, directoryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";

export const runtime = "nodejs";

const PatchSchema = z.object({
  customTitle: z.string().trim().max(80).nullable().optional(),
  folderId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = PatchSchema.parse(await request.json());
    if (body.folderId) {
      const folder = await db.query.directoryFolders.findFirst({
        where: and(eq(directoryFolders.id, body.folderId), eq(directoryFolders.userId, user.id)),
      });
      if (!folder) return fail("文件夹不存在。", 404);
    }
    await db.update(directoryItems)
      .set({
        ...(body.customTitle !== undefined ? { customTitle: body.customTitle || null } : {}),
        ...(body.folderId !== undefined ? { folderId: body.folderId || null } : {}),
      })
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
