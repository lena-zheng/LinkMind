import { NextResponse } from "next/server";
import { refreshBriefings } from "@/lib/briefing";

export const runtime = "nodejs";

export async function POST() {
  const result = await refreshBriefings();
  return NextResponse.json(result);
}
