import { NextRequest, NextResponse } from "next/server";
import { getLatestBriefingFetchedAt, listBriefingItems, todayInShanghai } from "@/lib/db";
import { getSchedulerStatus } from "@/lib/scheduler";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const date = params.get("date") || todayInShanghai();
  const items = listBriefingItems({
    date,
    language: params.get("language") || "all",
    category: params.get("category") || "all",
  });
  return NextResponse.json({
    items,
    refresh: {
      date,
      latestFetchedAt: getLatestBriefingFetchedAt(date),
      scheduler: getSchedulerStatus(),
    },
  });
}
