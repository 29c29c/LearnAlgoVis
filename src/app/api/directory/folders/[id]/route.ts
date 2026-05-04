import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, sqlite } from "@/db";
import { directoryFolders, directoryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";

export const runtime = "nodejs";

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = PatchSchema.parse(await request.json());
    const folder = await db.query.directoryFolders.findFirst({
      where: and(eq(directoryFolders.id, id), eq(directoryFolders.userId, user.id)),
    });
    if (!folder) return fail("文件夹不存在。", 404);
    await db.update(directoryFolders).set({ name: body.name }).where(eq(directoryFolders.id, id));
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const folder = await db.query.directoryFolders.findFirst({
      where: and(eq(directoryFolders.id, id), eq(directoryFolders.userId, user.id)),
    });
    if (!folder) return fail("文件夹不存在。", 404);
    sqlite.transaction(() => {
      db.update(directoryItems)
        .set({ folderId: null })
        .where(and(eq(directoryItems.folderId, id), eq(directoryItems.userId, user.id)))
        .run();
      db.delete(directoryFolders).where(eq(directoryFolders.id, id)).run();
    })();
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
