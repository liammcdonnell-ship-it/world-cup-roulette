import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string | null;
    status: {
      short: string | null;
      long: string | null;
    };
  };
  league: {
    round: string | null;
  };
  teams: {
    home: {
      name: string;
    };
    away: {
      name: string;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
};

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
};

const API_FOOTBALL_URL =
  "https://v3.football.api-sports.io/fixtures?league=1&season=2026";

const finishedStatuses = new Set(["FT", "AET", "PEN"]);

const liveStatuses = new Set([
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "SUSP",
  "INT",
  "LIVE",
]);

function normaliseName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function getTeamAliases(team: TeamRow) {
  const normalised = normaliseName(team.name);
  const aliases = new Set<string>([normalised]);

  if (team.code) {
    aliases.add(normaliseName(team.code));
  }

  const manualAliases: Record<string, string[]> = {
    "united states": ["usa", "united states of america", "usmnt"],
    "korea republic": ["south korea", "korea republic"],
    "ir iran": ["iran", "islamic republic of iran"],
    "czechia": ["czech republic"],
    "turkiye": ["turkey", "türkiye"],
    "cote divoire": ["ivory coast", "côte divoire", "cote d ivoire"],
    "cabo verde": ["cape verde"],
    "congo dr": ["dr congo", "d r congo", "democratic republic of congo"],
    "bosnia and herzegovina": ["bosnia", "bosnia herzegovina"],
  };

  for (const alias of manualAliases[normalised] ?? []) {
    aliases.add(normaliseName(alias));
  }

  return aliases;
}

function apiStatusToAppStatus(apiStatus: string | null) {
  if (!apiStatus) {
    return "scheduled";
  }

  if (finishedStatuses.has(apiStatus)) {
    return "finished";
  }

  if (liveStatuses.has(apiStatus)) {
    return "live";
  }

  return "scheduled";
}

function getRequestSecret(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "").trim();
  }

  return request.nextUrl.searchParams.get("secret");
}

export async function GET(request: NextRequest) {
  const requestSecret = getRequestSecret(request);

  if (!process.env.CRON_SECRET || requestSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorised sync request" },
      { status: 401 }
    );
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json(
      { error: "Missing API_FOOTBALL_KEY" },
      { status: 500 }
    );
  }

  const { data: teamsData, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("id, name, code");

  if (teamsError) {
    return NextResponse.json(
      { error: "Could not load teams", details: teamsError.message },
      { status: 500 }
    );
  }

  const teams = (teamsData ?? []) as TeamRow[];

  const teamIdByAlias = new Map<string, number>();

  for (const team of teams) {
    for (const alias of getTeamAliases(team)) {
      teamIdByAlias.set(alias, team.id);
    }
  }

  const apiResponse = await fetch(API_FOOTBALL_URL, {
    headers: {
      "x-apisports-key": process.env.API_FOOTBALL_KEY,
    },
    cache: "no-store",
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text();

    return NextResponse.json(
      {
        error: "API-Football request failed",
        status: apiResponse.status,
        details: errorText,
      },
      { status: 500 }
    );
  }

  const apiJson = await apiResponse.json();
  const fixtures = (apiJson.response ?? []) as ApiFootballFixture[];

  const syncedMatches = [];
  const skippedFixtures = [];

  for (const fixture of fixtures) {
    const externalFixtureId = String(fixture.fixture.id);
    const homeTeamName = fixture.teams.home.name;
    const awayTeamName = fixture.teams.away.name;

    const homeTeamId = teamIdByAlias.get(normaliseName(homeTeamName));
    const awayTeamId = teamIdByAlias.get(normaliseName(awayTeamName));

    if (!homeTeamId || !awayTeamId) {
      skippedFixtures.push({
        fixture_id: externalFixtureId,
        home_team: homeTeamName,
        away_team: awayTeamName,
        reason: "Could not match one or both teams to local teams table",
      });

      continue;
    }

    const apiStatus = fixture.fixture.status.short;
    const appStatus = apiStatusToAppStatus(apiStatus);

    const { error: upsertError } = await supabaseAdmin.from("matches").upsert(
      {
        external_fixture_id: externalFixtureId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_goals: fixture.goals.home,
        away_goals: fixture.goals.away,
        status: appStatus,
        api_status: apiStatus,
        kickoff_time: fixture.fixture.date,
        last_synced_at: new Date().toISOString(),
        source: "api-football",
      },
      {
        onConflict: "external_fixture_id",
      }
    );

    if (upsertError) {
      skippedFixtures.push({
        fixture_id: externalFixtureId,
        home_team: homeTeamName,
        away_team: awayTeamName,
        reason: upsertError.message,
      });

      continue;
    }

    syncedMatches.push({
      fixture_id: externalFixtureId,
      home_team: homeTeamName,
      away_team: awayTeamName,
      status: appStatus,
      api_status: apiStatus,
      score: `${fixture.goals.home ?? "-"}-${fixture.goals.away ?? "-"}`,
    });
  }

  return NextResponse.json({
    ok: true,
    fixture_count_from_api: fixtures.length,
    synced_count: syncedMatches.length,
    skipped_count: skippedFixtures.length,
    synced_matches: syncedMatches,
    skipped_fixtures: skippedFixtures,
  });
}