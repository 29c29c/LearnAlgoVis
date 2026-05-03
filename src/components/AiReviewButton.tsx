"use client";

import { useState } from "react";

export function AiReviewButton() {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!window.confirm("将只审核 AI 状态为“未审核”的待审核作品，已 AI 审核过的作品会跳过。继续？")) return;
    setBusy(true);
    const response = await fetch("/api/admin/animations/ai-review", { method: "POST" });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      alert(payload?.message || "AI 审核失败");
      return;
    }
    const data = payload.data;
    const failed = data.failures?.length ? `，失败 ${data.failures.length} 个` : "";
    alert(`AI 审核完成：通过 ${data.passed} 个，不通过 ${data.rejected} 个${failed}。`);
    window.location.reload();
  }

  return (
    <button className="btn-secondary" disabled={busy} onClick={run}>
      {busy ? "AI 审核中..." : "一键ai审核"}
    </button>
  );
}
