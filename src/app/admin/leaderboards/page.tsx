import Link from "next/link";
import Nav from "@/components/nav";
import AdminNav from "@/components/AdminNav";
import { supabase } from "@/lib/supabase";

type LeaderboardRow = {
  game_id: number;
  game_name: string;
  game_slug: string;
  player_id: number;
  player_name: string;
  is_paid: boolean;
  total_goals: number;
  status: string;
};

function getDisplayStatus(totalGoals: number) {
  if (totalGoals === 21) {
    return "Perfect 21";
  }

  if (totalGoals > 21) {
    return "Bust";
  }

  return `${21 - totalGoals} to go`;
}

function getRowClass(totalGoals: number) {
  if (totalGoals === 21) {
    return "border-t bg-green-50";
  }

  if (totalGoals > 21) {
    return "border-t bg-red-50";
  }

  return "border-t";
}

function sortLeaderboard(rows: LeaderboardRow[]) {
  return [...rows].sort((a, b) => {
    const gameCompare = a.game_name.localeCompare(b.game_name);

    if (gameCompare !== 0) {
      return gameCompare;
    }

    const aGoals = a.total_goals;
    const bGoals = b.total_goals;
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

function getGameRanks(rows: LeaderboardRow[]) {
  const ranks = new Map<number, number>();
  const rowsByGame = new Map<number, LeaderboardRow[]>();

  for (const row of rows) {
    const gameRows = rowsByGame.get(row.game_id) ?? [];
    gameRows.push(row);
    rowsByGame.set(row.game_id, gameRows);
  }

  for (const gameRows of rowsByGame.values()) {
    sortLeaderboard(gameRows).forEach((row, index) => {
      ranks.set(row.player_id, index + 1);
    });
  }

  return ranks;
}

export default async function AdminLeaderboardsPage() {
  const { data, error } = await supabase
    .from("game_leaderboard")
    .select(
      "game_id, game_name, game_slug, player_id, player_name, is_paid, total_goals, status"
    );

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="mb-4 text-3xl font-bold">Admin: Leaderboards</h1>
        <p className="text-red-600">Error loading leaderboards.</p>
        <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-4">
          {error.message}
        </pre>
      </main>
    );
  }

  const leaderboards = sortLeaderboard((data ?? []) as LeaderboardRow[]);
  const gameRanks = getGameRanks((data ?? []) as LeaderboardRow[]);

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <Nav activePage="admin" />
        <AdminNav activePage="leaderboards" />

        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">
          Admin: Leaderboards
        </h1>
        <p className="mb-8 text-gray-600">
          A merged view of every current leaderboard. Each player row shows the
          game they belong to.
        </p>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Game</th>
                <th className="p-4">Rank</th>
                <th className="p-4">Player</th>
                <th className="p-4 text-right">Goals</th>
                <th className="p-4">Status</th>
                <th className="p-4">Paid</th>
                <th className="p-4">Links</th>
              </tr>
            </thead>
            <tbody>
              {leaderboards.map((row) => (
                <tr
                  key={`${row.game_id}-${row.player_id}`}
                  className={getRowClass(row.total_goals)}
                >
                  <td className="p-4 font-semibold">
                    <Link
                      href={`/games/${row.game_slug}`}
                      className="underline"
                    >
                      {row.game_name}
                    </Link>
                  </td>
                  <td className="p-4 text-gray-600">
                    {gameRanks.get(row.player_id) ?? "-"}
                  </td>
                  <td className="p-4 font-semibold">{row.player_name}</td>
                  <td className="p-4 text-right text-lg font-bold">
                    {row.total_goals}
                  </td>
                  <td className="p-4 text-gray-600">
                    {getDisplayStatus(row.total_goals)}
                  </td>
                  <td className="p-4 text-gray-600">
                    {row.is_paid ? "Paid" : "Not paid"}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/games/${row.game_slug}/players/${row.player_id}/matches`}
                      className="rounded-lg border bg-gray-100 px-3 py-2 text-sm font-semibold underline hover:bg-gray-200"
                    >
                      Matches
                    </Link>
                  </td>
                </tr>
              ))}

              {leaderboards.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={7}>
                    No leaderboard rows yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Ranks are calculated within each game, then all games are shown
          together in this table.
        </p>
      </div>
    </main>
  );
}
