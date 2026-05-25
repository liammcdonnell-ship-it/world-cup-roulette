import { revalidatePath } from "next/cache";
import Nav from "@/components/nav";
import { supabase } from "@/lib/supabase";
import AdminNav from "@/components/AdminNav";

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
};

async function refreshPages() {
  revalidatePath("/");
  revalidatePath("/team-totals");
  revalidatePath("/matches");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/matches");
}

async function addTeam(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim();
  const code = formData.get("code")?.toString().trim().toUpperCase();

  if (!name) {
    return;
  }

  await supabase.from("teams").insert({
    name,
    code: code || null,
  });

  await refreshPages();
}

async function deleteTeam(formData: FormData) {
  "use server";

  const teamId = Number(formData.get("team_id"));

  await supabase.from("teams").delete().eq("id", teamId);

  await refreshPages();
}

export default async function AdminTeamsPage() {
  const { data } = await supabase
    .from("teams")
    .select("id, name, code")
    .order("name", { ascending: true });

  const teams = (data ?? []) as TeamRow[];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <Nav activePage="admin" />
        <AdminNav activePage="teams" />

        <h1 className="text-4xl font-bold mb-2">Admin: Teams</h1>
        <p className="mb-8 text-gray-600">
          Add or delete World Cup teams.
        </p>

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
              placeholder="e.g. England"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-semibold">Team code</span>
            <input
              name="code"
              maxLength={3}
              className="border rounded-lg p-3"
              placeholder="e.g. ENG"
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

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Team</th>
                <th className="p-4">Code</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-t">
                  <td className="p-4 font-semibold">{team.name}</td>
                  <td className="p-4 text-gray-600">{team.code}</td>
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
                  <td className="p-4 text-gray-600" colSpan={3}>
                    No teams yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Careful: deleting a team can also remove match and player-team data connected to that team.
        </p>
      </div>
    </main>
  );
}