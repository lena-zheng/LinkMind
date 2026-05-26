import { NextRequest, NextResponse } from "next/server";
import { listBriefingItems } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const items = listBriefingItems({
    date: params.get("date") || undefined,
    language: params.get("language") || "all",
    category: params.get("category") || "all",
  });
  return NextResponse.json({ items });
}
