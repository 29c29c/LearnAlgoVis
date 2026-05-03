import fs from "node:fs/promises";
import path from "node:path";
import { env, resolveFromRoot } from "@/lib/env";

const BLOCK_PATTERNS: Array<[RegExp, string]> = [
  [/<script[^>]+src\s*=/i, "不允许外链脚本，请把 JavaScript 内联到单个 HTML 文件中。"],
  [/<link[^>]+rel=["']?stylesheet/i, "不允许外链样式，请把 CSS 内联到 <style> 中。"],
  [/<iframe\b/i, "不允许嵌套 iframe。"],
  [/<object\b|<embed\b/i, "不允许 object/embed。"],
  [/<form\b/i, "不允许表单提交。"],
  [/<meta[^>]+http-equiv=["']?refresh/i, "不允许自动跳转。"],
  [/\b(?:src|href|action)\s*=\s*["']?\s*(?:https?:|\/\/|javascript:|data:text\/html)/i, "不允许外链、javascript: URL 或 HTML data URL。"],
  [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/i, "不允许在动画中发起网络请求。"],
  [/\bnavigator\.sendBeacon\b/i, "不允许发送 beacon 请求。"],
  [/\bdocument\.cookie\b/i, "不允许读取 Cookie。"],
  [/\blocalStorage\b|\bsessionStorage\b/i, "不允许访问浏览器本地存储。"],
];

export function scanHtml(html: string) {
  const bytes = Buffer.byteLength(html, "utf8");
  if (bytes > env.maxHtmlBytes) {
    return { ok: false as const, reason: `HTML 超过大小限制：最大 ${Math.floor(env.maxHtmlBytes / 1024)}KB。` };
  }
  if (!/<!doctype html>|<html[\s>]/i.test(html)) {
    return { ok: false as const, reason: "请输入完整单文件 HTML，包含 <!doctype html> 或 <html>。" };
  }
  for (const [pattern, reason] of BLOCK_PATTERNS) {
    if (pattern.test(html)) return { ok: false as const, reason };
  }
  return { ok: true as const, bytes };
}

export function animationStoragePath(animationId: string) {
  const root = resolveFromRoot(env.storageDir);
  return path.join(root, "animations", `${animationId}.html`);
}

export async function saveAnimationHtml(animationId: string, html: string) {
  const filePath = animationStoragePath(animationId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, html, "utf8");
  return filePath;
}

export async function deleteAnimationHtml(filePath: string) {
  const root = path.join(resolveFromRoot(env.storageDir), "animations");
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error("Refuse to delete a file outside animation storage.");
  }
  await fs.rm(resolved, { force: true });
}

export const previewCsp = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
  "sandbox allow-scripts allow-downloads"
].join("; ");
