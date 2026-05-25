import { revalidatePath } from "next/cache";
import Nav from "@/components/nav";
import { supabase } from "@/lib/supabase";
import AdminNav from "@/components/AdminNav";

type TeamRow = {
  team_id: number;
  team_name: string;
  code: string | null;
  total_goals: number;
};

type MatchDisplayRow = {
  id: number;
  home_team_name: string;
  away_team_name: string;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
};

async function refreshPages() {
  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath("/team-totals");
  revalidatePath("/admin/matches");
}

async function addMatch(formData: FormData) {
  "use server";

  const homeTeamId = Number(formData.get("home_team_id"));
  const awayTeamId = Number(formData.get("away_team_id"));
  const homeGoalsRaw = formData.get("home_goals")?.toString();
  const awayGoalsRaw = formData.get("away_goals")?.toString();
  const status = formData.get("status")?.toString() || "scheduled";

  const homeGoals = homeGoalsRaw === "" ? null : Number(homeGoalsRaw);
  const awayGoals = awayGoalsRaw === "" ? null : Number(awayGoalsRaw);

  await supabase.from("matches").insert({
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_goals: homeGoals,
    away_goals: awayGoals,
    status,
  });

  await refreshPages();
}

async function deleteMatch(formData: FormData) {
  "use server";

  const matchId = Number(formData.get("match_id"));

  await supabase.from("matches").delete().eq("id", matchId);

  await refreshPages();
}

export default async function AdminMatchesPage() {
  const { data: teamsData } = await supabase
    .from("team_totals")
    .select("team_id, team_name, code, total_goals")
    .order("team_name", { ascending: true });

  const { data: matchesData } = await supabase
    .from("matches_display")
    .select("id, home_team_name, away_team_name, home_goals, away_goals, status");

  const teams = (teamsData ?? []) as TeamRow[];
  const matches = (matchesData ?? []) as MatchDisplayRow[];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
       <Nav activePage="admin" />
<AdminNav activePage="matches" />

        <h1 className="text-4xl font-bold mb-2">Admin: Matches</h1>
        <p className="mb-8 text-gray-600">
          Add or delete match scores here. Finished matches feed the leaderboard.
        </p>

        <form
          action={addMatch}
          className="mb-10 rounded-xl border bg-white shadow-sm p-6 grid gap-4"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <label className="grid gap-2">
              <span className="font-semibold">Home team</span>
              <select
                name="home_team_id"
                required
                className="border rounded-lg p-3 bg-white"
              >
                <option value="">Choose home team</option>
                {teams.map((team) => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.team_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-semibold">Away team</span>
              <select
                name="away_team_id"
                required
                className="border rounded-lg p-3 bg-white"
              >
                <option value="">Choose away team</option>
                {teams.map((team) => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.team_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="grid gap-2">
              <span className="font-semibold">Home goals</span>
              <input
                name="home_goals"
                type="number"
                min="0"
                className="border rounded-lg p-3"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-semibold">Away goals</span>
              <input
                name="away_goals"
                type="number"
                min="0"
                className="border rounded-lg p-3"
                placeholder="0"
              />
            </label>

            <label className="grid gap-2">
              <span className="font-semibold">Status</span>
              <select
                name="status"
                required
                defaultValue="finished"
                className="border rounded-lg p-3 bg-white"
              >
                <option value="scheduled">scheduled</option>
                <option value="live">live</option>
                <option value="finished">finished</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="rounded-lg border px-4 py-3 font-semibold bg-gray-100 hover:bg-gray-200"
          >
            Save match
          </button>
        </form>

        <h2 className="text-2xl font-bold mb-4">Current matches</h2>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Match</th>
                <th className="p-4">Score</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-t">
                  <td className="p-4 font-semibold">
                    {match.home_team_name} v {match.away_team_name}
                  </td>
                  <td className="p-4">
                    {match.home_goals ?? "-"} - {match.away_goals ?? "-"}
                  </td>
                  <td className="p-4 text-gray-600">{match.status}</td>
                  <td className="p-4">
                    <form action={deleteMatch}>
                      <input type="hidden" name="match_id" value={match.id} />
                      <button
                        type="submit"
                        className="rounded-lg border px-3 py-2 text-sm font-semibold bg-red-50 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Careful: delete happens immediately. We can add a confirmation step later.
        </p>
      </div>
    </main>
  );
}