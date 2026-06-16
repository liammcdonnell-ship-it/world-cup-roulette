/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Nav from "@/components/nav";
import AdminNav from "@/components/AdminNav";
import TeamLink from "@/components/TeamLink";
import { supabase } from "@/lib/supabase";
import { getTeamEliminationMap } from "@/lib/teamStatus";

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

function getDisplayStatus(totalGoals: number) {
  if (totalGoals === 21) {
    return "Perfect 21";
  }

  if (totalGoals > 21) {
    return "Bust";
  }

  return `${21 - totalGoals} to go`;
}

function getRowClass(totalGoals: number) {
  if (totalGoals === 21) {
    return "border-t bg-green-50";
  }

  if (totalGoals > 21) {
    return "border-t bg-red-50";
  }

  return "border-t";
}

function sortLeaderboard(rows: LeaderboardRow[]) {
  return [...rows].sort((a, b) => {
    if (b.total_goals !== a.total_goals) {
      return b.total_goals - a.total_goals;
    }

    return a.player_name.localeCompare(b.player_name);
  });
}

function getGameRanks(rows: LeaderboardRow[]) {
  const ranks = new Map<number, number>();
  const rowsByGame = new Map<number, LeaderboardRow[]>();

  for (const row of rows) {
    const gameRows = rowsByGame.get(row.game_id) ?? [];
    gameRows.push(row);
    rowsByGame.set(row.game_id, gameRows);
  }

  for (const gameRows of rowsByGame.values()) {
    sortLeaderboard(gameRows).forEach((row, index) => {
      ranks.set(row.player_id, index + 1);
    });
  }

  return ranks;
}

export default async function AdminLeaderboardsPage() {
  const { data, error } = await supabase
    .from("game_leaderboard")
    .select(
      "game_id, game_name, game_slug, player_id, player_name, total_goals, status"
    );

  const { data: teamsData, error: teamsError } = await supabase
    .from("game_leaderboard_teams")
    .select(
      "player_id, player_team_id, team_id, draw_round, team_name, team_code, flag_image_url, counting_goals"
    );

  if (error || teamsError) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="mb-4 text-3xl font-bold">Admin: Leaderboards</h1>
        <p className="text-red-600">Error loading leaderboards.</p>
        <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-4">
          {error?.message ?? teamsError?.message}
        </pre>
      </main>
    );
  }

  const leaderboards = sortLeaderboard((data ?? []) as LeaderboardRow[]);
  const gameRanks = getGameRanks((data ?? []) as LeaderboardRow[]);
  const leaderboardTeams = (teamsData ?? []) as LeaderboardTeamRow[];
  const teamEliminatedById = await getTeamEliminationMap();
  const teamsByPlayer = new Map<number, LeaderboardTeamRow[]>();

  for (const team of leaderboardTeams) {
    const existingTeams = teamsByPlayer.get(team.player_id) ?? [];
    existingTeams.push(team);
    teamsByPlayer.set(team.player_id, existingTeams);
  }

  for (const teams of teamsByPlayer.values()) {
    teams.sort((a, b) => {
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
      <div className="mx-auto max-w-6xl">
        <Nav activePage="admin" />
        <AdminNav activePage="leaderboards" />

        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">
          Admin: Leaderboards
        </h1>
        <p className="mb-8 text-gray-600">
          A merged view of every current leaderboard. Each player row shows the
          game they belong to.
        </p>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[1040px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Game</th>
                <th className="p-4">Rank</th>
                <th className="p-4">Player</th>
                <th className="p-4">Teams</th>
                <th className="p-4 text-right">Goals</th>
                <th className="p-4">Status</th>
                <th className="p-4">Links</th>
              </tr>
            </thead>
            <tbody>
              {leaderboards.map((row) => {
                const playerTeams = teamsByPlayer.get(row.player_id) ?? [];

                return (
                  <tr
                    key={`${row.game_id}-${row.player_id}`}
                    className={getRowClass(row.total_goals)}
                  >
                    <td className="p-4 font-semibold">
                      <Link
                        href={`/games/${row.game_slug}`}
                        className="underline"
                      >
                        {row.game_name}
                      </Link>
                    </td>
                    <td className="p-4 text-gray-600">
                      {gameRanks.get(row.player_id) ?? "-"}
                    </td>
                    <td className="p-4 font-semibold">{row.player_name}</td>
                    <td className="p-4">
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
                              <span>- {team.counting_goals}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">
                            No teams drawn yet
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right text-lg font-bold">
                      {row.total_goals}
                    </td>
                    <td className="p-4 text-gray-600">
                      {getDisplayStatus(row.total_goals)}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/games/${row.game_slug}/players/${row.player_id}/matches`}
                        className="rounded-lg border bg-gray-100 px-3 py-2 text-sm font-semibold underline hover:bg-gray-200"
                      >
                        Matches
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {leaderboards.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={7}>
                    No leaderboard rows yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Ranks are calculated within each game, then all games are shown
          together in this table.
        </p>
      </div>
    </main>
  );
}
