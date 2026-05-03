import "server-only";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { env } from "@/lib/env";

const COOKIE_NAME = "lav_session";
const SESSION_DAYS = 14;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  trusted: boolean;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt,
    createdAt: new Date(),
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, token));
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, token),
    with: { user: true },
  });
  if (!session || session.expiresAt.getTime() <= Date.now() || session.user.disabled) {
    await db.delete(sessions).where(eq(sessions.id, token));
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  const isEnvAdmin = session.user.email.toLowerCase() === env.adminEmail;
  if (isEnvAdmin && session.user.role !== "admin") {
    await db.update(users).set({ role: "admin", trusted: true }).where(eq(users.id, session.user.id));
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: isEnvAdmin ? "admin" : session.user.role,
    trusted: Boolean(session.user.trusted) || isEnvAdmin,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/app");
  return user;
}
