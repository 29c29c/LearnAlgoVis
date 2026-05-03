import { z } from "zod";
import { db } from "@/db";
import { inviteCodes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api";
import { newId, randomCode, sha256 } from "@/lib/ids";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const Schema = z.object({
  maxUses: z.number().int().min(1).max(500),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = Schema.parse(await request.json());
    const code = randomCode();
    const id = newId("inv");
    await db.insert(inviteCodes).values({
      id,
      codeHash: sha256(code),
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
