import fs from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiSettings, animations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getProvider } from "@/lib/ai-providers";
import { decryptSecret } from "@/lib/secret";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const HTML_REVIEW_CHAR_LIMIT = 120_000;

function buildSafetyPrompt(animation: typeof animations.$inferSelect, html: string) {
  const clipped = html.length > HTML_REVIEW_CHAR_LIMIT;
  const visibleHtml = clipped ? html.slice(0, HTML_REVIEW_CHAR_LIMIT) : html;
  return `你是算法动画网站的安全审核员。产品用途：用户上传单文件 HTML 算法动画，其他用户会在站内 sandbox iframe 中浏览。请判断这个 HTML 是否适合进入人工公开审核的下一步。

只允许回答一个汉字：是 或 否。
回答“是”代表：未发现明显安全/稳定性/滥用问题，可以标记为 AI 通过。
回答“否”代表：存在明显风险，或由于内容不完整/过大/混淆导致无法确认安全。

必须判“否”的情况包括但不限于：
1. 可能让浏览器卡死：无限循环、递归爆栈、极高频 setInterval/requestAnimationFrame、海量 DOM 节点、超大数组、超大 Canvas/WebGL 绘制、持续内存增长。
2. 含有不适合算法教学动画的行为：自动下载、自动弹窗、自动跳转、伪造登录/支付/中奖/系统提示、诱导输入敏感信息。
3. 试图访问或窃取数据：Cookie、本地存储、剪贴板、浏览器指纹、位置信息、摄像头/麦克风、文件系统。
4. 试图联网或加载外部资源：fetch、XMLHttpRequest、WebSocket、EventSource、外链脚本/样式/图片/iframe、beacon。
5. 代码明显混淆、压缩到难以审查、含 wasm/worker/blob 动态执行、eval/new Function、可疑 base64 动态解码执行。
6. 内容不是完整单文件算法动画 HTML，或明显与算法动画无关。

元信息：
标题：${animation.title}
描述：${animation.description || "无"}
字节数：${animation.byteSize}
${clipped ? "注意：HTML 因长度过大已截断；若无法确认安全，请回答否。" : ""}

HTML：
${visibleHtml}`;
}

async function callAiReview(apiUrl: string, headers: Record<string, string>, modelId: string, prompt: string) {
  const requestBody = {
    model: modelId,
    messages: [
      { role: "system", content: "你是严格的 HTML 安全审核器。你只能回答“是”或“否”。" },
      { role: "user", content: prompt },
    ],
    temperature: 0,
  };
  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false as const, message: payload?.error?.message || `AI 请求失败：HTTP ${response.status}` };
  }
  const content = String(payload?.choices?.[0]?.message?.content || "").trim();
  return { ok: true as const, passed: content.startsWith("是"), raw: content };
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    const settings = await db.query.aiSettings.findFirst({ where: eq(aiSettings.userId, admin.id) });
    if (!settings?.apiKeyEncrypted) return fail("请先在左下角设置里填写 AI 厂商和 API Key。", 412);

    const provider = getProvider(settings.providerId);
    const baseUrl = settings.providerId === "custom" ? settings.customBaseUrl : provider.baseUrl;
    if (!baseUrl) return fail("AI Base URL 未配置。", 412);

    const apiUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${decryptSecret(settings.apiKeyEncrypted)}`,
    };
    const rows = await db.query.animations.findMany({
      where: and(eq(animations.reviewStatus, "pending"), eq(animations.aiReviewStatus, "unreviewed")),
    });

    let passed = 0;
    let rejected = 0;
    const failures: Array<{ id: string; title: string; message: string }> = [];

    for (const animation of rows) {
      try {
        const html = await fs.readFile(animation.filePath, "utf8");
        const result = await callAiReview(apiUrl, headers, settings.modelId, buildSafetyPrompt(animation, html));
        if (!result.ok) {
          failures.push({ id: animation.id, title: animation.title, message: result.message });
          continue;
        }
        const aiReviewStatus = result.passed ? "ai_approved" : "ai_rejected";
        if (result.passed) passed += 1;
        else rejected += 1;
        await db.update(animations)
          .set({ aiReviewStatus, updatedAt: new Date() })
          .where(eq(animations.id, animation.id));
        await audit(admin.id, "animation_ai_review", "animation", animation.id, {
          aiReviewStatus,
          raw: result.raw.slice(0, 120),
        });
      } catch (error) {
        failures.push({
          id: animation.id,
          title: animation.title,
          message: error instanceof Error ? error.message : "未知错误",
        });
      }
    }

    return ok({ reviewed: passed + rejected, passed, rejected, skipped: 0, failures });
  } catch (error) {
    return handleRouteError(error);
  }
}
