import type { Language } from "./types";

export type Source = {
  name: string;
  url: string;
  language: Language;
  type: "rss" | "web";
  linkIncludes?: string;
};

export const AI_SOURCES: Source[] = [
  { name: "OpenAI", url: "https://openai.com/news/rss.xml", language: "en", type: "rss" },
  { name: "Anthropic", url: "https://www.anthropic.com/news", language: "en", type: "web", linkIncludes: "/news/" },
  { name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml", language: "en", type: "rss" },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", language: "en", type: "rss" },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/", language: "en", type: "rss" },
  { name: "The Decoder", url: "https://the-decoder.com/feed/", language: "en", type: "rss" },
  { name: "arXiv cs.AI", url: "https://export.arxiv.org/rss/cs.AI", language: "en", type: "rss" },
  { name: "量子位", url: "https://www.qbitai.com/feed", language: "zh", type: "rss" },
  { name: "少数派", url: "https://sspai.com/feed", language: "zh", type: "rss" },
];

export const CATEGORIES = [
  "Foundation Models",
  "AI Agent",
  "AI Coding",
  "AI Products",
  "AI Tools",
  "Multimodal",
  "Image / Video Generation",
  "Voice AI",
  "Robotics",
  "Open Source",
  "Research Papers",
  "Company Updates",
  "Business & Funding",
  "Policy & Regulation",
  "Industry Applications",
  "Other",
];

export const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  "大模型": "Foundation Models",
  "AI 编程": "AI Coding",
  "AI 产品": "AI Products",
  "AI 工具": "AI Tools",
  "多模态": "Multimodal",
  "图像 / 视频生成": "Image / Video Generation",
  "语音 AI": "Voice AI",
  "机器人": "Robotics",
  "开源项目": "Open Source",
  "论文研究": "Research Papers",
  "公司动态": "Company Updates",
  "融资商业": "Business & Funding",
  "政策监管": "Policy & Regulation",
  "行业应用": "Industry Applications",
  "其他": "Other",
};

export const CATEGORY_ALIASES: Record<string, string[]> = {
  "Foundation Models": ["大模型"],
  "AI Coding": ["AI 编程"],
  "AI Products": ["AI 产品"],
  "AI Tools": ["AI 工具"],
  "Multimodal": ["多模态"],
  "Image / Video Generation": ["图像 / 视频生成"],
  "Voice AI": ["语音 AI"],
  "Robotics": ["机器人"],
  "Open Source": ["开源项目"],
  "Research Papers": ["论文研究"],
  "Company Updates": ["公司动态"],
  "Business & Funding": ["融资商业"],
  "Policy & Regulation": ["政策监管"],
  "Industry Applications": ["行业应用"],
  "Other": ["其他"],
};

export const SOURCE_LABELS: Record<string, string> = {
  "量子位": "QbitAI",
  "少数派": "Sspai",
};
