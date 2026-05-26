import { notFound } from "next/navigation";
import GameNav from "@/components/GameNav";
import { supabase } from "@/lib/supabase";

type GameRow = {
  id: number;
  name: string;
  slug: string;
};

export default async function GameRulesPage({
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

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <GameNav slug={slug} activePage="rules" />

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Rules</h1>
        <p className="mb-2 text-gray-600">
          Game: <span className="font-semibold">{game.name}</span>
        </p>
        <p className="mb-8 text-gray-600">
          The aim is to finish as close as possible to 21 goals without going
          over.
        </p>

        <div className="rounded-xl border bg-white shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="text-2xl font-bold">World Cup Blackjack</h2>

          <p>
            Each player starts with three random teams in the Group Stage pick.
          </p>

          <p>
            After the group stage, each player can pick one extra team in the
            Round of 32 pick. Later in the tournament, each player can pick one
            final team in the Quarter Finals pick.
          </p>

          <p>
            Different players can have the same team, but one player cannot pick
            the same team twice.
          </p>

          <p>
            Group Stage pick teams count goals from the start of the tournament.
            Round of 32 and Quarter Finals pick teams only count goals scored
            after that pick round opens.
          </p>

          <p>
            Official match goals count. Extra-time goals count. Penalty shootout
            goals do not count.
          </p>

          <p>
            Exactly 21 goals is perfect. If nobody finishes on 21, the winner is
            the player closest to 21 without going over.
          </p>

          <p className="font-semibold">Anyone who goes over 21 is bust.</p>
        </div>
      </div>
    </main>
  );
}