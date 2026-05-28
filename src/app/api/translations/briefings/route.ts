import { NextResponse } from "next/server";
import { translateBriefingsToChinese } from "@/lib/translate";

export const runtime = "nodejs";

type RequestItem = {
  id?: unknown;
  title?: unknown;
  summary?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json()) as { items?: RequestItem[] };
  const items = (body.items || []).flatMap((item) => {
    if (typeof item.id !== "number" || typeof item.title !== "string" || typeof item.summary !== "string") {
      return [];
    }

    return [
      {
        id: item.id,
        title: item.title,
        summary: item.summary,
      },
    ];
  });

  if (!items.length) {
    return NextResponse.json({ items: [] });
  }

  try {
    const translations = await translateBriefingsToChinese(items);
    return NextResponse.json({ items: translations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to translate briefing items." },
      { status: 500 },
    );
  }
}
