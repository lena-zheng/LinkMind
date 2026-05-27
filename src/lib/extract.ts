import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { detectLanguage } from "./ai";
import { imageFromDocument } from "./images";
import type { IngestedContent } from "./types";

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function meta(document: Document, name: string) {
  return (
    document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ||
    document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ||
    null
  );
}

function cleanText(value: string | null | undefined) {
  return (value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textFromSelector(document: Document, selector: string) {
  return cleanText(
    Array.from(document.querySelectorAll(selector))
      .map((element) => element.textContent || "")
      .join("\n\n"),
  );
}

function longestText(values: string[]) {
  return values.map(cleanText).sort((a, b) => b.length - a.length)[0] || "";
}

export async function extractUrl(url: string): Promise<IngestedContent> {
  const normalizedUrl = new URL(url).toString();
  const response = await fetch(normalizedUrl, {
    headers: { "User-Agent": userAgent, Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url: normalizedUrl });
  const document = dom.window.document;
  const readable = new Readability(new JSDOM(html, { url: normalizedUrl }).window.document).parse();
  const title = readable?.title || meta(document, "og:title") || document.title || normalizedUrl;
  document.querySelectorAll("script, style, noscript, svg").forEach((element) => element.remove());
  const content =
    longestText([
      readable?.textContent || "",
      textFromSelector(document, "article"),
      textFromSelector(document, "main"),
      textFromSelector(document, "#js_content"),
      textFromSelector(document, ".rich_media_content"),
      cleanText(document.body?.textContent),
    ]) || title;
  const publishedAt =
    meta(document, "article:published_time") ||
    meta(document, "publish_date") ||
    document.querySelector("time")?.getAttribute("datetime") ||
    null;

  return {
    title: title.trim(),
    url: normalizedUrl,
    source: hostname(normalizedUrl),
    author: meta(document, "author"),
    publishedAt,
    language: detectLanguage(`${title}\n${content}`),
    imageUrl: imageFromDocument(document, normalizedUrl),
    content,
  };
}
