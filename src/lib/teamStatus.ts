import { supabase } from "@/lib/supabase";

export type TeamDisplayStatus = "active" | "eliminated" | "third_place_playoff";

type TeamStatusRow = {
  id: number;
  name: string;
  code: string | null;
  is_eliminated: boolean;
};

type MatchDisplayRow = {
  home_team_id: number;
  away_team_id: number;
  status: string;
};

type FootballDataTeam = {
  name: string | null;
  shortName?: string | null;
  tla?: string | null;
};

type FootballDataMatch = {
  stage?: string | null;
  status: string;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: {
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  };
};

type FootballDataResponse = {
  matches?: FootballDataMatch[];
};

const FOOTBALL_DATA_URL =
  "https://api.football-data.org/v4/competitions/WC/matches";

function normaliseName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function getTeamAliases(team: TeamStatusRow) {
  const aliases = new Set<string>([normaliseName(team.name)]);

  if (team.code) {
    aliases.add(normaliseName(team.code));
  }

  return aliases;
}

function getApiTeamAliases(team: FootballDataTeam) {
  return [team.name, team.shortName, team.tla]
    .filter((value): value is string => Boolean(value))
    .map(normaliseName);
}

function findLocalTeamId(
  apiTeam: FootballDataTeam,
  teamIdByAlias: Map<string, number>
) {
  return getApiTeamAliases(apiTeam)
    .map((alias) => teamIdByAlias.get(alias))
    .find((teamId): teamId is number => Boolean(teamId));
}

async function getThirdPlacePlayoffTeamIds(
  teams: TeamStatusRow[],
  teamEliminatedById: Map<number, boolean>
) {
  const thirdPlaceTeamIds = new Set<number>();

  const { data: localMatchesData } = await supabase
    .from("matches_display")
    .select("home_team_id, away_team_id, status");

  for (const match of (localMatchesData ?? []) as MatchDisplayRow[]) {
    if (match.status === "finished") {
      continue;
    }

    if (teamEliminatedById.get(match.home_team_id)) {
      thirdPlaceTeamIds.add(match.home_team_id);
    }

    if (teamEliminatedById.get(match.away_team_id)) {
      thirdPlaceTeamIds.add(match.away_team_id);
    }
  }

  if (!process.env.FOOTBALL_DATA_TOKEN) {
    return thirdPlaceTeamIds;
  }

  const teamIdByAlias = new Map<string, number>();

  for (const team of teams) {
    for (const alias of getTeamAliases(team)) {
      teamIdByAlias.set(alias, team.id);
    }
  }

  try {
    const response = await fetch(FOOTBALL_DATA_URL, {
      headers: {
        "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return thirdPlaceTeamIds;
    }

    const apiJson = (await response.json()) as FootballDataResponse;
    const apiMatches = apiJson.matches ?? [];
    const thirdPlaceMatch = apiMatches.find(
      (match) => match.stage === "THIRD_PLACE"
    );

    if (!thirdPlaceMatch || thirdPlaceMatch.status === "FINISHED") {
      return thirdPlaceTeamIds;
    }

    const thirdPlaceHomeTeamId = findLocalTeamId(
      thirdPlaceMatch.homeTeam,
      teamIdByAlias
    );
    const thirdPlaceAwayTeamId = findLocalTeamId(
      thirdPlaceMatch.awayTeam,
      teamIdByAlias
    );

    if (thirdPlaceHomeTeamId) {
      thirdPlaceTeamIds.add(thirdPlaceHomeTeamId);
    }

    if (thirdPlaceAwayTeamId) {
      thirdPlaceTeamIds.add(thirdPlaceAwayTeamId);
    }

    if (thirdPlaceHomeTeamId || thirdPlaceAwayTeamId) {
      return thirdPlaceTeamIds;
    }

    for (const match of apiMatches) {
      if (match.stage !== "SEMI_FINALS" || match.status !== "FINISHED") {
        continue;
      }

      const homeTeamId = findLocalTeamId(match.homeTeam, teamIdByAlias);
      const awayTeamId = findLocalTeamId(match.awayTeam, teamIdByAlias);

      if (match.score.winner === "HOME_TEAM" && awayTeamId) {
        thirdPlaceTeamIds.add(awayTeamId);
      }

      if (match.score.winner === "AWAY_TEAM" && homeTeamId) {
        thirdPlaceTeamIds.add(homeTeamId);
      }
    }
  } catch {
    return thirdPlaceTeamIds;
  }

  return thirdPlaceTeamIds;
}

export async function getTeamStatusMaps() {
  const { data } = await supabase
    .from("teams")
    .select("id, name, code, is_eliminated");

  const teams = (data ?? []) as TeamStatusRow[];
  const teamEliminatedById = new Map(
    teams.map((team) => [team.id, team.is_eliminated])
  );
  const teamThirdPlacePlayoffById = await getThirdPlacePlayoffTeamIds(
    teams,
    teamEliminatedById
  );
  const teamDisplayStatusById = new Map<number, TeamDisplayStatus>();

  for (const team of teams) {
    const status = teamThirdPlacePlayoffById.has(team.id)
      ? "third_place_playoff"
      : team.is_eliminated
        ? "eliminated"
        : "active";

    teamDisplayStatusById.set(team.id, status);
  }

  return {
    teamEliminatedById,
    teamThirdPlacePlayoffById,
    teamDisplayStatusById,
  };
}

export async function getTeamEliminationMap() {
  const { teamEliminatedById } = await getTeamStatusMaps();

  return teamEliminatedById;
}
