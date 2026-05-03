import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { animations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { previewCsp } from "@/lib/html-security";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const animation = await db.query.animations.findFirst({ where: eq(animations.id, id) });
  if (!animation) return new Response("Not found", { status: 404 });
  const allowed = animation.ownerId === user?.id || user?.role === "admin" || (animation.visibility === "public" && animation.reviewStatus === "approved");
  if (!allowed) return new Response("Forbidden", { status: 403 });
  const html = await fs.readFile(animation.filePath, "utf8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": previewCsp,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "private, max-age=60",
    },
  });
}
