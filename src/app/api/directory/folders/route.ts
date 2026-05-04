import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { directoryFolders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api";
import { newId } from "@/lib/ids";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().trim().min(1).max(40),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = Schema.parse(await request.json());
    const last = await db.select({ maxOrder: sql<number>`coalesce(max(${directoryFolders.sortOrder}), 0)` })
      .from(directoryFolders)
      .where(eq(directoryFolders.userId, user.id));
    const id = newId("fld");
    await db.insert(directoryFolders).values({
      id,
      userId: user.id,
      name: body.name,
      sortOrder: Number(last[0]?.maxOrder || 0) + 1000,
      createdAt: new Date(),
    });
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
