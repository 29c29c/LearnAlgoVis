import { eq, sql } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { animations, directoryItems } from "@/db/schema";
import { newId, sha256 } from "@/lib/ids";
import { saveAnimationHtml, scanHtml } from "@/lib/html-security";
import { audit } from "@/lib/audit";

export type ImportAnimationInput = {
  userId: string;
  title: string;
  description: string;
  stylePreset: string;
  html: string;
  visibility?: "private" | "public";
  auditAction?: string;
};

export async function importAnimationForUser(input: ImportAnimationInput) {
  const title = input.title.trim().slice(0, 80);
  if (!title) throw new Error("标题不能为空。");
  const description = input.description.trim().slice(0, 500);
  const scan = scanHtml(input.html);
  if (!scan.ok) throw new Error(scan.reason);

  const digest = sha256(input.html);
  const duplicate = await db.query.animations.findFirst({ where: eq(animations.sha256, digest) });
  if (duplicate && duplicate.ownerId === input.userId) {
    throw new Error("你已经导入过相同 HTML。");
  }
  if (duplicate && duplicate.ownerId !== input.userId) {
    throw new Error("服务器已存在相同 HTML。请直接从创意工坊添加公开版本，或修改标题/内容后再导入。");
  }

  const animationId = newId("ani");
  const itemId = newId("dir");
  const filePath = await saveAnimationHtml(animationId, input.html);
  const now = new Date();
  const last = await db.select({ maxOrder: sql<number>`coalesce(max(${directoryItems.sortOrder}), 0)` })
    .from(directoryItems)
    .where(eq(directoryItems.userId, input.userId));
  const nextOrder = Number(last[0]?.maxOrder || 0) + 1000;
  const visibility = input.visibility ?? "private";

  sqlite.transaction(() => {
    db.insert(animations).values({
      id: animationId,
      ownerId: input.userId,
      title,
      description,
      stylePreset: input.stylePreset,
      filePath,
      sha256: digest,
      byteSize: scan.bytes,
      visibility,
      reviewStatus: visibility === "public" ? "pending" : "private",
      createdAt: now,
      updatedAt: now,
    }).run();
    db.insert(directoryItems).values({
      id: itemId,
      userId: input.userId,
      animationId,
      sortOrder: nextOrder,
      createdAt: now,
    }).run();
  })();

  await audit(input.userId, input.auditAction ?? "animation_import", "animation", animationId, { visibility });
  return { animationId, itemId };
}
