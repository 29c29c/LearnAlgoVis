import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, sqlite } from "@/db";
import { inviteCodes, users } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { env } from "@/lib/env";
import { fail, handleRouteError, ok } from "@/lib/api";
import { newId, sha256 } from "@/lib/ids";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  email: z.string().email().max(160).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(40),
  password: z.string().min(8).max(128),
  inviteCode: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const body = RegisterSchema.parse(await request.json());
    const existing = await db.query.users.findFirst({ where: eq(users.email, body.email) });
    if (existing) return fail("该邮箱已注册。", 409);

    const isAdminBootstrap = body.email === env.adminEmail;
    if (!isAdminBootstrap) {
      if (!body.inviteCode) return fail("注册需要邀请码。", 403);
      const codeHash = sha256(body.inviteCode);
      const invite = await db.query.inviteCodes.findFirst({ where: eq(inviteCodes.codeHash, codeHash) });
      if (!invite) return fail("邀请码无效。", 403);
      if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return fail("邀请码已过期。", 403);
      if (invite.usedCount >= invite.maxUses) return fail("邀请码使用次数已用完。", 403);
    }

    const userId = newId("usr");
    const passwordHash = await hashPassword(body.password);
    sqlite.transaction(() => {
      db.insert(users).values({
        id: userId,
        email: body.email,
        name: body.name,
        passwordHash,
        role: isAdminBootstrap ? "admin" : "user",
        trusted: isAdminBootstrap,
        createdAt: new Date(),
      }).run();
      if (!isAdminBootstrap && body.inviteCode) {
        db.update(inviteCodes)
          .set({ usedCount: (sqlite.prepare("SELECT used_count FROM invite_codes WHERE code_hash = ?").get(sha256(body.inviteCode)) as { used_count: number }).used_count + 1 })
          .where(eq(inviteCodes.codeHash, sha256(body.inviteCode)))
          .run();
      }
    })();

    await audit(userId, "register", "user", userId, { email: body.email });
    await createSession(userId);
    return ok({ redirect: "/app" });
  } catch (error) {
    return handleRouteError(error);
  }
}
