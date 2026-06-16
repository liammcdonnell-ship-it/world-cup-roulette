/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import GameNav from "@/components/GameNav";
import TeamLink from "@/components/TeamLink";
import { supabase } from "@/lib/supabase";

type GameLeaderboardRow = {
  game_id: number;
  game_name: string;
  game_slug: string;
  player_id: number;
  player_name: string;
  total_goals: number;
  status: string;
};

type GameLeaderboardTeamRow = {
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
    return "🎯 Perfect 21!";
  }

  if (totalGoals > 21) {
    return "💩 Bust";
  }

  return `${21 - totalGoals} to go!`;
}

function getRowClass(totalGoals: number) {
  if (totalGoals === 21) {
    return "border-t align-top bg-green-50";
  }

  if (totalGoals > 21) {
    return "border-t align-top bg-red-50";
  }

  return "border-t align-top";
}

function getStatusBadgeClass(totalGoals: number) {
  if (totalGoals === 21) {
    return "inline-flex rounded-full border border-green-200 bg-green-100 px-2 py-1 text-xs font-semibold text-green-800";
  }

  if (totalGoals > 21) {
    return "inline-flex rounded-full border border-red-200 bg-red-100 px-2 py-1 text-xs font-semibold text-red-800";
  }

  return "inline-flex rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700";
}

function sortLeaderboard(rows: GameLeaderboardRow[]) {
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

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: leaderboardData, error: leaderboardError } = await supabase
    .from("game_leaderboard")
    .select(
      "game_id, game_name, game_slug, player_id, player_name, total_goals, status"
    )
    .eq("game_slug", slug);

  if (leaderboardError) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-4">World Cup Blackjack</h1>
        <p className="text-red-600">Error loading game leaderboard.</p>
        <pre className="mt-4 overflow-x-auto bg-gray-100 p-4 rounded">
          {leaderboardError.message}
        </pre>
      </main>
    );
  }

  const leaderboard = sortLeaderboard(
    (leaderboardData ?? []) as GameLeaderboardRow[]
  );

  if (leaderboard.length === 0) {
    const { data: game } = await supabase
      .from("games")
      .select("name, slug")
      .eq("slug", slug)
      .single();

    if (!game) {
      notFound();
    }

    return (
      <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <GameNav slug={slug} activePage="leaderboard" />

          <h1 className="text-3xl sm:text-5xl font-bold mb-2">
            World Cup Blackjack
          </h1>
          <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
            {game.name}
          </p>
          <p className="mb-8 text-gray-600">
            Draw three teams. Count the goals. Finish on 21 goals to win. Two
            further teams are drawn later in the World Cup. Over 21 is bust.
          </p>

          <div className="rounded-xl border bg-white shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-2">No players yet</h2>
            <p className="text-gray-600">
              Add players to this game in the admin area.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const gameName = leaderboard[0].game_name;
  const gameSlug = leaderboard[0].game_slug;

  const { data: teamsData, error: teamsError } = await supabase
    .from("game_leaderboard_teams")
    .select(
      "player_id, player_team_id, team_id, draw_round, team_name, team_code, flag_image_url, counting_goals"
    )
    .eq("game_slug", slug);

  if (teamsError) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-4">World Cup Blackjack</h1>
        <p className="text-red-600">Error loading team details.</p>
        <pre className="mt-4 overflow-x-auto bg-gray-100 p-4 rounded">
          {teamsError.message}
        </pre>
      </main>
    );
  }

  const leaderboardTeams = (teamsData ?? []) as GameLeaderboardTeamRow[];

  const teamsByPlayer = new Map<number, GameLeaderboardTeamRow[]>();

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
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <GameNav slug={gameSlug} activePage="leaderboard" />

        <h1 className="text-3xl sm:text-5xl font-bold mb-2">
          World Cup Blackjack
        </h1>
        <p className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
          {gameName}
        </p>
        <p className="mb-8 text-gray-600">
          Draw three teams. Count the goals. Finish on 21 goals to win. Two
          further teams are drawn later in the World Cup. Over 21 is bust.
        </p>

        <div className="mb-8">
          <div className="rounded-xl border bg-white shadow-sm p-4">
            <h2 className="font-bold text-lg mb-1">🎲 Pick Teams</h2>
            <p className="text-gray-600 mb-3">
              Players can draw their own teams for this game.
            </p>
            <Link href={`/games/${gameSlug}/draw`} className="underline">
              Go to pick teams page
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-12 p-3 sm:p-4 align-top">Rank</th>
                <th className="p-3 sm:p-4 align-top">Player / Teams</th>
                <th className="w-16 p-3 sm:p-4 align-top text-right">Goals</th>
                <th className="w-24 p-3 sm:p-4 align-top text-right">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {leaderboard.map((row, index) => {
                const playerTeams = teamsByPlayer.get(row.player_id) ?? [];

                return (
                  <tr
                    id={`player-${row.player_id}`}
                    key={row.player_id}
                    className={getRowClass(row.total_goals)}
                  >
                    <td className="p-3 sm:p-4 align-top font-semibold text-gray-700">
                      {index + 1}
                    </td>

                    <td className="p-3 sm:p-4 align-top">
                      <div className="font-semibold text-gray-950">
                        {row.total_goals === 21 && (
                          <span className="mr-1" aria-label="perfect 21">
                            🏆
                          </span>
                        )}
                        {row.total_goals > 21 && (
                          <span className="mr-1" aria-label="bust">
                            💩
                          </span>
                        )}
                        {row.player_name}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
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
                              />
                              <span>({team.counting_goals})</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">
                            No teams drawn yet
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <Link
                          href={`/games/${gameSlug}/players/${row.player_id}/matches`}
                          className="inline-flex rounded-lg border bg-gray-100 px-3 py-2 text-xs font-semibold hover:bg-gray-200"
                        >
                          View matches
                        </Link>
                      </div>
                    </td>

                    <td className="p-3 sm:p-4 align-top text-right text-lg font-bold text-gray-950">
                      {row.total_goals}
                    </td>

                    <td className="p-3 sm:p-4 align-top text-right">
                      <span className={getStatusBadgeClass(row.total_goals)}>
                        {getDisplayStatus(row.total_goals)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          The number in brackets is that team&apos;s counting goals for that
          player.
        </p>
      </div>
    </main>
  );
}
