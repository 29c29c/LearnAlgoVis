import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inviteCodes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { newId, randomCode, sha256 } from "@/lib/ids";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const Schema = z.object({
  code: z.string().trim().max(64).optional(),
  maxUses: z.number().int().min(1).max(500),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = Schema.parse(await request.json());
    const code = body.code || randomCode();
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(code)) {
      return fail("邀请码只能包含字母、数字、下划线和短横线，长度 4-64 位。", 422);
    }
    const codeHash = sha256(code);
    const existing = await db.query.inviteCodes.findFirst({ where: eq(inviteCodes.codeHash, codeHash) });
    if (existing) return fail("这个邀请码已存在，请换一个。", 409);
    const id = newId("inv");
    await db.insert(inviteCodes).values({
      id,
      codeHash,
      label: code,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      createdBy: admin.id,
      createdAt: new Date(),
    });
    await audit(admin.id, "invite_create", "invite", id, { maxUses: body.maxUses, label: code });
    return ok({ id, code });
  } catch (error) {
    return handleRouteError(error);
  }
}
