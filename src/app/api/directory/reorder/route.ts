import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, sqlite } from "@/db";
import { directoryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api";

export const runtime = "nodejs";

const Schema = z.object({ ids: z.array(z.string()).min(1).max(200) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = Schema.parse(await request.json());
    sqlite.transaction(() => {
      body.ids.forEach((id, index) => {
        db.update(directoryItems)
          .set({ sortOrder: (index + 1) * 1000 })
          .where(and(eq(directoryItems.id, id), eq(directoryItems.userId, user.id)))
          .run();
      });
    })();
    return ok({ count: body.ids.length });
  } catch (error) {
    return handleRouteError(error);
  }
}
