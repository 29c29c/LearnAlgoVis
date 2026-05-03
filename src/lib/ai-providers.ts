export type AiProvider = {
  id: string;
  name: string;
  baseUrl: string;
  models: Array<{ id: string; name: string }>;
};

export const aiProviders: AiProvider[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: [
      { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
      { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
      { id: "deepseek-chat", name: "DeepSeek Chat" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
      { id: "gpt-4.1", name: "GPT-4.1" },
    ],
  },
  {
    id: "qwen",
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      { id: "qwen-plus", name: "Qwen Plus" },
      { id: "qwen-max", name: "Qwen Max" },
    ],
  },
  {
    id: "moonshot",
    name: "Kimi / Moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    models: [
      { id: "kimi-k2-0711-preview", name: "Kimi K2" },
      { id: "moonshot-v1-32k", name: "Moonshot 32K" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "deepseek/deepseek-chat", name: "DeepSeek Chat via OpenRouter" },
      { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini via OpenRouter" },
    ],
  },
  {
    id: "custom",
    name: "自定义 OpenAI 兼容接口",
    baseUrl: "",
    models: [{ id: "custom-model", name: "自定义模型" }],
  },
];

export function getProvider(providerId: string) {
  return aiProviders.find((provider) => provider.id === providerId) ?? aiProviders[0];
}
