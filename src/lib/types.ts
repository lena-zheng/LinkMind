export type Language = "zh" | "en";

export type BriefingItem = {
  id: number;
  title: string;
  url: string;
  source: string;
  sourceType: string;
  language: Language;
  category: string;
  tags: string[];
  summary: string;
  imageUrl: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  digestDate: string;
  importanceScore: number;
  isFavorite: boolean;
  knowledgeItemId: number | null;
};

export type KnowledgeItem = {
  id: number;
  title: string;
  url: string;
  source: string;
  author: string | null;
  publishedAt: string | null;
  savedAt: string;
  language: Language;
  category: string;
  tags: string[];
  summary: string;
  imageUrl: string | null;
  keyPoints: string[];
  whyItMatters: string;
  useCases: string[];
  rawContent: string;
  aiNotes: string;
};

export type IngestedContent = {
  title: string;
  url: string;
  source: string;
  author: string | null;
  publishedAt: string | null;
  language: Language;
  imageUrl: string | null;
  content: string;
};

export type AiAnalysis = {
  summary: string;
  keyPoints: string[];
  category: string;
  tags: string[];
  importanceScore: number;
  whyItMatters: string;
  useCases: string[];
  aiNotes: string;
};
