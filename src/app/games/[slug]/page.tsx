import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Game = {
  id: string;
  name: string;
  slug: string;
};

type LeaderboardRow = {
  player_id?: string;
  player_name?: string;
  name?: string;
  total_goals?: number;
  goals?: number;
  status?: string;
  teams?: string[] | string | null;
  team_names?: string[] | string | null;
  assigned_teams?: string[] | string | null;
};

function getPlayerName(row: LeaderboardRow) {
  return row.player_name ?? row.name ?? "Unknown player";
}

function getGoals(row: LeaderboardRow) {
  return row.total_goals ?? row.goals ?? 0;
}

function getTeams(row: LeaderboardRow) {
  const rawTeams = row.teams ?? row.team_names ?? row.assigned_teams ?? [];

  if (Array.isArray(rawTeams)) {
    return rawTeams.filter(Boolean);
  }

  if (typeof rawTeams === "string") {
    return rawTeams
      .split(",")
      .map((team) => team.trim())
      .filter(Boolean);
  }

  return [];
}

function getStatus(row: LeaderboardRow) {
  const goals = getGoals(row);

  if (row.status) return row.status;
  if (goals === 21) return "Exactly 21";
  if (goals > 21) return "Bust";

  return `${21 - goals} short`;
}

function sortLeaderboard(rows: LeaderboardRow[]) {
  return [...rows].sort((a, b) => {
    const aGoals = getGoals(a);
    const bGoals = getGoals(b);

    const aBust = aGoals > 21;
    const bBust = bGoals > 21;

    if (aGoals === 21 && bGoals !== 21) return -1;
    if (bGoals === 21 && aGoals !== 21) return 1;

    if (!aBust && bBust) return -1;
    if (aBust && !bBust) return 1;

    if (!aBust && !bBust) {
      return bGoals - aGoals;
    }

    return aGoals - bGoals;
  });
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug")
    .eq("slug", slug)
    .single<Game>();

  if (gameError || !game) {
    notFound();
  }

  const { data: leaderboardRows, error: leaderboardError } = await supabase
    .from("game_leaderboard")
    .select("*")
    .eq("game_id", game.id);

  const rows = sortLeaderboard((leaderboardRows ?? []) as LeaderboardRow[]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm text-gray-500">World Cup Roulette</p>
        <h1 className="text-3xl font-bold tracking-tight">{game.name}</h1>
      </div>

      {leaderboardError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load leaderboard.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No players have been added to this game yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-14 px-3 py-3">Rank</th>
                <th className="px-3 py-3">Player</th>
                <th className="w-20 px-3 py-3 text-right">Goals</th>
                <th className="w-24 px-3 py-3 text-right">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => {
                const teams = getTeams(row);
                const goals = getGoals(row);
                const status = getStatus(row);

                return (
                  <tr key={row.player_id ?? `${getPlayerName(row)}-${index}`}>
                    <td className="px-3 py-4 align-top font-semibold text-gray-700">
                      {index + 1}
                    </td>

                    <td className="px-3 py-4 align-top">
                      <div className="font-semibold text-gray-950">
                        {getPlayerName(row)}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {teams.length > 0 ? (
                          teams.map((team) => (
                            <span
                              key={team}
                              className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                            >
                              {team}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">
                            No teams drawn yet
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-4 text-right align-top text-lg font-bold text-gray-950">
                      {goals}
                    </td>

                    <td className="px-3 py-4 text-right align-top">
                      <span
                        className={
                          goals > 21
                            ? "text-sm font-semibold text-red-600"
                            : goals === 21
                              ? "text-sm font-semibold text-green-600"
                              : "text-sm font-medium text-gray-700"
                        }
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}