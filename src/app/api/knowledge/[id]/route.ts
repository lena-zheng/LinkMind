import { NextResponse } from "next/server";
import { getKnowledgeItem } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = getKnowledgeItem(Number(id));
  if (!item) {
    return NextResponse.json({ error: "Knowledge item not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}
