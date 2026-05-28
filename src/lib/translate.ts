type TranslationInput = {
  id: number;
  title: string;
  summary: string;
};

export type BriefingTranslation = TranslationInput;

function safeJsonParse(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(value.slice(start, end + 1)) as { items?: BriefingTranslation[] };
  } catch {
    return null;
  }
}

function normalizeItems(items: unknown, fallback: TranslationInput[]) {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Partial<BriefingTranslation>;
    const original = fallback.find((entry) => entry.id === value.id);
    if (!original) return [];

    return [
      {
        id: original.id,
        title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : original.title,
        summary: typeof value.summary === "string" && value.summary.trim() ? value.summary.trim() : original.summary,
      },
    ];
  });
}

export async function translateBriefingsToChinese(items: TranslationInput[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it to enable Chinese article translation.");
  }

  const sourceItems = items.slice(0, 100).map((item) => ({
    id: item.id,
    title: item.title.slice(0, 500),
    summary: item.summary.slice(0, 1200),
  }));

  if (!sourceItems.length) return [];

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
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Translate AI news titles and summaries into concise, natural Simplified Chinese. Preserve brand names, product names, model names, URLs, and technical terms when appropriate. Return strict JSON only: {\"items\":[{\"id\":number,\"title\":string,\"summary\":string}]}",
        },
        {
          role: "user",
          content: JSON.stringify({ items: sourceItems }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Translation request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = safeJsonParse(data.choices?.[0]?.message?.content || "");
  return normalizeItems(parsed?.items, sourceItems);
}
