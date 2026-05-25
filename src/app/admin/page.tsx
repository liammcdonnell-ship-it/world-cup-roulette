import { revalidatePath } from "next/cache";
import Nav from "@/components/nav";
import AdminNav from "@/components/AdminNav";
import { supabase } from "@/lib/supabase";

type GameRow = {
  id: number;
  name: string;
  slug: string;
};

function makeSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function refreshPages() {
  revalidatePath("/admin/games");
  revalidatePath("/games");
}

async function addGame(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim();

  if (!name) {
    return;
  }

  const slug = makeSlug(name);

  if (!slug) {
    return;
  }

  await supabase.from("games").insert({
    name,
    slug,
  });

  await refreshPages();
}

async function deleteGame(formData: FormData) {
  "use server";

  const gameId = Number(formData.get("game_id"));

  await supabase.from("games").delete().eq("id", gameId);

  await refreshPages();
}

export default async function AdminGamesPage() {
  const { data, error } = await supabase
    .from("games")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-4">Admin: Games</h1>
        <p className="text-red-600">Error loading games.</p>
        <pre className="mt-4 bg-gray-100 p-4 rounded">{error.message}</pre>
      </main>
    );
  }

  const games = (data ?? []) as GameRow[];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Nav activePage="admin" />
        <AdminNav activePage="games" />

        <h1 className="text-4xl font-bold mb-2">Admin: Games</h1>
        <p className="mb-8 text-gray-600">
          Create separate World Cup Roulette games for different groups.
        </p>

        <form
          action={addGame}
          className="mb-10 rounded-xl border bg-white shadow-sm p-6 grid gap-4"
        >
          <label className="grid gap-2">
            <span className="font-semibold">Game name</span>
            <input
              name="name"
              required
              className="border rounded-lg p-3"
              placeholder="e.g. Family, Football Lads, Fringe Mates"
            />
          </label>

          <button
            type="submit"
            className="rounded-lg border px-4 py-3 font-semibold bg-gray-100 hover:bg-gray-200"
          >
            Add game
          </button>
        </form>

        <h2 className="text-2xl font-bold mb-4">Current games</h2>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Game</th>
                <th className="p-4">Games</th>
                <th className="p-4">Draw</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id} className="border-t">
                  <td className="p-4 font-semibold">{game.name}</td>
                  <td className="p-4">
                    <a href={`/games/${game.slug}`} className="underline">
                      /games/{game.slug}
                    </a>
                  </td>
                  <td className="p-4">
                    <a
                      href={`/games/${game.slug}/draw`}
                      className="underline"
                    >
                      /games/{game.slug}/draw
                    </a>
                  </td>
                  <td className="p-4 text-gray-600">{game.slug}</td>
                  <td className="p-4">
                    <form action={deleteGame}>
                      <input type="hidden" name="game_id" value={game.id} />
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

              {games.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={5}>
                    No games yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Careful: deleting a game also deletes its players, and their team
          assignments.
        </p>
      </div>
    </main>
  );
}