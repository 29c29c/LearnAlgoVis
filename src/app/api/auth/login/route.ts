import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { env } from "@/lib/env";
import { fail, handleRouteError, ok } from "@/lib/api";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = LoginSchema.parse(await request.json());
    const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
    if (!user || user.disabled) return fail("邮箱或密码错误。", 401);
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return fail("邮箱或密码错误。", 401);
    if (user.email.toLowerCase() === env.adminEmail && user.role !== "admin") {
      await db.update(users).set({ role: "admin", trusted: true }).where(eq(users.id, user.id));
    }
    await createSession(user.id);
    return ok({ redirect: "/app" });
  } catch (error) {
    return handleRouteError(error);
  }
}
