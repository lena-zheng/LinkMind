import Parser from "rss-parser";
import { JSDOM } from "jsdom";
import { analyzeContent, detectLanguage, heuristicAnalyze } from "./ai";
import { upsertBriefingItems, todayInShanghai } from "./db";
import { imageFromDocument, imageFromRssItem } from "./images";
import { AI_SOURCES, type Source } from "./sources";
import type { BriefingItem } from "./types";

const parser = new Parser({
  timeout: 12000,
  headers: {
    "User-Agent": "AI Briefing Personal Knowledge Bot/0.1",
  },
});

function clean(value?: string) {
  return (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readRssSource(source: Source, digestDate: string, fetchedAt: string) {
  const feed = await parser.parseURL(source.url);
  return feed.items.slice(0, 12).flatMap((entry) => {
    const url = entry.link || entry.guid;
    if (!url) return [];

    const title = clean(entry.title) || url;
    const content = clean(entry.contentSnippet || entry.content || entry.summary || "");
    const language = detectLanguage(`${title}\n${content}`) || source.language;
    const analysis = heuristicAnalyze({
      title,
      source: source.name,
      content: content || title,
      language,
    });

    return [
      {
        title,
        url,
        source: source.name,
        sourceType: source.type,
        language,
        category: analysis.category,
        tags: analysis.tags,
        summary: analysis.summary,
        imageUrl: imageFromRssItem(entry, url),
        publishedAt: entry.isoDate || entry.pubDate || null,
        fetchedAt,
        digestDate,
        importanceScore: analysis.importanceScore,
      },
    ];
  });
}

async function readWebSource(source: Source, digestDate: string, fetchedAt: string) {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "AI Briefing Personal Knowledge Bot/0.1" },
  });
  if (!response.ok) throw new Error(`Status code ${response.status}`);
  const html = await response.text();
  const dom = new JSDOM(html, { url: source.url });
  const seen = new Set<string>();
  const links = Array.from(dom.window.document.querySelectorAll("a"))
    .map((anchor) => ({
      url: anchor.href,
      text: clean(anchor.textContent || ""),
    }))
    .filter((link) => link.url && (!source.linkIncludes || link.url.includes(source.linkIncludes)))
    .filter((link) => {
      if (seen.has(link.url)) return false;
      seen.add(link.url);
      return link.text.length > 16;
    })
    .slice(0, 12);

  return links.map((link) => {
    const language = detectLanguage(link.text) || source.language;
    const analysis = heuristicAnalyze({
      title: link.text,
      source: source.name,
      content: link.text,
      language,
    });

    return {
      title: link.text,
      url: link.url,
      source: source.name,
      sourceType: source.type,
      language,
      category: analysis.category,
      tags: analysis.tags,
      summary: analysis.summary,
      imageUrl: imageFromDocument(dom.window.document, link.url),
      publishedAt: null,
      fetchedAt,
      digestDate,
      importanceScore: analysis.importanceScore,
    };
  });
}

export async function refreshBriefings() {
  const digestDate = todayInShanghai();
  const fetchedAt = new Date().toISOString();
  const results: Omit<BriefingItem, "id" | "isFavorite" | "knowledgeItemId">[] = [];
  const errors: Array<{ source: string; message: string }> = [];

  await Promise.all(
    AI_SOURCES.map(async (source) => {
      try {
        const items =
          source.type === "rss"
            ? await readRssSource(source, digestDate, fetchedAt)
            : await readWebSource(source, digestDate, fetchedAt);
        results.push(...items);
      } catch (error) {
        errors.push({ source: source.name, message: error instanceof Error ? error.message : "Unknown error" });
      }
    }),
  );

  upsertBriefingItems(results);
  return { insertedOrUpdated: results.length, errors, digestDate };
}

export async function analyzeForKnowledge(input: {
  title: string;
  source: string;
  content: string;
  language: "zh" | "en";
}) {
  return analyzeContent(input);
}
