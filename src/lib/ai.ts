import type { AiAnalysis, Language } from "./types";

const categoryRules: Array<[string, string[]]> = [
  ["AI Agent", ["agent", "agents", "autonomous", "workflow", "operator", "computer use", "智能体"]],
  ["AI Coding", ["coding", "code", "developer", "dev", "programming", "copilot", "cursor", "编程", "代码"]],
  ["Multimodal", ["multimodal", "vision", "image", "audio", "speech", "video", "多模态", "视觉"]],
  ["Image / Video Generation", ["image generation", "video generation", "diffusion", "sora", "midjourney", "图像生成", "视频生成"]],
  ["Voice AI", ["voice", "speech", "tts", "asr", "audio", "语音"]],
  ["Open Source", ["github", "open source", "开源"]],
  ["Research Papers", ["paper", "arxiv", "research", "benchmark", "论文", "研究"]],
  ["Company Updates", ["launch", "release", "announces", "model card", "发布", "推出", "公司"]],
  ["Business & Funding", ["funding", "revenue", "startup", "valuation", "融资", "商业"]],
  ["Policy & Regulation", ["policy", "regulation", "safety", "governance", "监管", "政策", "安全"]],
  ["Industry Applications", ["healthcare", "education", "finance", "manufacturing", "行业", "医疗", "教育", "金融"]],
  ["Foundation Models", ["llm", "large language", "foundation model", "gpt", "claude", "gemini", "llama", "大模型"]],
];

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, 8);
}

export function detectLanguage(text: string): Language {
  const zhChars = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  return zhChars > Math.max(8, text.length * 0.08) ? "zh" : "en";
}

export function heuristicAnalyze(input: {
  title: string;
  source: string;
  content: string;
  language: Language;
}): AiAnalysis {
  const text = `${input.title}\n${input.content}`.toLowerCase();
  const category = categoryRules.find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))?.[0] || "Other";
  const tags = unique([
    category,
    ...categoryRules
      .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
      .map(([name]) => name),
    input.source,
  ]);
  const sentences = input.content
    .replace(/\s+/g, " ")
    .split(input.language === "zh" ? /(?<=[。！？])/ : /(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
  const keyPoints = sentences.slice(0, 4);
  const summary = keyPoints.slice(0, 2).join(input.language === "zh" ? "" : " ") || input.title;
  const importanceScore = Math.min(95, 45 + tags.length * 6 + (text.includes("openai") || text.includes("anthropic") || text.includes("deepmind") ? 10 : 0));

  return {
    summary: summary.slice(0, 520),
    keyPoints: keyPoints.length ? keyPoints : [input.title],
    category,
    tags,
    importanceScore,
    whyItMatters:
      `This item is relevant to ${category} and is useful for tracking AI trends over time.`,
    useCases: ["Trend tracking", "Research reference", "Knowledge base"],
    aiNotes: summary.slice(0, 900),
  };
}

function safeJsonParse(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(value.slice(start, end + 1)) as Partial<AiAnalysis>;
  } catch {
    return null;
  }
}

export async function analyzeContent(input: {
  title: string;
  source: string;
  content: string;
  language: Language;
}): Promise<AiAnalysis> {
  const fallback = heuristicAnalyze(input);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com";
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You organize AI news into a personal knowledge base. Return strict JSON only with: summary, keyPoints, category, tags, importanceScore, whyItMatters, useCases, aiNotes. Use the article language.",
          },
          {
            role: "user",
            content: JSON.stringify({
              title: input.title,
              source: input.source,
              language: input.language,
              content: input.content.slice(0, 12000),
            }),
          },
        ],
      }),
    });

    if (!response.ok) return fallback;
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = safeJsonParse(data.choices?.[0]?.message?.content || "");
    if (!parsed) return fallback;

    return {
      summary: parsed.summary || fallback.summary,
      keyPoints: Array.isArray(parsed.keyPoints) && parsed.keyPoints.length ? parsed.keyPoints.slice(0, 6) : fallback.keyPoints,
      category: parsed.category || fallback.category,
      tags: Array.isArray(parsed.tags) ? unique(parsed.tags) : fallback.tags,
      importanceScore: Math.max(1, Math.min(100, Number(parsed.importanceScore || fallback.importanceScore))),
      whyItMatters: parsed.whyItMatters || fallback.whyItMatters,
      useCases: Array.isArray(parsed.useCases) && parsed.useCases.length ? parsed.useCases.slice(0, 5) : fallback.useCases,
      aiNotes: parsed.aiNotes || fallback.aiNotes,
    };
  } catch {
    return fallback;
  }
}
