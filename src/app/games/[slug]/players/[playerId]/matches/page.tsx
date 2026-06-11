import { notFound } from "next/navigation";
import GameNav from "@/components/GameNav";
import { supabase } from "@/lib/supabase";

type GameRow = {
  id: number;
  name: string;
  slug: string;
};

type PlayerRow = {
  id: number;
  name: string;
  game_id: number;
};

type PlayerTeamRow = {
  id: number;
  draw_round: string;
  teams: TeamRow | null;
};

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
  flag_image_url: string | null;
};

type PlayerTeamQueryRow = {
  id: number;
  draw_round: string;
  teams: TeamRow | TeamRow[] | null;
};

type MatchDisplayRow = {
  id: number;
  home_team_id: number;
  home_team_name: string;
  home_team_code: string | null;
  home_flag_image_url: string | null;
  away_team_id: number;
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

function formatKickoff(kickoffTime: string | null) {
  if (!kickoffTime) {
    return "Kick-off TBC";
  }

  return new Date(kickoffTime).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PlayerMatchesPage({
  params,
}: {
  params: Promise<{ slug: string; playerId: string }>;
}) {
  const { slug, playerId } = await params;
  const numericPlayerId = Number(playerId);

  if (!numericPlayerId) {
    notFound();
  }

  const { data: gameData } = await supabase
    .from("games")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!gameData) {
    notFound();
  }

  const game = gameData as GameRow;

  const { data: playerData } = await supabase
    .from("players")
    .select("id, name, game_id")
    .eq("id", numericPlayerId)
    .single();

  if (!playerData) {
    notFound();
  }

  const player = playerData as PlayerRow;

  if (player.game_id !== game.id) {
    notFound();
  }

  const { data: playerTeamsData } = await supabase
    .from("player_teams")
    .select(
      `
      id,
      draw_round,
      teams(id, name, code, flag_image_url)
    `
    )
    .eq("player_id", player.id)
    .order("id", { ascending: true });

  const playerTeams = ((playerTeamsData ?? []) as PlayerTeamQueryRow[]).map(
    (row) => {
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;

      return {
        id: row.id,
        draw_round: row.draw_round,
        teams: team
          ? {
              id: team.id,
              name: team.name,
              code: team.code,
              flag_image_url: team.flag_image_url,
            }
          : null,
      };
    }
  ) as PlayerTeamRow[];

  const teamIds = playerTeams
    .map((assignment) => assignment.teams?.id)
    .filter((teamId): teamId is number => Boolean(teamId));

  const { data: matchesData, error } =
    teamIds.length > 0
      ? await supabase
          .from("matches_display")
          .select(
            "id, home_team_id, home_team_name, home_team_code, home_flag_image_url, away_team_id, away_team_name, away_team_code, away_flag_image_url, home_goals, away_goals, status, kickoff_time"
          )
          .or(
            `home_team_id.in.(${teamIds.join(
              ","
            )}),away_team_id.in.(${teamIds.join(",")})`
          )
      : { data: [], error: null };

  if (error) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <h1 className="text-3xl font-bold mb-4">Player Matches</h1>
        <p className="text-red-600">Error loading player matches.</p>
        <pre className="mt-4 overflow-x-auto bg-gray-100 p-4 rounded">
          {error.message}
        </pre>
      </main>
    );
  }

  const matches = ((matchesData ?? []) as MatchDisplayRow[]).sort((a, b) => {
    const aTime = a.kickoff_time ? new Date(a.kickoff_time).getTime() : 0;
    const bTime = b.kickoff_time ? new Date(b.kickoff_time).getTime() : 0;

    return aTime - bTime;
  });

  const teamNames = playerTeams
    .map((assignment) => assignment.teams?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <GameNav slug={slug} activePage="leaderboard" />

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {player.name}&apos;s Matches
        </h1>

        <p className="mb-2 text-gray-600">
          Game: <span className="font-semibold">{game.name}</span>
        </p>

        <p className="mb-8 text-gray-600">
          Showing scheduled and played matches for:{" "}
          <span className="font-semibold">{teamNames || "No teams yet"}</span>
        </p>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Kick-off</th>
                <th className="p-4">Match</th>
                <th className="p-4">Score</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-t">
                  <td className="p-4 text-gray-600">
                    {formatKickoff(match.kickoff_time)}
                  </td>

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
                  <td className="p-4 text-gray-600" colSpan={4}>
                    No matches found for this player&apos;s teams yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          This page shows all matches involving this player&apos;s collected
          teams. Leaderboard scoring still follows the draw-round scoring rules.
        </p>
      </div>
    </main>
  );
}
