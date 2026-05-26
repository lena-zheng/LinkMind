import { analyzeForKnowledge } from "./briefing";
import { markBriefingFavorite, upsertKnowledgeItem } from "./db";
import { extractUrl } from "./extract";

export async function ingestLink(url: string, briefingId?: number) {
  const extracted = await extractUrl(url);
  const analysis = await analyzeForKnowledge({
    title: extracted.title,
    source: extracted.source,
    content: extracted.content,
    language: extracted.language,
  });
  const saved = upsertKnowledgeItem({
    title: extracted.title,
    url: extracted.url,
    source: extracted.source,
    author: extracted.author,
    publishedAt: extracted.publishedAt,
    savedAt: new Date().toISOString(),
    language: extracted.language,
    category: analysis.category,
    tags: analysis.tags,
    summary: analysis.summary,
    imageUrl: extracted.imageUrl,
    keyPoints: analysis.keyPoints,
    whyItMatters: analysis.whyItMatters,
    useCases: analysis.useCases,
    rawContent: extracted.content,
    aiNotes: analysis.aiNotes,
  });

  if (briefingId) {
    markBriefingFavorite(briefingId, saved.id);
  }

  return saved.item;
}
