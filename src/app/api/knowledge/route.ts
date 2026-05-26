import { NextRequest, NextResponse } from "next/server";
import { listKnowledgeItems } from "@/lib/db";
import { ingestLink } from "@/lib/ingest";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const items = listKnowledgeItems({
    q: params.get("q") || "",
    language: params.get("language") || "all",
    category: params.get("category") || "all",
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string };
  if (!body.url) {
    return NextResponse.json({ error: "Please provide a URL." }, { status: 400 });
  }

  try {
    const item = await ingestLink(body.url);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse the link." },
      { status: 500 },
    );
  }
}
