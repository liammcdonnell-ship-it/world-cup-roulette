import Link from "next/link";
import { supabase } from "@/lib/supabase";

type GameRow = {
  id: number;
  name: string;
  slug: string;
};

export default async function AdminGameLinks() {
  const { data, error } = await supabase
    .from("games")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    return null;
  }

  const games = (data ?? []) as GameRow[];

  if (games.length === 0) {
    return null;
  }

  return (
    <nav className="mb-8 rounded-xl border bg-white p-4 shadow-sm">
      <p className="mb-3 font-semibold">Game groups</p>

      <div className="flex flex-wrap gap-4">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/games/${game.slug}`}
            className="underline"
          >
            {game.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}