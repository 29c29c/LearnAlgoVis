import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(error.issues[0]?.message || "请求参数无效。", 422);
  }
  console.error(error);
  return fail("服务器处理失败，请稍后重试。", 500);
}
