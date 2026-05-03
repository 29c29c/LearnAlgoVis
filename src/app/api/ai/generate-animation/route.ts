import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getProvider } from "@/lib/ai-providers";
import { decryptSecret } from "@/lib/secret";
import { importAnimationForUser } from "@/lib/animation-import";

export const runtime = "nodejs";

const GenerateSchema = z.object({
  topic: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(80).max(12000),
  stylePreset: z.string().trim().max(40).default("clean-teaching"),
});

const AiResultSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  html: z.string().trim().min(80),
});

function extractJson(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) throw new Error("AI 没有返回 JSON。");
  return JSON.parse(trimmed.slice(first, last + 1)) as unknown;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = GenerateSchema.parse(await request.json());
    const settings = await db.query.aiSettings.findFirst({ where: eq(aiSettings.userId, user.id) });
    if (!settings?.apiKeyEncrypted) return fail("请先在左下角设置里填写 AI 厂商和 API Key。", 412);

    const provider = getProvider(settings.providerId);
    const baseUrl = settings.providerId === "custom" ? settings.customBaseUrl : provider.baseUrl;
    if (!baseUrl) return fail("AI Base URL 未配置。", 412);

    const hardPrompt = `${body.prompt}

额外硬性要求：
1. 你必须只返回一个 JSON 对象，不要 Markdown，不要代码围栏，不要解释。
2. JSON 格式必须是：
{
  "title": "算法动画标题",
  "description": "不超过 500 字的算法动画描述",
  "html": "<!doctype html>..."
}
3. title 可以使用用户算法主题“${body.topic}”，也可以总结为更清晰的标题。
4. description 要说明动画展示了什么、用户可以如何观察关键步骤。
5. html 必须是完整单文件 HTML，且符合原提示词的所有安全限制。`;

    const apiUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${decryptSecret(settings.apiKeyEncrypted)}`,
    };
    const requestBody = {
        model: settings.modelId,
        messages: [
          { role: "system", content: "你是一个只输出严格 JSON 的算法动画 HTML 生成器。" },
          { role: "user", content: hardPrompt },
        ],
        temperature: 0.4,
    };

    let response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...requestBody, response_format: { type: "json_object" } }),
    });

    let payload = await response.json().catch(() => null);
    const errorMessage = String(payload?.error?.message || "");
    if (!response.ok && /response_format|json_object/i.test(errorMessage)) {
      response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });
      payload = await response.json().catch(() => null);
    }
    if (!response.ok) {
      return fail(payload?.error?.message || `AI 请求失败：HTTP ${response.status}`, 502);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return fail("AI 返回格式异常。", 502);
    const result = AiResultSchema.parse(extractJson(content));
    const imported = await importAnimationForUser({
      userId: user.id,
      title: result.title,
      description: result.description,
      stylePreset: body.stylePreset,
      html: result.html,
      visibility: "private",
      auditAction: "animation_ai_generate_import",
    });

    return ok({
      id: imported.animationId,
      title: result.title,
      description: result.description,
      html: result.html,
    });
  } catch (error) {
    if (error instanceof Error) return fail(error.message, 422);
    return handleRouteError(error);
  }
}
