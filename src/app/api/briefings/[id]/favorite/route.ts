import { NextResponse } from "next/server";
import { getBriefingItem } from "@/lib/db";
import { ingestLink } from "@/lib/ingest";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const briefing = getBriefingItem(Number(id));
  if (!briefing) {
    return NextResponse.json({ error: "Briefing item not found." }, { status: 404 });
  }

  try {
    const item = await ingestLink(briefing.url, briefing.id);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save and organize this item." },
      { status: 500 },
    );
  }
}
