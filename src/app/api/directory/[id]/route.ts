import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { animations, directoryFolders, directoryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { deleteAnimationHtml } from "@/lib/html-security";
import { audit } from "@/lib/audit";

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
      with: { animation: true },
    });
    if (!item) return fail("目录项不存在。", 404);
    if (item.animation.ownerId === user.id) {
      if (item.animation.workshopPublished) {
        if (item.animation.visibility === "public" && item.animation.reviewStatus === "approved") {
          return fail("这个作品已经上架到创意工坊。请先将它转为私有，再从你的目录移除。移除不会删除服务器文件，也不会影响其他用户目录。", 409);
        }
        await db.delete(directoryItems).where(eq(directoryItems.id, id));
        await audit(user.id, "own_workshop_animation_remove_from_directory", "directory_item", id, { animationId: item.animationId, title: item.animation.title });
        return ok({ id, deletedAnimation: false });
      }
      await deleteAnimationHtml(item.animation.filePath);
      await db.delete(animations).where(eq(animations.id, item.animationId));
      await audit(user.id, "own_animation_delete_from_directory", "animation", item.animationId, { title: item.animation.title });
      return ok({ id, deletedAnimation: true });
    }
    await db.delete(directoryItems).where(eq(directoryItems.id, id));
    return ok({ id, deletedAnimation: false });
  } catch (error) {
    return handleRouteError(error);
  }
}
