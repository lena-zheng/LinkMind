type RssLikeItem = {
  enclosure?: { url?: string; type?: string };
  "media:content"?: { $?: { url?: string; medium?: string; type?: string }; url?: string };
  "media:thumbnail"?: { $?: { url?: string }; url?: string };
  image?: string | { url?: string };
  content?: string;
  summary?: string;
};

function normalizeImageUrl(value: string | null | undefined, baseUrl?: string) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function firstImageFromHtml(html: string | undefined, baseUrl?: string) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return normalizeImageUrl(match?.[1], baseUrl);
}

export function imageFromRssItem(item: RssLikeItem, baseUrl?: string) {
  const mediaContent = item["media:content"];
  const mediaThumbnail = item["media:thumbnail"];
  const image = item.image;
  const candidates = [
    item.enclosure?.type?.startsWith("image/") ? item.enclosure.url : null,
    mediaContent?.$?.medium === "image" || mediaContent?.$?.type?.startsWith("image/") ? mediaContent.$.url : null,
    mediaContent?.url,
    mediaThumbnail?.$?.url,
    mediaThumbnail?.url,
    typeof image === "string" ? image : image?.url,
    firstImageFromHtml(item.content, baseUrl),
    firstImageFromHtml(item.summary, baseUrl),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, baseUrl);
    if (normalized) return normalized;
  }

  return null;
}

export function imageFromDocument(document: Document, baseUrl: string) {
  const candidates = [
    document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute("content"),
    document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
    document.querySelector('meta[name="twitter:image"]')?.getAttribute("content"),
    document.querySelector('meta[name="twitter:image:src"]')?.getAttribute("content"),
    document.querySelector("article img")?.getAttribute("src"),
    document.querySelector("main img")?.getAttribute("src"),
    document.querySelector("img")?.getAttribute("src"),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, baseUrl);
    if (normalized) return normalized;
  }

  return null;
}
