"use client";

import { useState } from "react";

export function InviteCreator() {
  const [createdCode, setCreatedCode] = useState("");
  const [error, setError] = useState("");

  async function create(formData: FormData) {
    setError("");
    setCreatedCode("");
    const days = Number(formData.get("days") || 0);
    const expiresAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
    const response = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: formData.get("code"),
        maxUses: Number(formData.get("maxUses") || 1),
        expiresAt,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.message || "创建失败");
      return;
    }
    setCreatedCode(data.data.code);
  }

  return (
    <form action={create} className="panel p-5">
      <h2 className="text-lg font-black">创建邀请码</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="block text-sm font-semibold">
          邀请码
          <input name="code" className="input mt-1" placeholder="留空则随机生成" maxLength={64} />
        </label>
        <label className="block text-sm font-semibold">
          最大使用次数
          <input name="maxUses" type="number" min={1} max={500} defaultValue={1} className="input mt-1" />
        </label>
        <label className="block text-sm font-semibold">
          有效天数
          <input name="days" type="number" min={0} defaultValue={30} className="input mt-1" />
        </label>
      </div>
      <button className="btn-primary mt-4">创建</button>
      {createdCode && <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm"><span className="font-semibold">邀请码：</span><code>{createdCode}</code></div>}
      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    </form>
  );
}
