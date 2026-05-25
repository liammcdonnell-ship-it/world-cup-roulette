import { notFound } from "next/navigation";
import GameNav from "@/components/GameNav";
import { supabase } from "@/lib/supabase";

type GameRow = {
  id: number;
  name: string;
  slug: string;
};

type MatchDisplayRow = {
  id: number;
  home_team_name: string;
  home_team_code: string | null;
  home_flag_image_url: string | null;
  away_team_name: string;
  away_team_code: string | null;
  away_flag_image_url: string | null;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
  kickoff_time: string | null;
};

function TeamNameWithFlag({
  name,
  code,
  flagUrl,
}: {
  name: string;
  code: string | null;
  flagUrl: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {flagUrl ? (
        <img
          src={flagUrl}
          alt={`${name} flag`}
          className="h-4 w-6 rounded-sm object-cover"
        />
      ) : (
        <span className="inline-block h-4 w-6 rounded-sm bg-gray-200" />
      )}

      <span>
        {name}
        {code ? ` (${code})` : ""}
      </span>
    </span>
  );
}

export default async function GameMatchesPage({
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

  const { data, error } = await supabase
    .from("matches_display")
    .select(
      "id, home_team_name, home_team_code, home_flag_image_url, away_team_name, away_team_code, away_flag_image_url, home_goals, away_goals, status, kickoff_time"
    );

  if (error) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-4">Matches</h1>
        <p className="text-red-600">Error loading matches.</p>
        <pre className="mt-4 overflow-x-auto bg-gray-100 p-4 rounded">
          {error.message}
        </pre>
      </main>
    );
  }

  const matches = (data ?? []) as MatchDisplayRow[];

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <GameNav slug={slug} activePage="matches" />

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Matches</h1>
        <p className="mb-2 text-gray-600">
          Game: <span className="font-semibold">{game.name}</span>
        </p>
        <p className="mb-8 text-gray-600">
          These scores feed the leaderboards. Only finished matches count.
        </p>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Match</th>
                <th className="p-4">Score</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-t">
                  <td className="p-4 font-semibold">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <TeamNameWithFlag
                        name={match.home_team_name}
                        code={match.home_team_code}
                        flagUrl={match.home_flag_image_url}
                      />

                      <span className="text-gray-500">v</span>

                      <TeamNameWithFlag
                        name={match.away_team_name}
                        code={match.away_team_code}
                        flagUrl={match.away_flag_image_url}
                      />
                    </span>
                  </td>

                  <td className="p-4">
                    {match.home_goals ?? "-"} - {match.away_goals ?? "-"}
                  </td>

                  <td className="p-4 text-gray-600">{match.status}</td>
                </tr>
              ))}

              {matches.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={3}>
                    No matches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          On smaller screens, swipe the table sideways to see all columns.
        </p>
      </div>
    </main>
  );
}