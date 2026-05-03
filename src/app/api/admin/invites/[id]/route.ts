import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inviteCodes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const invite = await db.query.inviteCodes.findFirst({ where: eq(inviteCodes.id, id) });
    if (!invite) return fail("邀请码不存在。", 404);
    await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
    await audit(admin.id, "invite_delete", "invite", id, { label: invite.label });
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
