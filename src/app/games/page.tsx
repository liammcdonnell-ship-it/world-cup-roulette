import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default async function GamesPage() {
  const { data, error } = await supabase
    .from("games")
    .select("slug")
    .order("id", { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) {
    return (
      <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
        <div className="max-w-xl mx-auto rounded-xl border bg-white shadow-sm p-6">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            World Cup Blackjack
          </h1>

          <p className="text-gray-600">
            No games have been created yet. Log in to admin and create a game.
          </p>
        </div>
      </main>
    );
  }

  redirect(`/games/${data[0].slug}`);
}
