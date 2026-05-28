type TranslationInput = {
  id: number;
  title: string;
  summary: string;
};

export type BriefingTranslation = TranslationInput;

type LibreTranslateResponse = {
  translatedText?: string;
};

const separator = "\n\n--- LINKMIND_SUMMARY ---\n\n";

function splitTranslatedText(value: string, fallback: TranslationInput) {
  const [title, ...summaryParts] = value.split("--- LINKMIND_SUMMARY ---");
  const summary = summaryParts.join("--- LINKMIND_SUMMARY ---");

  return {
    title: title.trim() || fallback.title,
    summary: summary.trim() || fallback.summary,
  };
}

async function translateText(value: string) {
  const baseUrl = process.env.LIBRETRANSLATE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("Missing LIBRETRANSLATE_URL. Set it to a self-hosted LibreTranslate endpoint.");
  }

  const body: Record<string, string> = {
    q: value,
    source: "auto",
    target: process.env.LIBRETRANSLATE_TARGET || "zh",
    format: "text",
  };

  if (process.env.LIBRETRANSLATE_API_KEY) {
    body.api_key = process.env.LIBRETRANSLATE_API_KEY;
  }

  const response = await fetch(`${baseUrl}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`LibreTranslate request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as LibreTranslateResponse;
  return data.translatedText || value;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await task(items[currentIndex]);
      }
    }),
  );

  return results;
}

export async function translateBriefingsToChinese(items: TranslationInput[]) {
  const sourceItems = items.slice(0, 100).map((item) => ({
    id: item.id,
    title: item.title.slice(0, 500),
    summary: item.summary.slice(0, 1200),
  }));

  return runWithConcurrency(sourceItems, 4, async (item) => {
    const translatedText = await translateText(`${item.title}${separator}${item.summary}`);
    const translated = splitTranslatedText(translatedText, item);

    return {
      id: item.id,
      title: translated.title,
      summary: translated.summary,
    };
  });
}
