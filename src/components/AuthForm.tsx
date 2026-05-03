"use client";

import Link from "next/link";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError("");
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(data?.message || "提交失败");
      return;
    }
    window.location.href = data.data.redirect;
  }

  return (
    <form action={submit} className="panel w-full max-w-md p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black">{mode === "login" ? "登录" : "注册"}</h1>
        <p className="mt-2 text-sm text-ink/60">
          {mode === "login" ? "进入你的算法动画目录。" : "注册需要管理员创建的邀请码。管理员邮箱可首次自举注册。"}
        </p>
      </div>
      <div className="space-y-4">
        {mode === "register" && (
          <label className="block text-sm font-semibold">
            昵称
            <input name="name" className="input mt-1" required maxLength={40} />
          </label>
        )}
        <label className="block text-sm font-semibold">
          邮箱
          <input name="email" type="email" className="input mt-1" required />
        </label>
        <label className="block text-sm font-semibold">
          密码
          <input name="password" type="password" className="input mt-1" required minLength={8} />
        </label>
        {mode === "register" && (
          <label className="block text-sm font-semibold">
            邀请码
            <input name="inviteCode" className="input mt-1" placeholder="管理员邮箱首次注册可留空" />
          </label>
        )}
      </div>
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      <button className="btn-primary mt-6 w-full" disabled={busy}>{busy ? "提交中..." : mode === "login" ? "登录" : "创建账号"}</button>
      <div className="mt-4 text-center text-sm text-ink/60">
        {mode === "login" ? (
          <>还没有账号？<Link className="font-semibold text-signal" href="/register">注册</Link></>
        ) : (
          <>已有账号？<Link className="font-semibold text-signal" href="/login">登录</Link></>
        )}
      </div>
    </form>
  );
}
