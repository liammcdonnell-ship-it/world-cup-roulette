import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Nav from "@/components/nav";
import AdminNav from "@/components/AdminNav";
import AdminGameLinks from "@/components/AdminGameLinks";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncScoresFromFootballData } from "@/lib/syncScores";

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
};

type MatchRow = {
  id: number;
  home_team_name: string;
  home_team_code: string | null;
  away_team_name: string;
  away_team_code: string | null;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
};

async function refreshPages() {
  revalidatePath("/");
  revalidatePath("/games");
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
  const status = formData.get("status")?.toString() || "finished";

  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    return;
  }

  const homeGoals =
    homeGoalsRaw === undefined || homeGoalsRaw === ""
      ? null
      : Number(homeGoalsRaw);

  const awayGoals =
    awayGoalsRaw === undefined || awayGoalsRaw === ""
      ? null
      : Number(awayGoalsRaw);

  await supabaseAdmin.from("matches").insert({
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    home_goals: homeGoals,
    away_goals: awayGoals,
    status,
    source: "manual",
  });

  await refreshPages();

  redirect("/admin/matches?message=Manual match added");
}

async function deleteMatch(formData: FormData) {
  "use server";

  const matchId = Number(formData.get("match_id"));

  await supabaseAdmin.from("matches").delete().eq("id", matchId);

  await refreshPages();

  redirect("/admin/matches?message=Match deleted");
}

async function syncScoresNow() {
  "use server";

  const result = await syncScoresFromFootballData();

  await refreshPages();

  if (!result.ok) {
    const errorMessage =
      "error" in result && result.error
        ? result.error.toString()
        : "Score sync failed";

    redirect(`/admin/matches?error=${encodeURIComponent(errorMessage)}`);
  }

  const syncedCount =
    "synced_count" in result ? result.synced_count : 0;

  const skippedCount =
    "skipped_count" in result ? result.skipped_count : 0;

  const matchCount =
    "match_count_from_api" in result ? result.match_count_from_api : 0;

  redirect(
    `/admin/matches?message=${encodeURIComponent(
      `Sync complete: ${syncedCount} synced, ${skippedCount} skipped from ${matchCount} API matches.`
    )}`
  );
}

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
}) {
  const query = await searchParams;

  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, code")
    .order("name", { ascending: true });

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches_display")
    .select(
      "id, home_team_name, home_team_code, away_team_name, away_team_code, home_goals, away_goals, status"
    );

  if (teamsError || matchesError) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-4">Admin: Matches</h1>
        <p className="text-red-600">Error loading matches admin.</p>
        <pre className="mt-4 bg-gray-100 p-4 rounded">
          {teamsError?.message ?? matchesError?.message}
        </pre>
      </main>
    );
  }

  const teams = (teamsData ?? []) as TeamRow[];
  const matches = (matchesData ?? []) as MatchRow[];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <Nav activePage="admin" />
        <AdminNav activePage="matches" />
        <AdminGameLinks />

        <h1 className="text-4xl font-bold mb-2">Admin: Matches</h1>
        <p className="mb-8 text-gray-600">
          Add or delete match scores. Finished matches feed the leaderboards.
        </p>

        {query?.message && (
          <div className="mb-6 rounded-xl border bg-green-50 p-4 font-semibold text-green-900">
            {query.message}
          </div>
        )}

        {query?.error && (
          <div className="mb-6 rounded-xl border bg-red-50 p-4 font-semibold text-red-900">
            {query.error}
          </div>
        )}

        <form
          action={syncScoresNow}
          className="mb-10 rounded-xl border bg-white shadow-sm p-6"
        >
          <h2 className="text-2xl font-bold mb-2">Automatic scoring</h2>
          <p className="mb-4 text-gray-600">
            Pull the latest World Cup fixtures and scores from football-data.org.
            The daily Vercel cron also runs this automatically.
          </p>

          <button
            type="submit"
            className="rounded-lg border px-4 py-3 font-semibold bg-green-50 hover:bg-green-100"
          >
            Sync scores now
          </button>
        </form>

        <form
          action={addMatch}
          className="mb-10 rounded-xl border bg-white shadow-sm p-6 grid gap-4"
        >
          <h2 className="text-2xl font-bold">Manual match entry</h2>

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
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.code ? ` (${team.code})` : ""}
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
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.code ? ` (${team.code})` : ""}
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
            Add match
          </button>
        </form>

        <h2 className="text-2xl font-bold mb-4">Current matches</h2>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left">
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
                    {match.home_team_name}
                    {match.home_team_code
                      ? ` (${match.home_team_code})`
                      : ""}{" "}
                    v {match.away_team_name}
                    {match.away_team_code
                      ? ` (${match.away_team_code})`
                      : ""}
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

              {matches.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={4}>
                    No matches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Only matches marked as finished count towards team and player totals.
        </p>
      </div>
    </main>
  );
}