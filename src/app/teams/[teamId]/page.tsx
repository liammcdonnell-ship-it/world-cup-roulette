/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/nav";
import TeamLink from "@/components/TeamLink";
import { supabase } from "@/lib/supabase";
import { getTeamStatusMaps } from "@/lib/teamStatus";

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
  flag_image_url: string | null;
  is_eliminated: boolean;
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

type DrawnPlayerRow = {
  id: number;
  player_id: number;
  players:
    | {
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
      }
    | {
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
      }[]
    | null;
};

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

export default async function TeamFixturesPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const numericTeamId = Number(teamId);

  if (!numericTeamId) {
    notFound();
  }

  const { data: teamData } = await supabase
    .from("teams")
    .select("id, name, code, flag_image_url, is_eliminated")
    .eq("id", numericTeamId)
    .single();

  if (!teamData) {
    notFound();
  }

  const team = teamData as TeamRow;

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches_display")
    .select(
      "id, home_team_id, home_team_name, home_team_code, home_flag_image_url, away_team_id, away_team_name, away_team_code, away_flag_image_url, home_goals, away_goals, status, kickoff_time"
    )
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`);

  const { data: drawnPlayersData } = await supabase
    .from("player_teams")
    .select(
      `
      id,
      player_id,
      players(id, name, games(name, slug))
    `
    )
    .eq("team_id", team.id)
    .order("id", { ascending: true });

  if (matchesError) {
    return (
      <main className="min-h-screen p-4 sm:p-8">
        <h1 className="mb-4 text-3xl font-bold">{team.name}</h1>
        <p className="text-red-600">Error loading fixtures.</p>
        <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-4">
          {matchesError.message}
        </pre>
      </main>
    );
  }

  const matches = ((matchesData ?? []) as MatchDisplayRow[]).sort((a, b) => {
    const aTime = a.kickoff_time ? new Date(a.kickoff_time).getTime() : 0;
    const bTime = b.kickoff_time ? new Date(b.kickoff_time).getTime() : 0;

    return aTime - bTime;
  });
  const { teamEliminatedById, teamDisplayStatusById } =
    await getTeamStatusMaps();
  const teamDisplayStatus = teamDisplayStatusById.get(team.id) ?? "active";

  const drawnPlayers = ((drawnPlayersData ?? []) as DrawnPlayerRow[])
    .map((row) => {
      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      const game = Array.isArray(player?.games)
        ? player?.games[0]
        : player?.games;

      return player && game
        ? {
            player_id: player.id,
            player_name: player.name,
            game_name: game.name,
            game_slug: game.slug,
          }
        : null;
    })
    .filter(
      (
        player
      ): player is {
        player_id: number;
        player_name: string;
        game_name: string;
        game_slug: string;
      } => Boolean(player)
    );

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Nav activePage="matches" />

        <div className="mb-8">
          <Link href="/matches" className="text-sm text-gray-600 underline">
            Back to matches
          </Link>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          {team.flag_image_url && (
            <img
              src={team.flag_image_url}
              alt={`${team.name} flag`}
              className="h-8 w-12 rounded-sm object-cover"
            />
          )}
          <div>
            <h1
              className={`text-3xl font-bold sm:text-4xl ${
                teamDisplayStatus === "third_place_playoff"
                  ? "text-purple-700"
                  : team.is_eliminated
                    ? "text-red-700"
                    : ""
              }`}
            >
              {team.name} Fixtures
            </h1>
            <p className="text-gray-600">
              {team.code ? `${team.code} · ` : ""}
              {teamDisplayStatus === "third_place_playoff"
                ? "Third-place playoff"
                : team.is_eliminated
                  ? "Eliminated"
                  : "Active"}
            </p>
          </div>
        </div>

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
                      <TeamLink
                        teamId={match.home_team_id}
                        name={match.home_team_name}
                        code={match.home_team_code}
                        flagUrl={match.home_flag_image_url}
                        isEliminated={
                          teamEliminatedById.get(match.home_team_id) ?? false
                        }
                        status={teamDisplayStatusById.get(match.home_team_id)}
                      />
                      <span className="text-gray-500">v</span>
                      <TeamLink
                        teamId={match.away_team_id}
                        name={match.away_team_name}
                        code={match.away_team_code}
                        flagUrl={match.away_flag_image_url}
                        isEliminated={
                          teamEliminatedById.get(match.away_team_id) ?? false
                        }
                        status={teamDisplayStatusById.get(match.away_team_id)}
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
                    No fixtures found for this team yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border bg-white p-4 text-sm text-gray-600 shadow-sm">
          <span className="font-semibold text-gray-900">Drawn by: </span>
          {drawnPlayers.length > 0 ? (
            <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
              {drawnPlayers.map((player) => (
                <Link
                  key={`${player.game_slug}-${player.player_id}`}
                  href={`/players/${player.player_id}`}
                  className="underline"
                >
                  {player.player_name} ({player.game_name})
                </Link>
              ))}
            </span>
          ) : (
            <span>No players have drawn this team yet.</span>
          )}
        </div>
      </div>
    </main>
  );
}
