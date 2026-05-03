import { z } from "zod";
import { buildHtmlPrompt } from "@/lib/prompt";
import { handleRouteError, ok } from "@/lib/api";

const Schema = z.object({
  topic: z.string().trim().max(120),
  stylePreset: z.string().trim().max(40),
});

export async function POST(request: Request) {
  try {
    const body = Schema.parse(await request.json());
    return ok({ prompt: buildHtmlPrompt(body.topic, body.stylePreset) });
  } catch (error) {
    return handleRouteError(error);
  }
}
