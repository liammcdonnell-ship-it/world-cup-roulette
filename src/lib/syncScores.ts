import { supabaseAdmin } from "@/lib/supabaseAdmin";

type FootballDataMatch = {
  id: number;
  utcDate: string | null;
  status: string;
  homeTeam: {
    id: number | null;
    name: string | null;
    shortName?: string | null;
    tla?: string | null;
  };
  awayTeam: {
    id: number | null;
    name: string | null;
    shortName?: string | null;
    tla?: string | null;
  };
  score: {
    fullTime: {
      home: number | null;
      away: number | null;
    };
    regularTime?: {
      home: number | null;
      away: number | null;
    };
    extraTime?: {
      home: number | null;
      away: number | null;
    };
    penalties?: {
      home: number | null;
      away: number | null;
    };
  };
};

type FootballDataResponse = {
  matches?: FootballDataMatch[];
  errorCode?: number;
  message?: string;
};

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
};

const FOOTBALL_DATA_URL =
  "https://api.football-data.org/v4/competitions/WC/matches";

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
    "united states": ["usa", "united states of america"],
    "korea republic": ["south korea", "korea republic"],
    "ir iran": ["iran", "islamic republic of iran"],
    "czechia": ["czech republic"],
    "turkiye": ["turkey", "türkiye"],
    "cote divoire": ["ivory coast", "côte divoire", "cote d ivoire"],
    "cabo verde": ["cape verde", "cape verde islands"],
    "congo dr": ["dr congo", "d r congo", "democratic republic of congo"],
    "bosnia and herzegovina": [
      "bosnia",
      "bosnia herzegovina",
      "bosnia-herzegovina",
    ],
    "england": ["eng"],
    "scotland": ["sco"],
  };

  for (const alias of manualAliases[normalised] ?? []) {
    aliases.add(normaliseName(alias));
  }

  return aliases;
}

function getApiTeamAliases(team: FootballDataMatch["homeTeam"]) {
  const aliases = new Set<string>();

  if (team.name) {
    aliases.add(normaliseName(team.name));
  }

  if (team.shortName) {
    aliases.add(normaliseName(team.shortName));
  }

  if (team.tla) {
    aliases.add(normaliseName(team.tla));
  }

  return Array.from(aliases);
}

function footballDataStatusToAppStatus(status: string) {
  if (status === "FINISHED") {
    return "finished";
  }

  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) {
    return "live";
  }

  return "scheduled";
}

function getFullTimeGoals(match: FootballDataMatch) {
  return {
    home: match.score.fullTime.home,
    away: match.score.fullTime.away,
  };
}

export async function syncScoresFromFootballData() {
  if (!process.env.FOOTBALL_DATA_TOKEN) {
    return {
      ok: false,
      provider: "football-data.org",
      error: "Missing FOOTBALL_DATA_TOKEN",
    };
  }

  const { data: teamsData, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select("id, name, code");

  if (teamsError) {
    return {
      ok: false,
      provider: "football-data.org",
      error: "Could not load teams",
      details: teamsError.message,
    };
  }

  const teams = (teamsData ?? []) as TeamRow[];

  const teamIdByAlias = new Map<string, number>();

  for (const team of teams) {
    for (const alias of getTeamAliases(team)) {
      teamIdByAlias.set(alias, team.id);
    }
  }

  const apiResponse = await fetch(FOOTBALL_DATA_URL, {
    headers: {
      "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN,
    },
    cache: "no-store",
  });

  const apiJson = (await apiResponse.json()) as FootballDataResponse;

  if (!apiResponse.ok) {
    return {
      ok: false,
      provider: "football-data.org",
      error: "football-data.org request failed",
      status: apiResponse.status,
      details: apiJson,
    };
  }

  const matches = apiJson.matches ?? [];

  const syncedMatches = [];
  const skippedMatches = [];

  for (const match of matches) {
    const externalFixtureId = String(match.id);

    const homeAliases = getApiTeamAliases(match.homeTeam);
    const awayAliases = getApiTeamAliases(match.awayTeam);

    const homeTeamId = homeAliases
      .map((alias) => teamIdByAlias.get(alias))
      .find(Boolean);

    const awayTeamId = awayAliases
      .map((alias) => teamIdByAlias.get(alias))
      .find(Boolean);

    if (!homeTeamId || !awayTeamId) {
      skippedMatches.push({
        fixture_id: externalFixtureId,
        home_team: match.homeTeam.name,
        home_aliases: homeAliases,
        away_team: match.awayTeam.name,
        away_aliases: awayAliases,
        reason: "Could not match one or both teams to local teams table",
      });

      continue;
    }

    const appStatus = footballDataStatusToAppStatus(match.status);
    const goals = getFullTimeGoals(match);

    const { error: upsertError } = await supabaseAdmin.from("matches").upsert(
      {
        external_fixture_id: `football-data-${externalFixtureId}`,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_goals: goals.home,
        away_goals: goals.away,
        status: appStatus,
        api_status: match.status,
        kickoff_time: match.utcDate,
        last_synced_at: new Date().toISOString(),
        source: "football-data",
      },
      {
        onConflict: "external_fixture_id",
      }
    );

    if (upsertError) {
      skippedMatches.push({
        fixture_id: externalFixtureId,
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
        reason: upsertError.message,
      });

      continue;
    }

    syncedMatches.push({
      fixture_id: externalFixtureId,
      home_team: match.homeTeam.name,
      away_team: match.awayTeam.name,
      status: appStatus,
      api_status: match.status,
      score: `${goals.home ?? "-"}-${goals.away ?? "-"}`,
    });
  }

  return {
    ok: true,
    provider: "football-data.org",
    match_count_from_api: matches.length,
    synced_count: syncedMatches.length,
    skipped_count: skippedMatches.length,
    synced_matches: syncedMatches,
    skipped_matches: skippedMatches,
  };
}