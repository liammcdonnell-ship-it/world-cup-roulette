import Link from "next/link";
import { notFound } from "next/navigation";
import GameNav from "@/components/GameNav";
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
    return "🏆 Perfect";
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
        <h1 className="text-3xl font-bold mb-4">World Cup Roulette</h1>
        <p className="text-red-600">Error loading game leaderboard.</p>
        <pre className="mt-4 overflow-x-auto bg-gray-100 p-4 rounded">
          {leaderboardError.message}
        </pre>
      </main>
    );
  }

  const leaderboard = (leaderboardData ?? []) as GameLeaderboardRow[];

  if (leaderboard.length === 0) {
    notFound();
  }

  const gameName = leaderboard[0].game_name;

  const { data: teamsData, error: teamsError } = await supabase
    .from("game_leaderboard_teams")
    .select(
      "player_id, player_team_id, draw_round, team_name, team_code, flag_image_url, counting_goals"
    )
    .eq("game_slug", slug);

  if (teamsError) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-4">World Cup Roulette</h1>
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
        <GameNav slug={slug} activePage="leaderboard" />

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{gameName}</h1>
        <p className="mb-8 text-gray-600">
          Exact 21 wins. Closest under 21 is next best. Over 21 is bust.
        </p>

        <div className="mb-8 rounded-xl border bg-white shadow-sm p-4">
          <p className="font-semibold">Game leaderboard</p>
          <p className="text-gray-600">
            Track each player&apos;s collected teams and current score.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Player</th>
                <th className="p-4">Goals</th>
                <th className="p-4">Status</th>
                <th className="p-4">Teams</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, index) => {
                const playerTeams = teamsByPlayer.get(row.player_id) ?? [];

                return (
                  <tr key={row.player_id} className={getRowClass(row.total_goals)}>
                    <td className="p-4">{index + 1}</td>

                    <td className="p-4 font-semibold">
                      {row.total_goals === 21 && (
                        <span className="mr-2" aria-label="winner">
                          🏆
                        </span>
                      )}
                      {row.total_goals > 21 && (
                        <span className="mr-2" aria-label="bust">
                          💩
                        </span>
                      )}
                      {row.player_name}
                    </td>

                    <td className="p-4 font-semibold">{row.total_goals}</td>

                    <td className="p-4 font-semibold">
                      {getDisplayStatus(row.total_goals)}
                    </td>

                    <td className="p-4">
                      <div className="grid gap-3">
                        {playerTeams.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {playerTeams.map((team) => (
                              <span
                                key={team.player_team_id}
                                className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm"
                              >
                                {team.flag_image_url && (
                                  <img
                                    src={team.flag_image_url}
                                    alt={`${team.team_name} flag`}
                                    className="h-4 w-6 rounded-sm object-cover"
                                  />
                                )}
                                <span>
                                  {team.team_name} ({team.counting_goals})
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500">No teams yet</span>
                        )}

                        <div>
                          <Link
                            href={`/games/${slug}/players/${row.player_id}/matches`}
                            className="inline-flex rounded-lg border bg-gray-100 px-3 py-2 text-sm font-semibold hover:bg-gray-200"
                          >
                            View matches
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          The number in brackets is that team&apos;s counting goals for that
          player. Later-round teams only count goals scored after that pick round
          opens.
        </p>
      </div>
    </main>
  );
}