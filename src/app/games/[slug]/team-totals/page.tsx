import { notFound } from "next/navigation";
import GameNav from "@/components/GameNav";
import TeamLink from "@/components/TeamLink";
import { supabase } from "@/lib/supabase";
import { getTeamEliminationMap } from "@/lib/teamStatus";
import {
  countPlayedMatchesForTeam,
  formatGoalsInGames,
  type TeamMatchRow,
} from "@/lib/teamGames";

type GameRow = {
  id: number;
  name: string;
  slug: string;
};

type TeamTotalRow = {
  team_id: number;
  team_name: string;
  code: string | null;
  flag_image_url: string | null;
  total_goals: number;
};

export default async function GameTeamTotalsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: gameData } = await supabase
    .from("games")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!gameData) {
    notFound();
  }

  const game = gameData as GameRow;

  const { data, error } = await supabase
    .from("team_totals")
    .select("team_id, team_name, code, flag_image_url, total_goals");

  if (error) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-4">Team Totals</h1>
        <p className="text-red-600">Error loading team totals.</p>
        <pre className="mt-4 overflow-x-auto bg-gray-100 p-4 rounded">
          {error.message}
        </pre>
      </main>
    );
  }

  const teams = (data ?? []) as TeamTotalRow[];
  const teamEliminatedById = await getTeamEliminationMap();
  const { data: matchesData } = await supabase
    .from("matches_display")
    .select("home_team_id, away_team_id, status, kickoff_time");
  const matches = (matchesData ?? []) as TeamMatchRow[];

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <GameNav slug={slug} activePage="team-totals" />

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Team Totals</h1>
        <p className="mb-2 text-gray-600">
          Game: <span className="font-semibold">{game.name}</span>
        </p>
        <p className="mb-8 text-gray-600">
          Goals counted from finished matches only.
        </p>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Team</th>
                <th className="p-4">Code</th>
                <th className="p-4">Goals</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.team_id} className="border-t">
                  <td className="p-4 font-semibold">
                    <TeamLink
                      teamId={team.team_id}
                      name={team.team_name}
                      code={team.code}
                      flagUrl={team.flag_image_url}
                      showCode={false}
                      isEliminated={teamEliminatedById.get(team.team_id) ?? false}
                    />
                  </td>
                  <td className="p-4 text-gray-600">{team.code}</td>
                  <td className="p-4">
                    {formatGoalsInGames(
                      team.total_goals,
                      countPlayedMatchesForTeam(matches, team.team_id)
                    )}
                  </td>
                </tr>
              ))}

              {teams.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={3}>
                    No team totals yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          On smaller screens, swipe the table sideways to see all columns.
        </p>
      </div>
    </main>
  );
}
