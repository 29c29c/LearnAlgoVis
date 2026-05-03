"use client";

import { useMemo, useState } from "react";
import { stylePresets } from "@/lib/prompt";

const safeExample = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>二分查找动画</title>
  <style>
    body{font-family:system-ui;margin:0;background:#f8fafc;color:#0f172a}
    main{max-width:900px;margin:auto;padding:32px}
    .bar{display:flex;gap:8px;margin:24px 0}.cell{flex:1;padding:18px 0;text-align:center;border-radius:8px;background:white;border:1px solid #cbd5e1}
    .on{background:#ccfbf1;border-color:#0f766e}.bad{opacity:.35}
    button{margin-right:8px;padding:10px 14px;border:0;border-radius:8px;background:#0f766e;color:white}
  </style>
</head>
<body>
<main>
  <h1>二分查找动画</h1>
  <p id="msg">点击下一步观察 left、right、mid 的变化。</p>
  <div class="bar" id="bar"></div>
  <button onclick="next()">下一步</button>
  <button onclick="reset()">重置</button>
  <button onclick="downloadHtml()">导出算法动画</button>
</main>
<script>
const data=[3,8,12,18,25,31,42], target=25;
let left=0,right=data.length-1,mid=-1,done=false;
function draw(){
  document.getElementById('bar').innerHTML=data.map((v,i)=>'<div class="cell '+(i===mid?'on ':'')+(i<left||i>right?'bad':'')+'">'+v+'</div>').join('');
  document.getElementById('msg').textContent=done?'找到或搜索结束':'left='+left+' right='+right+' mid='+mid;
}
function next(){ if(done)return; mid=Math.floor((left+right)/2); if(data[mid]===target)done=true; else if(data[mid]<target)left=mid+1; else right=mid-1; if(left>right)done=true; draw(); }
function reset(){ left=0; right=data.length-1; mid=-1; done=false; draw(); }
function downloadHtml(){ const blob=new Blob([document.documentElement.outerHTML],{type:'text/html'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='binary-search-animation.html'; a.click(); URL.revokeObjectURL(a.href); }
draw();
</script>
</body>
</html>`;

export function ImportTool() {
  const [topic, setTopic] = useState("二分查找算法");
  const [stylePreset, setStylePreset] = useState<string>(stylePresets[0].id);
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selectedStyle = useMemo(() => stylePresets.find((item) => item.id === stylePreset) ?? stylePresets[0], [stylePreset]);

  async function generatePrompt() {
    const response = await fetch("/api/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, stylePreset }),
    });
    const data = await response.json();
    setPrompt(data.data.prompt);
  }

  async function generateHtmlAndImport() {
    const activePrompt = prompt.trim();
    if (!activePrompt) {
      setMessage("请先生成或填写提示词。");
      return;
    }
    setAiBusy(true);
    setMessage("");
    const response = await fetch("/api/ai/generate-animation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, prompt: activePrompt, stylePreset }),
    });
    const data = await response.json().catch(() => null);
    setAiBusy(false);
    if (!response.ok) {
      setMessage(data?.message || "AI 生成失败");
      return;
    }
    setTitle(data.data.title);
    setDescription(data.data.description);
    setHtml(data.data.html);
    window.location.href = "/app";
  }

  async function importHtml(formData: FormData) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/animations/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        visibility: formData.get("visibility"),
        stylePreset,
        html,
      }),
    });
    const data = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setMessage(data?.message || "导入失败");
      return;
    }
    window.location.href = "/app";
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="panel p-5">
        <h2 className="text-lg font-black">提示词生成器</h2>
        <p className="mt-1 text-sm text-ink/60">把一句话主题扩展成适合导入本站的单 HTML 生成规范。</p>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            算法主题
            <input className="input mt-1" value={topic} onChange={(event) => setTopic(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold">
            风格
            <select className="input mt-1" value={stylePreset} onChange={(event) => setStylePreset(event.target.value)}>
              {stylePresets.map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}
            </select>
          </label>
          <div className="rounded-md border border-line bg-linen p-3 text-sm text-ink/65">{selectedStyle.tone}</div>
          <button className="btn-primary" onClick={generatePrompt}>生成提示词</button>
          <textarea className="input min-h-[320px] font-mono text-xs" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="生成后的提示词会显示在这里。" />
          <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(prompt)} disabled={!prompt}>复制提示词</button>
          <button className="btn-secondary w-full justify-center" onClick={generateHtmlAndImport} disabled={aiBusy || !prompt.trim()}>
            {aiBusy ? "正在调用 AI 并导入..." : "一键生成html并添加到目录"}
          </button>
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="text-lg font-black">导入单 HTML</h2>
        <p className="mt-1 text-sm text-ink/60">仅支持内联 CSS/JS 的完整 HTML。公开作品提交后进入管理员审核。</p>
        <form action={importHtml} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            标题
            <input name="title" className="input mt-1" required maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold">
            描述
            <textarea name="description" className="input mt-1 min-h-20" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold">
            可见性
            <select name="visibility" className="input mt-1" defaultValue="private">
              <option value="private">私有，仅我的目录可见</option>
              <option value="public">申请公开，审核后进入创意工坊</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            HTML 内容
            <textarea className="input mt-1 min-h-[380px] font-mono text-xs" value={html} onChange={(event) => setHtml(event.target.value)} placeholder="粘贴完整 HTML..." required />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => {
              setTitle("二分查找动画");
              setDescription("演示二分查找中 left、right、mid 的变化过程。");
              setHtml(safeExample);
            }}>填入安全示例</button>
            <button className="btn-primary" disabled={busy || html.length < 40}>{busy ? "导入中..." : "导入到目录"}</button>
          </div>
          {message && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{message}</div>}
        </form>
      </section>
    </div>
  );
}
