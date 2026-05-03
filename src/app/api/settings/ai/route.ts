import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { aiProviders, getProvider } from "@/lib/ai-providers";
import { encryptSecret } from "@/lib/secret";

export const runtime = "nodejs";

const SettingsSchema = z.object({
  providerId: z.string().min(1).max(40),
  modelId: z.string().min(1).max(120),
  apiKey: z.string().trim().max(400).optional(),
  customBaseUrl: z.string().trim().max(240).optional(),
});

export async function GET() {
  const user = await requireUser();
  const settings = await db.query.aiSettings.findFirst({ where: eq(aiSettings.userId, user.id) });
  return ok({
    providers: aiProviders,
    settings: settings
      ? {
          providerId: settings.providerId,
          modelId: settings.modelId,
          customBaseUrl: settings.customBaseUrl,
          hasApiKey: Boolean(settings.apiKeyEncrypted),
        }
      : {
          providerId: "deepseek",
          modelId: "deepseek-v4-flash",
          customBaseUrl: null,
          hasApiKey: false,
        },
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = SettingsSchema.parse(await request.json());
    const provider = getProvider(body.providerId);
    const customBaseUrl = body.providerId === "custom" ? body.customBaseUrl : null;
    if (body.providerId === "custom" && !customBaseUrl) return fail("自定义接口需要填写 Base URL。", 422);

    const existing = await db.query.aiSettings.findFirst({ where: eq(aiSettings.userId, user.id) });
    const apiKeyEncrypted = body.apiKey ? encryptSecret(body.apiKey) : existing?.apiKeyEncrypted ?? null;
    if (!apiKeyEncrypted) return fail("请填写 API Key。", 422);

    await db.insert(aiSettings).values({
      userId: user.id,
      providerId: provider.id,
      modelId: body.modelId,
      customBaseUrl,
      apiKeyEncrypted,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: aiSettings.userId,
      set: {
        providerId: provider.id,
        modelId: body.modelId,
        customBaseUrl,
        apiKeyEncrypted,
        updatedAt: new Date(),
      },
    });

    return ok({ saved: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
