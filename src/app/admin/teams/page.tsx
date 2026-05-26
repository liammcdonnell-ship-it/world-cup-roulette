import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Nav from "@/components/nav";
import AdminNav from "@/components/AdminNav";
import AdminGameLinks from "@/components/AdminGameLinks";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
  is_eliminated: boolean;
};

async function refreshPages() {
  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/team-totals");
  revalidatePath("/matches");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/player-teams");
}

async function addTeam(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim();
  const code = formData.get("code")?.toString().trim().toUpperCase();

  if (!name) {
    redirect("/admin/teams?error=Team name is missing");
  }

  const { error } = await supabaseAdmin.from("teams").insert({
    name,
    code: code || null,
    is_eliminated: false,
  });

  if (error) {
    redirect(`/admin/teams?error=${encodeURIComponent(error.message)}`);
  }

  await refreshPages();

  redirect(`/admin/teams?message=${encodeURIComponent(`${name} added`)}`);
}

async function toggleEliminated(formData: FormData) {
  "use server";

  const teamId = Number(formData.get("team_id"));
  const nextIsEliminated = formData.get("next_is_eliminated") === "true";

  if (!teamId) {
    redirect("/admin/teams?error=Missing team ID");
  }

  const { error } = await supabaseAdmin
    .from("teams")
    .update({ is_eliminated: nextIsEliminated })
    .eq("id", teamId);

  if (error) {
    redirect(`/admin/teams?error=${encodeURIComponent(error.message)}`);
  }

  await refreshPages();

  redirect(
    `/admin/teams?message=${encodeURIComponent(
      nextIsEliminated ? "Team marked eliminated" : "Team marked active"
    )}`
  );
}

async function deleteTeam(formData: FormData) {
  "use server";

  const teamId = Number(formData.get("team_id"));

  if (!teamId) {
    redirect("/admin/teams?error=Missing team ID");
  }

  const { error } = await supabaseAdmin
    .from("teams")
    .delete()
    .eq("id", teamId);

  if (error) {
    redirect(`/admin/teams?error=${encodeURIComponent(error.message)}`);
  }

  await refreshPages();

  redirect("/admin/teams?message=Team deleted");
}

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, code, is_eliminated")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-4">Admin: Teams</h1>
        <p className="text-red-600">Error loading teams.</p>
        <pre className="mt-4 bg-gray-100 p-4 rounded">{error.message}</pre>
      </main>
    );
  }

  const teams = (data ?? []) as TeamRow[];
  const activeTeams = teams.filter((team) => !team.is_eliminated);
  const eliminatedTeams = teams.filter((team) => team.is_eliminated);

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <Nav activePage="admin" />
        <AdminNav activePage="teams" />
        <AdminGameLinks />

        <h1 className="text-4xl font-bold mb-2">Admin: Teams</h1>
        <p className="mb-8 text-gray-600">
          Add teams and mark teams as eliminated. Eliminated teams cannot be
          picked in Round of 32 or Quarter Finals draws.
        </p>

        {params?.message && (
          <div className="mb-6 rounded-xl border bg-green-50 p-4 font-semibold">
            {params.message}
          </div>
        )}

        {params?.error && (
          <div className="mb-6 rounded-xl border bg-red-50 p-4 font-semibold">
            {params.error}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-white shadow-sm p-4">
            <h2 className="font-bold text-lg mb-1">✅ Active teams</h2>
            <p className="text-3xl font-bold">{activeTeams.length}</p>
            <p className="text-sm text-gray-600">
              Available for later-round picks.
            </p>
          </div>

          <div className="rounded-xl border bg-white shadow-sm p-4">
            <h2 className="font-bold text-lg mb-1">❌ Eliminated teams</h2>
            <p className="text-3xl font-bold">{eliminatedTeams.length}</p>
            <p className="text-sm text-gray-600">
              Blocked from Round of 32 and Quarter Finals picks.
            </p>
          </div>
        </div>

        <form
          action={addTeam}
          className="mb-10 rounded-xl border bg-white shadow-sm p-6 grid gap-4"
        >
          <label className="grid gap-2">
            <span className="font-semibold">Team name</span>
            <input
              name="name"
              required
              className="border rounded-lg p-3"
              placeholder="e.g. Brazil"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-semibold">Code</span>
            <input
              name="code"
              className="border rounded-lg p-3"
              placeholder="e.g. BRA"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg border px-4 py-3 font-semibold bg-gray-100 hover:bg-gray-200"
          >
            Add team
          </button>
        </form>

        <h2 className="text-2xl font-bold mb-4">Current teams</h2>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Team</th>
                <th className="p-4">Code</th>
                <th className="p-4">Status</th>
                <th className="p-4">Elimination</th>
                <th className="p-4">Delete</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className={team.is_eliminated ? "border-t bg-red-50" : "border-t"}
                >
                  <td className="p-4 font-semibold">{team.name}</td>
                  <td className="p-4 text-gray-600">{team.code}</td>
                  <td className="p-4">
                    {team.is_eliminated ? (
                      <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                        Eliminated
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-green-200 bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <form action={toggleEliminated}>
                      <input type="hidden" name="team_id" value={team.id} />
                      <input
                        type="hidden"
                        name="next_is_eliminated"
                        value={team.is_eliminated ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border px-3 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200"
                      >
                        {team.is_eliminated
                          ? "Mark active"
                          : "Mark eliminated"}
                      </button>
                    </form>
                  </td>
                  <td className="p-4">
                    <form action={deleteTeam}>
                      <input type="hidden" name="team_id" value={team.id} />
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

              {teams.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={5}>
                    No teams yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Group Stage picks can still use all teams. Round of 32 and Quarter
          Finals picks only use active teams.
        </p>
      </div>
    </main>
  );
}
