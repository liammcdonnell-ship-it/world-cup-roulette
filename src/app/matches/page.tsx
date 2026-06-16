import { supabase } from "@/lib/supabase";
import Nav from "@/components/nav";
import TeamLink from "@/components/TeamLink";
import { getTeamEliminationMap } from "@/lib/teamStatus";

type MatchDisplayRow = {
  id: number;
  home_team_id: number;
  home_team_name: string;
  home_team_code: string | null;
  home_flag_image_url: string | null;
  away_team_id: number;
  away_team_name: string;
  away_team_code: string | null;
  away_flag_image_url: string | null;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
  kickoff_time: string | null;
};

export default async function MatchesPage() {
  const { data, error } = await supabase
    .from("matches_display")
    .select(
      "id, home_team_id, home_team_name, home_team_code, home_flag_image_url, away_team_id, away_team_name, away_team_code, away_flag_image_url, home_goals, away_goals, status, kickoff_time"
    );

  if (error) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-4">Matches</h1>
        <p className="text-red-600">Error loading matches.</p>
        <pre className="mt-4 overflow-x-auto bg-gray-100 p-4 rounded">
          {error.message}
        </pre>
      </main>
    );
  }

  const matches = (data ?? []) as MatchDisplayRow[];
  const teamEliminatedById = await getTeamEliminationMap();

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <Nav activePage="matches" />

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Matches</h1>
        <p className="mb-8 text-gray-600">
          These scores feed the leaderboards. Only finished matches count.
        </p>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Match</th>
                <th className="p-4">Score</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-t">
                  <td className="p-4 font-semibold">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <TeamLink
                        teamId={match.home_team_id}
                        name={match.home_team_name}
                        code={match.home_team_code}
                        flagUrl={match.home_flag_image_url}
                        isEliminated={
                          teamEliminatedById.get(match.home_team_id) ?? false
                        }
                      />

                      <span className="text-gray-500">v</span>

                      <TeamLink
                        teamId={match.away_team_id}
                        name={match.away_team_name}
                        code={match.away_team_code}
                        flagUrl={match.away_flag_image_url}
                        isEliminated={
                          teamEliminatedById.get(match.away_team_id) ?? false
                        }
                      />
                    </span>
                  </td>

                  <td className="p-4">
                    {match.home_goals ?? "-"} - {match.away_goals ?? "-"}
                  </td>

                  <td className="p-4 text-gray-600">{match.status}</td>
                </tr>
              ))}

              {matches.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={3}>
                    No matches yet.
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
