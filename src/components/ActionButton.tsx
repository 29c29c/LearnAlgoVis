"use client";

import { useState } from "react";

type ActionButtonProps = {
  endpoint: string;
  method?: "POST" | "DELETE" | "PATCH";
  body?: unknown;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
};

export function ActionButton({ endpoint, method = "POST", body, children, className = "btn-secondary", confirmText }: ActionButtonProps) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    const response = await fetch(endpoint, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.message || "操作失败");
      return;
    }
    window.location.reload();
  }

  return (
    <button className={className} disabled={busy} onClick={run}>
      {busy ? "处理中..." : children}
    </button>
  );
}
