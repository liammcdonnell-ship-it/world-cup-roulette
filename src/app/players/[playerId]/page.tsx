/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/nav";
import TeamLink from "@/components/TeamLink";
import { supabase } from "@/lib/supabase";
import { getTeamEliminationMap } from "@/lib/teamStatus";
import {
  countPlayedMatchesForTeam,
  formatGoalsInGames,
  type TeamMatchRow,
} from "@/lib/teamGames";

type PlayerRow = {
  id: number;
  name: string;
};

type LeaderboardRow = {
  game_id: number;
  game_name: string;
  game_slug: string;
  player_id: number;
  player_name: string;
  total_goals: number;
  status: string;
};

type LeaderboardTeamRow = {
  player_id: number;
  player_team_id: number;
  team_id: number;
  draw_round: string;
  scoring_starts_at: string | null;
  team_name: string;
  team_code: string | null;
  flag_image_url: string | null;
  counting_goals: number;
};

const drawRoundOrder: Record<string, number> = {
  initial: 1,
  second: 2,
  third: 3,
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function getDisplayStatus(totalGoals: number) {
  if (totalGoals === 21) {
    return "Perfect 21";
  }

  if (totalGoals > 21) {
    return "Bust";
  }

  return `${21 - totalGoals} to go`;
}

function sortStandings(rows: LeaderboardRow[]) {
  return [...rows].sort((a, b) => {
    if (b.total_goals !== a.total_goals) {
      return b.total_goals - a.total_goals;
    }

    return a.game_name.localeCompare(b.game_name);
  });
}

function sortGameLeaderboard(rows: LeaderboardRow[]) {
  return [...rows].sort((a, b) => {
    const aGoals = a.total_goals;
    const bGoals = b.total_goals;
    const aBust = aGoals > 21;
    const bBust = bGoals > 21;

    if (aGoals === 21 && bGoals !== 21) return -1;
    if (bGoals === 21 && aGoals !== 21) return 1;

    if (!aBust && bBust) return -1;
    if (aBust && !bBust) return 1;

    if (!aBust && !bBust) {
      return bGoals - aGoals;
    }

    return aGoals - bGoals;
  });
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const numericPlayerId = Number(playerId);

  if (!numericPlayerId) {
    notFound();
  }

  const { data: selectedPlayerData } = await supabase
    .from("players")
    .select("id, name")
    .eq("id", numericPlayerId)
    .single();

  if (!selectedPlayerData) {
    notFound();
  }

  const selectedPlayer = selectedPlayerData as PlayerRow;
  const selectedName = normalizeName(selectedPlayer.name);

  const { data: playersData } = await supabase
    .from("players")
    .select("id, name");

  const matchingPlayers = ((playersData ?? []) as PlayerRow[]).filter(
    (player) => normalizeName(player.name) === selectedName
  );
  const playerIds = matchingPlayers.map((player) => player.id);

  const { data: leaderboardData, error: leaderboardError } =
    playerIds.length > 0
      ? await supabase
          .from("game_leaderboard")
          .select(
            "game_id, game_name, game_slug, player_id, player_name, total_goals, status"
          )
          .in("player_id", playerIds)
      : { data: [], error: null };

  const { data: teamsData, error: teamsError } =
    playerIds.length > 0
      ? await supabase
          .from("game_leaderboard_teams")
          .select(
            "player_id, player_team_id, team_id, draw_round, scoring_starts_at, team_name, team_code, flag_image_url, counting_goals"
          )
          .in("player_id", playerIds)
      : { data: [], error: null };

  if (leaderboardError || teamsError) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <Nav activePage="games" />
          <h1 className="mb-4 text-3xl font-bold">Player Standings</h1>
          <p className="text-red-600">Error loading player standings.</p>
          <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-4">
            {leaderboardError?.message ?? teamsError?.message}
          </pre>
        </div>
      </main>
    );
  }

  const standings = sortStandings((leaderboardData ?? []) as LeaderboardRow[]);
  const gameIds = [...new Set(standings.map((standing) => standing.game_id))];
  const { data: gameLeaderboardData } =
    gameIds.length > 0
      ? await supabase
          .from("game_leaderboard")
          .select(
            "game_id, game_name, game_slug, player_id, player_name, total_goals, status"
          )
          .in("game_id", gameIds)
      : { data: [] };
  const ranksByPlayer = new Map<number, number>();
  const rowsByGame = new Map<number, LeaderboardRow[]>();

  for (const row of (gameLeaderboardData ?? []) as LeaderboardRow[]) {
    const gameRows = rowsByGame.get(row.game_id) ?? [];
    gameRows.push(row);
    rowsByGame.set(row.game_id, gameRows);
  }

  for (const gameRows of rowsByGame.values()) {
    sortGameLeaderboard(gameRows).forEach((row, index) => {
      ranksByPlayer.set(row.player_id, index + 1);
    });
  }

  const teams = (teamsData ?? []) as LeaderboardTeamRow[];
  const teamEliminatedById = await getTeamEliminationMap();
  const { data: matchesData } = await supabase
    .from("matches_display")
    .select("home_team_id, away_team_id, status, kickoff_time");
  const matches = (matchesData ?? []) as TeamMatchRow[];
  const teamsByPlayer = new Map<number, LeaderboardTeamRow[]>();

  for (const team of teams) {
    const existingTeams = teamsByPlayer.get(team.player_id) ?? [];
    existingTeams.push(team);
    teamsByPlayer.set(team.player_id, existingTeams);
  }

  for (const playerTeams of teamsByPlayer.values()) {
    playerTeams.sort((a, b) => {
      const roundDifference =
        (drawRoundOrder[a.draw_round] ?? 99) -
        (drawRoundOrder[b.draw_round] ?? 99);

      if (roundDifference !== 0) {
        return roundDifference;
      }

      return a.team_name.localeCompare(b.team_name);
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Nav activePage="games" />

        <div className="mb-8">
          <Link href="/games" className="text-sm text-gray-600 underline">
            Back to games
          </Link>
        </div>

        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">
          {selectedPlayer.name}&apos;s Standings
        </h1>
        <p className="mb-8 text-gray-600">
          Showing every game where this player name appears, including their
          current total and drawn teams.
        </p>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 sm:p-4">Game</th>
                <th className="w-20 p-3 sm:p-4">Rank</th>
                <th className="p-3 sm:p-4">Teams</th>
                <th className="w-20 p-3 text-right sm:p-4">Goals</th>
                <th className="w-28 p-3 sm:p-4">Status</th>
                <th className="w-28 p-3 sm:p-4">Matches</th>
              </tr>
            </thead>

            <tbody>
              {standings.map((standing) => {
                const playerTeams =
                  teamsByPlayer.get(standing.player_id) ?? [];

                return (
                  <tr
                    key={`${standing.game_id}-${standing.player_id}`}
                    className="border-t align-top"
                  >
                    <td className="p-3 font-semibold sm:p-4">
                      <Link
                        href={`/games/${standing.game_slug}#player-${standing.player_id}`}
                        className="underline underline-offset-2"
                      >
                        {standing.game_name}
                      </Link>
                    </td>

                    <td className="p-3 font-semibold text-gray-700 sm:p-4">
                      #{ranksByPlayer.get(standing.player_id) ?? "-"}
                    </td>

                    <td className="p-3 sm:p-4">
                      <div className="flex flex-wrap gap-2">
                        {playerTeams.length > 0 ? (
                          playerTeams.map((team) => (
                            <span
                              key={team.player_team_id}
                              className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-xs font-medium text-gray-700"
                            >
                              {team.flag_image_url && (
                                <img
                                  src={team.flag_image_url}
                                  alt=""
                                  className="h-3 w-4 rounded-sm object-cover"
                                />
                              )}
                              <TeamLink
                                teamId={team.team_id}
                                name={team.team_name}
                                code={team.team_code}
                                flagUrl={null}
                                imageClassName="hidden"
                                className="gap-0"
                                isEliminated={
                                  teamEliminatedById.get(team.team_id) ?? false
                                }
                              />
                              <span>
                                (
                                {formatGoalsInGames(
                                  team.counting_goals,
                                  countPlayedMatchesForTeam(
                                    matches,
                                    team.team_id,
                                    team.scoring_starts_at
                                  )
                                )}
                                )
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500">
                            No teams drawn yet
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-right text-lg font-bold sm:p-4">
                      {standing.total_goals}
                    </td>

                    <td className="p-3 text-gray-600 sm:p-4">
                      {getDisplayStatus(standing.total_goals)}
                    </td>

                    <td className="p-3 sm:p-4">
                      <Link
                        href={`/games/${standing.game_slug}/players/${standing.player_id}/matches`}
                        className="rounded-lg border bg-gray-100 px-3 py-2 text-xs font-semibold underline hover:bg-gray-200"
                      >
                        Matches
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {standings.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={6}>
                    No standings found for this player yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Team totals show counting goals and games played for that player in
          each game.
        </p>
      </div>
    </main>
  );
}
