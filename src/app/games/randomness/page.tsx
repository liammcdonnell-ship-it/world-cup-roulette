import Link from "next/link";
import Nav from "@/components/nav";
import TeamLink from "@/components/TeamLink";
import { supabase } from "@/lib/supabase";
import { getTeamEliminationMap } from "@/lib/teamStatus";

export const dynamic = "force-dynamic";

type DrawRow = {
  team_id: number;
  game_slug: string;
  team_name: string;
  team_code: string | null;
  flag_image_url: string | null;
  draw_round: string | null;
};

type TeamStats = {
  team_id: number;
  team_name: string;
  team_code: string | null;
  flag_image_url: string | null;
  total: number;
  games: Set<string>;
  groupStage: number;
  roundOf32: number;
  quarterFinals: number;
  other: number;
};

function getRoundLabel(drawRound: string | null) {
  if (drawRound === "initial") return "Group Stage";
  if (drawRound === "second") return "Round of 32";
  if (drawRound === "third") return "Quarter Finals";
  return "Other";
}

export default async function RandomnessPage() {
  const { data, error } = await supabase
    .from("game_leaderboard_teams")
    .select("team_id, game_slug, team_name, team_code, flag_image_url, draw_round")
    .order("team_name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <Nav activePage="games" />

          <h1 className="text-3xl sm:text-5xl font-bold mb-4">
            How random is it?
          </h1>

          <div className="rounded-xl border bg-white shadow-sm p-6">
            <p className="text-red-600 font-semibold">
              Error loading draw data.
            </p>
            <pre className="mt-4 overflow-x-auto bg-gray-100 p-4 rounded text-sm">
              {error.message}
            </pre>
          </div>
        </div>
      </main>
    );
  }

  const draws = (data ?? []) as DrawRow[];
  const teamEliminatedById = await getTeamEliminationMap();

  const statsByTeam = new Map<string, TeamStats>();

  for (const draw of draws) {
    const existing = statsByTeam.get(draw.team_name);

    const stats =
      existing ??
      ({
        team_id: draw.team_id,
        team_name: draw.team_name,
        team_code: draw.team_code,
        flag_image_url: draw.flag_image_url,
        total: 0,
        games: new Set<string>(),
        groupStage: 0,
        roundOf32: 0,
        quarterFinals: 0,
        other: 0,
      } satisfies TeamStats);

    stats.total += 1;
    stats.games.add(draw.game_slug);

    if (draw.draw_round === "initial") {
      stats.groupStage += 1;
    } else if (draw.draw_round === "second") {
      stats.roundOf32 += 1;
    } else if (draw.draw_round === "third") {
      stats.quarterFinals += 1;
    } else {
      stats.other += 1;
    }

    statsByTeam.set(draw.team_name, stats);
  }

  const teamStats = Array.from(statsByTeam.values()).sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }

    return a.team_name.localeCompare(b.team_name);
  });

  const totalDraws = draws.length;
  const uniqueTeams = teamStats.length;
  const mostPickedCount = teamStats[0]?.total ?? 0;
  const mostPickedTeams = teamStats.filter(
    (team) => team.total === mostPickedCount
  );

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <Nav activePage="games" />

        <div className="mb-8">
          <Link href="/games" className="text-sm underline text-gray-600">
            ← Back to games
          </Link>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold mb-2">
          How random is it?
        </h1>

        <p className="mb-8 text-gray-600">
          This page counts every team picked across all games and shows how
          often each team has appeared.
        </p>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white shadow-sm p-4">
            <h2 className="font-bold text-lg mb-1">🎲 Total picks</h2>
            <p className="text-3xl font-bold">{totalDraws}</p>
          </div>

          <div className="rounded-xl border bg-white shadow-sm p-4">
            <h2 className="font-bold text-lg mb-1">🌍 Different teams</h2>
            <p className="text-3xl font-bold">{uniqueTeams}</p>
          </div>

          <div className="rounded-xl border bg-white shadow-sm p-4">
            <h2 className="font-bold text-lg mb-1">🔥 Most picked</h2>
            <p className="text-3xl font-bold">{mostPickedCount}</p>
            {mostPickedTeams.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {mostPickedTeams.map((team, index) => (
                  <span key={team.team_id}>
                    {index > 0 ? ", " : ""}
                    <Link href={`/teams/${team.team_id}`} className="underline">
                      {team.team_name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        <div className="mb-8 rounded-xl border bg-white shadow-sm p-4 sm:p-6">
          <h2 className="text-2xl font-bold mb-2">What this means</h2>
          <p className="text-gray-600">
            Random does not mean every team will appear the same number of
            times, especially with a small number of players. This table is just
            a quick way to spot which teams have come up most often across the
            games so far.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 sm:p-4">Team</th>
                <th className="p-3 sm:p-4 text-right">Total picks</th>
                <th className="p-3 sm:p-4 text-right">Games appeared in</th>
                <th className="p-3 sm:p-4 text-right">Group Stage</th>
                <th className="p-3 sm:p-4 text-right">Round of 32</th>
                <th className="p-3 sm:p-4 text-right">Quarter Finals</th>
              </tr>
            </thead>

            <tbody>
              {teamStats.map((team) => (
                <tr key={team.team_name} className="border-t">
                  <td className="p-3 sm:p-4 font-semibold">
                    <TeamLink
                      teamId={team.team_id}
                      name={team.team_name}
                      code={team.team_code}
                      flagUrl={team.flag_image_url}
                      isEliminated={teamEliminatedById.get(team.team_id) ?? false}
                    />
                  </td>

                  <td className="p-3 sm:p-4 text-right font-bold">
                    {team.total}
                  </td>

                  <td className="p-3 sm:p-4 text-right">
                    {team.games.size}
                  </td>

                  <td className="p-3 sm:p-4 text-right">
                    {team.groupStage}
                  </td>

                  <td className="p-3 sm:p-4 text-right">
                    {team.roundOf32}
                  </td>

                  <td className="p-3 sm:p-4 text-right">
                    {team.quarterFinals}
                  </td>
                </tr>
              ))}

              {teamStats.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={6}>
                    No teams have been picked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Round labels are based on the saved draw round:{" "}
          {getRoundLabel("initial")}, {getRoundLabel("second")} and{" "}
          {getRoundLabel("third")}.
        </p>
      </div>
    </main>
  );
}
