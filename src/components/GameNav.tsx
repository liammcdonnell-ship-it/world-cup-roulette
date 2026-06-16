import Link from "next/link";
import { supabase } from "@/lib/supabase";

type GameNavProps = {
  slug: string;
  activePage: "leaderboard" | "draw" | "rules" | "matches" | "team-totals";
};

type GameRow = {
  id: number;
  name: string;
  slug: string;
};

export default async function GameNav({ slug, activePage }: GameNavProps) {
  const linkClass = (page: GameNavProps["activePage"]) =>
    page === activePage ? "font-semibold underline" : "underline";

  const { data } = await supabase
    .from("games")
    .select("id, name, slug")
    .order("name", { ascending: true });

  const games = (data ?? []) as GameRow[];
  const currentGame = games.find((game) => game.slug === slug);

  return (
    <nav className="mb-8 rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
        <Link href={`/games/${slug}`} className={linkClass("leaderboard")}>
          Leaderboard
        </Link>

        <Link href={`/games/${slug}/draw`} className={linkClass("draw")}>
          Pick Teams
        </Link>

        <Link
          href={`/games/${slug}/team-totals`}
          className={linkClass("team-totals")}
        >
          Team Totals
        </Link>

        <Link href={`/games/${slug}/matches`} className={linkClass("matches")}>
          Matches
        </Link>

        <Link href={`/games/${slug}/rules`} className={linkClass("rules")}>
          Rules
        </Link>

        <Link href="/patch-notes" className="underline">
          Patch Notes
        </Link>

        <Link href="/admin/games" className="underline">
          Admin
        </Link>
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 text-sm text-gray-600">
          Viewing:{" "}
          <span className="font-semibold text-gray-900">
            {currentGame?.name ?? slug}
          </span>
        </p>

        <details className="text-sm">
          <summary className="cursor-pointer font-semibold underline">
            Switch game
          </summary>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/games/${game.slug}`}
                className={
                  game.slug === slug ? "font-semibold underline" : "underline"
                }
              >
                {game.name}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
