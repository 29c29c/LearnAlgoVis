import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { newId } from "@/lib/ids";

export async function audit(actorId: string | null, action: string, targetType: string, targetId: string | null, detail: unknown = {}) {
  await db.insert(auditLogs).values({
    id: newId("log"),
    actorId,
    action,
    targetType,
    targetId,
    detail: JSON.stringify(detail),
    createdAt: new Date(),
  });
}
