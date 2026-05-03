export const stylePresets = [
  { id: "clean-teaching", name: "清爽教学", tone: "白底、绿色/青色强调、清晰步骤区、适合课堂投屏。" },
  { id: "dark-tech", name: "深色科技", tone: "深色背景、网格坐标、霓虹蓝绿强调、适合复杂图结构。" },
  { id: "whiteboard", name: "极简白板", tone: "近似手写白板、低饱和颜色、公式和指针清晰。" },
  { id: "pixel-game", name: "像素游戏", tone: "像素风 UI、离散格子、按键式控制，适合栈/队列/搜索。" },
  { id: "glass-dashboard", name: "玻璃拟态仪表盘", tone: "半透明面板、轻量阴影、数据状态区明显，适合排序/路径动画。" },
] as const;

export function buildHtmlPrompt(topic: string, styleId: string) {
  const style = stylePresets.find((item) => item.id === styleId) ?? stylePresets[0];
  const cleanTopic = topic.trim() || "一个经典算法";
  return `请创建一个完整的单文件算法动画 HTML 页面，主题是：${cleanTopic}。

网页风格：${style.name}。视觉要求：${style.tone}

必须满足以下规范：
1. 输出必须是一个完整 HTML 文件，从 <!doctype html> 开始，包含 <html>、<head>、<body>。
2. 所有 CSS 必须写在 <style> 内，所有 JavaScript 必须写在 <script> 内，不允许外链脚本、外链样式、CDN、图片 URL 或字体 URL。
3. 页面必须响应式，桌面端和手机端都能完整查看；文本不得溢出按钮或面板。
4. 页面必须包含算法标题、核心思想说明、动画画布、步骤说明区、当前状态区。
5. 必须提供交互控制：上一步、下一步、自动播放、暂停、重置、速度调节。
6. 动画状态必须由 JavaScript 数据结构驱动，不要只做静态插画。
7. 每一步都要解释关键变量如何变化，并高亮当前操作对象。
8. 必须内置“导出算法动画”按钮，点击后将当前完整 HTML 作为 .html 文件下载。导出内容应包含当前页面的 HTML/CSS/JS。
9. 禁止使用 fetch、XMLHttpRequest、WebSocket、iframe、form、localStorage、sessionStorage、document.cookie。
10. JavaScript 不要访问网络，不要自动跳转，不要弹出恶意窗口。

请只输出 HTML 代码，不要附加解释。`;
}
