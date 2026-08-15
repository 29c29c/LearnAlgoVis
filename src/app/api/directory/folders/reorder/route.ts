import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, sqlite } from "@/db";
import { directoryFolders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";

export const runtime = "nodejs";

const Schema = z.object({
  ids: z.array(z.string()).min(1).max(1000).refine(
    (ids) => new Set(ids).size === ids.length,
    "文件夹列表包含重复项。",
  ),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = Schema.parse(await request.json());
    const folders = await db
      .select({ id: directoryFolders.id })
      .from(directoryFolders)
      .where(eq(directoryFolders.userId, user.id));
    const ownedIds = new Set(folders.map((folder) => folder.id));

    if (body.ids.length !== ownedIds.size || body.ids.some((id) => !ownedIds.has(id))) {
      return fail("文件夹排序数据与当前目录不一致，请刷新后重试。", 409);
    }

    sqlite.transaction(() => {
      body.ids.forEach((id, index) => {
        db.update(directoryFolders)
          .set({ sortOrder: (index + 1) * 1000 })
          .where(and(eq(directoryFolders.id, id), eq(directoryFolders.userId, user.id)))
          .run();
      });
    })();

    return ok({ count: body.ids.length });
  } catch (error) {
    return handleRouteError(error);
  }
}
