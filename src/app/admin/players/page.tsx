import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Nav from "@/components/nav";
import { supabase } from "@/lib/supabase";
import AdminNav from "@/components/AdminNav";

type PlayerRow = {
  id: number;
  name: string;
  game_name: string;
  game_slug: string;
};

type GameRow = {
  id: number;
  name: string;
  slug: string;
};

type PlayerQueryRow = {
  id: number;
  name: string;
  games:
    | {
        name: string;
        slug: string;
      }
    | {
        name: string;
        slug: string;
      }[]
    | null;
};

async function refreshPages(gameSlug?: string) {
  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/admin/players");
  revalidatePath("/admin/player-teams");

  if (gameSlug) {
    revalidatePath(`/games/${gameSlug}`);
    revalidatePath(`/games/${gameSlug}/draw`);
  }
}

async function addPlayer(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim();
  const gameId = Number(formData.get("game_id"));

  if (!name) {
    redirect("/admin/players?error=Player name is missing");
  }

  if (!gameId) {
    redirect("/admin/players?error=Choose a game first");
  }

  const { data: gameData } = await supabase
    .from("games")
    .select("slug")
    .eq("id", gameId)
    .single();

  const { error } = await supabase.from("players").insert({
    name,
    game_id: gameId,
    is_paid: true,
  });

  if (error) {
    redirect(`/admin/players?error=${encodeURIComponent(error.message)}`);
  }

  await refreshPages(gameData?.slug);

  redirect(`/admin/players?message=${encodeURIComponent(`${name} added`)}`);
}

async function deletePlayer(formData: FormData) {
  "use server";

  const playerId = Number(formData.get("player_id"));
  const gameSlug = formData.get("game_slug")?.toString();

  if (!playerId) {
    redirect("/admin/players?error=Missing player ID");
  }

  const { error } = await supabase.from("players").delete().eq("id", playerId);

  if (error) {
    redirect(`/admin/players?error=${encodeURIComponent(error.message)}`);
  }

  await refreshPages(gameSlug);

  redirect("/admin/players?message=Player deleted");
}

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;

  const { data: gamesData, error: gamesError } = await supabase
    .from("games")
    .select("id, name, slug")
    .order("name", { ascending: true });

  const { data: playersData, error: playersError } = await supabase
    .from("players")
    .select(
      `
      id,
      name,
      games(name, slug)
    `
    )
    .order("name", { ascending: true });

  const games = (gamesData ?? []) as GameRow[];

  const players = ((playersData ?? []) as PlayerQueryRow[]).map((row) => {
    const game = Array.isArray(row.games) ? row.games[0] : row.games;

    return {
      id: row.id,
      name: row.name,
      game_name: game?.name ?? "Unknown game",
      game_slug: game?.slug ?? "",
    };
  }) as PlayerRow[];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <Nav activePage="admin" />
        <AdminNav activePage="players" />

        <h1 className="text-4xl font-bold mb-2">Admin: Players</h1>
        <p className="mb-8 text-gray-600">
          Add or delete people playing World Cup Blackjack. Each player belongs
          to one game.
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

        {gamesError && (
          <div className="mb-6 rounded-xl border bg-red-50 p-4 font-semibold">
            Error loading games: {gamesError.message}
          </div>
        )}

        {playersError && (
          <div className="mb-6 rounded-xl border bg-red-50 p-4 font-semibold">
            Error loading players: {playersError.message}
          </div>
        )}

        <form
          action={addPlayer}
          className="mb-10 rounded-xl border bg-white shadow-sm p-6 grid gap-4"
        >
          <label className="grid gap-2">
            <span className="font-semibold">Player name</span>
            <input
              name="name"
              required
              className="border rounded-lg p-3"
              placeholder="e.g. Liam"
            />
          </label>

          <label className="grid gap-2">
            <span className="font-semibold">Game</span>
            <select
              name="game_id"
              required
              className="border rounded-lg p-3 bg-white"
            >
              <option value="">Choose game</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="rounded-lg border px-4 py-3 font-semibold bg-gray-100 hover:bg-gray-200"
          >
            Add player
          </button>
        </form>

        <h2 className="text-2xl font-bold mb-4">Current players</h2>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Player</th>
                <th className="p-4">Game</th>
                <th className="p-4">Game link</th>
                <th className="p-4">Delete</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-t">
                  <td className="p-4 font-semibold">{player.name}</td>

                  <td className="p-4">{player.game_name}</td>

                  <td className="p-4">
                    {player.game_slug ? (
                      <a
                        href={`/games/${player.game_slug}`}
                        className="underline"
                      >
                        /games/{player.game_slug}
                      </a>
                    ) : (
                      <span className="text-gray-500">No link</span>
                    )}
                  </td>

                  <td className="p-4">
                    <form action={deletePlayer}>
                      <input type="hidden" name="player_id" value={player.id} />
                      <input
                        type="hidden"
                        name="game_slug"
                        value={player.game_slug}
                      />
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

              {players.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={4}>
                    No players yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Careful: deleting a player also deletes their assigned teams.
        </p>
      </div>
    </main>
  );
}
