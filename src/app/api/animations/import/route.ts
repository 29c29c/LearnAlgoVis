import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { importAnimationForUser } from "@/lib/animation-import";

export const runtime = "nodejs";

const ImportSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(""),
  stylePreset: z.string().trim().max(40).default("clean-teaching"),
  html: z.string().min(40),
  visibility: z.enum(["private", "public"]).default("private"),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = ImportSchema.parse(await request.json());
    const result = await importAnimationForUser({
      userId: user.id,
      title: body.title,
      description: body.description,
      stylePreset: body.stylePreset,
      html: body.html,
      visibility: body.visibility,
    });
    return ok({ id: result.animationId });
  } catch (error) {
    if (error instanceof Error) return fail(error.message, 422);
    return handleRouteError(error);
  }
}
