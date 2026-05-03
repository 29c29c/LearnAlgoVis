"use client";

import { Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Provider = {
  id: string;
  name: string;
  baseUrl: string;
  models: Array<{ id: string; name: string }>;
};

type SettingsPayload = {
  providers: Provider[];
  settings: {
    providerId: string;
    modelId: string;
    customBaseUrl: string | null;
    hasApiKey: boolean;
  };
};

export function AiSettingsButton() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [providerId, setProviderId] = useState("deepseek");
  const [modelId, setModelId] = useState("deepseek-v4-flash");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings/ai")
      .then((response) => response.json())
      .then((payload) => {
        const next = payload.data as SettingsPayload;
        setData(next);
        setProviderId(next.settings.providerId);
        setModelId(next.settings.modelId);
        setCustomBaseUrl(next.settings.customBaseUrl || "");
      });
  }, [open]);

  const provider = useMemo(() => data?.providers.find((item) => item.id === providerId) ?? data?.providers[0], [data, providerId]);

  useEffect(() => {
    if (!provider) return;
    if (!provider.models.some((model) => model.id === modelId)) {
      setModelId(provider.models[0]?.id || "");
    }
  }, [provider, modelId]);

  async function save() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, modelId, apiKey, customBaseUrl }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setMessage(payload?.message || "保存失败");
      return;
    }
    setApiKey("");
    setMessage("已保存");
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary h-9 flex-1 px-2 text-xs">
        <Settings className="h-4 w-4" />
        设置
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="panel w-full max-w-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">AI 设置</h2>
                <p className="mt-1 text-sm text-ink/60">API Key 会加密保存到服务器数据库，用于“一键生成 HTML”。</p>
              </div>
              <button className="btn-secondary h-8 px-3 text-xs" onClick={() => setOpen(false)}>关闭</button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold">
                AI 厂商
                <select className="input mt-1" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
                  {data?.providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                模型
                <select className="input mt-1" value={modelId} onChange={(event) => setModelId(event.target.value)}>
                  {provider?.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </select>
              </label>
              {providerId === "custom" && (
                <label className="block text-sm font-semibold">
                  Base URL
                  <input className="input mt-1" value={customBaseUrl} onChange={(event) => setCustomBaseUrl(event.target.value)} placeholder="https://example.com/v1" />
                </label>
              )}
              <label className="block text-sm font-semibold">
                API Key
                <input className="input mt-1" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={data?.settings.hasApiKey ? "已保存，留空表示不修改" : "请输入 API Key"} />
              </label>
              <div className="rounded-md border border-line bg-linen p-3 text-xs leading-5 text-ink/60">
                当前接口按 OpenAI-compatible `/chat/completions` 调用。DeepSeek 选项已包含 DeepSeek V4 Flash 和 DeepSeek V4 Pro。
              </div>
              <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "保存中..." : "保存设置"}</button>
              {message && <span className="ml-3 text-sm text-ink/65">{message}</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
