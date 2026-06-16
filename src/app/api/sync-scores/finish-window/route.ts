import { NextRequest, NextResponse } from "next/server";
import { isAuthorisedCronRequest } from "@/lib/cronAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncScoresFromFootballData } from "@/lib/syncScores";

const NORMAL_FINISH_BUFFER_MINUTES = 105;
const EXTRA_TIME_AND_PENALTIES_BUFFER_MINUTES = 270;

type MatchWindowRow = {
  id: number;
  kickoff_time: string | null;
  status: string;
};

function minutesAgo(minutes: number, now = new Date()) {
  return new Date(now.getTime() - minutes * 60 * 1000).toISOString();
}

async function getMatchesLikelyToNeedRefresh(now = new Date()) {
  const earliestKickoff = minutesAgo(
    EXTRA_TIME_AND_PENALTIES_BUFFER_MINUTES,
    now
  );
  const latestKickoff = minutesAgo(NORMAL_FINISH_BUFFER_MINUTES, now);

  const { data, error } = await supabaseAdmin
    .from("matches")
    .select("id, kickoff_time, status")
    .in("status", ["scheduled", "live"])
    .gte("kickoff_time", earliestKickoff)
    .lte("kickoff_time", latestKickoff);

  return {
    matches: (data ?? []) as MatchWindowRow[],
    error,
    earliestKickoff,
    latestKickoff,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorisedCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorised sync request" },
      { status: 401 }
    );
  }

  const { matches, error, earliestKickoff, latestKickoff } =
    await getMatchesLikelyToNeedRefresh();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not check match finish window",
        details: error.message,
      },
      { status: 500 }
    );
  }

  if (matches.length === 0) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "No unfinished matches are in the likely finish window.",
      checked_kickoff_window: {
        from: earliestKickoff,
        to: latestKickoff,
      },
    });
  }

  const result = await syncScoresFromFootballData();

  return NextResponse.json(
    {
      ...result,
      finish_window_match_count: matches.length,
      checked_kickoff_window: {
        from: earliestKickoff,
        to: latestKickoff,
      },
    },
    { status: result.ok ? 200 : 500 }
  );
}
