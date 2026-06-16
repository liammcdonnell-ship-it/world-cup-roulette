import { NextRequest, NextResponse } from "next/server";
import { isAuthorisedCronRequest } from "@/lib/cronAuth";
import { syncScoresFromFootballData } from "@/lib/syncScores";

export async function GET(request: NextRequest) {
  if (!isAuthorisedCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorised sync request" },
      { status: 401 }
    );
  }

  const result = await syncScoresFromFootballData();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
