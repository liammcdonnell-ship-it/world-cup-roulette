import { revalidatePath } from "next/cache";
import Nav from "@/components/nav";
import AdminNav from "@/components/AdminNav";
import AdminGameLinks from "@/components/AdminGameLinks";
import TeamLink from "@/components/TeamLink";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getTeamStatusMaps } from "@/lib/teamStatus";

type PlayerRow = {
  id: number;
  name: string;
  game_name: string;
};

type PlayerQueryRow = {
  id: number;
  name: string;
  games:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
  is_eliminated: boolean;
};

type DrawRoundSetting = {
  draw_round: string;
  label: string;
  is_open: boolean;
  scoring_starts_at: string | null;
};

type PlayerTeamRow = {
  id: number;
  player_name: string;
  game_name: string;
  team_id: number;
  team_name: string;
  team_code: string | null;
  is_eliminated: boolean;
  draw_round: string;
  scoring_starts_at: string | null;
};

type PlayerTeamQueryRow = {
  id: number;
  draw_round: string;
  scoring_starts_at: string | null;
  players:
    | {
        name: string;
        games:
          | {
              name: string;
            }
          | {
              name: string;
            }[]
          | null;
      }
    | {
        name: string;
        games:
          | {
              name: string;
            }
          | {
              name: string;
            }[]
          | null;
      }[]
    | null;
  teams:
    | {
        id: number;
        name: string;
        code: string | null;
        is_eliminated: boolean;
      }
    | {
        id: number;
        name: string;
        code: string | null;
        is_eliminated: boolean;
      }[]
    | null;
};

const fallbackDrawRoundLabels: Record<string, string> = {
  initial: "Group Stage",
  second: "Round of 32",
  third: "Quarter Finals",
};

async function refreshPages() {
  revalidatePath("/");
  revalidatePath("/games");
  revalidatePath("/team-totals");
  revalidatePath("/admin/player-teams");
}

async function addPlayerTeam(formData: FormData) {
  "use server";

  const playerId = Number(formData.get("player_id"));
  const teamId = Number(formData.get("team_id"));
  const drawRound = formData.get("draw_round")?.toString() || "initial";

  if (!playerId || !teamId) {
    return;
  }

  // Safety check: do not allow eliminated teams to be assigned,
  // even if someone submits the form manually.
  const { data: selectedTeam } = await supabaseAdmin
    .from("teams")
    .select("id, is_eliminated")
    .eq("id", teamId)
    .single();

  if (!selectedTeam || selectedTeam.is_eliminated) {
    return;
  }

  const { data: drawRoundSetting } = await supabaseAdmin
    .from("draw_round_settings")
    .select("draw_round, scoring_starts_at")
    .eq("draw_round", drawRound)
    .single();

  await supabaseAdmin.from("player_teams").insert({
    player_id: playerId,
    team_id: teamId,
    draw_round: drawRound,
    scoring_starts_at:
      drawRound === "initial"
        ? null
        : drawRoundSetting?.scoring_starts_at ?? null,
  });

  await refreshPages();
}

async function deletePlayerTeam(formData: FormData) {
  "use server";

  const playerTeamId = Number(formData.get("player_team_id"));

  await supabaseAdmin.from("player_teams").delete().eq("id", playerTeamId);

  await refreshPages();
}

export default async function AdminPlayerTeamsPage() {
  const { data: playersData } = await supabase
    .from("players")
    .select(
      `
      id,
      name,
      games(name)
    `
    )
    .order("name", { ascending: true });

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, code, is_eliminated")
    .order("name", { ascending: true });

  const { data: drawRoundsData } = await supabase
    .from("draw_round_settings")
    .select("draw_round, label, is_open, scoring_starts_at")
    .order("sort_order", { ascending: true });

  const { data: playerTeamsData } = await supabase
    .from("player_teams")
    .select(
      `
      id,
      draw_round,
      scoring_starts_at,
      players(name, games(name)),
      teams(id, name, code, is_eliminated)
    `
    )
    .order("id", { ascending: true });

  const players = ((playersData ?? []) as PlayerQueryRow[]).map((row) => {
    const game = Array.isArray(row.games) ? row.games[0] : row.games;

    return {
      id: row.id,
      name: row.name,
      game_name: game?.name ?? "Unknown game",
    };
  }) as PlayerRow[];

  const teams = ((teamsData ?? []) as TeamRow[]).filter(
    (team) => !team.is_eliminated
  );
  const { teamDisplayStatusById } = await getTeamStatusMaps();

  const drawRounds = (drawRoundsData ?? []) as DrawRoundSetting[];

  const drawRoundLabels = drawRounds.reduce<Record<string, string>>(
    (labels, setting) => {
      labels[setting.draw_round] = setting.label;
      return labels;
    },
    { ...fallbackDrawRoundLabels }
  );

  const playerTeams = (
    (playerTeamsData ?? []) as PlayerTeamQueryRow[]
  ).map((row) => {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    const game = Array.isArray(player?.games)
      ? player?.games[0]
      : player?.games;
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;

    return {
      id: row.id,
      player_name: player?.name ?? "Unknown player",
      game_name: game?.name ?? "Unknown game",
      team_id: team?.id ?? 0,
      team_name: team?.name ?? "Unknown team",
      team_code: team?.code ?? null,
      is_eliminated: team?.is_eliminated ?? false,
      draw_round: row.draw_round,
      scoring_starts_at: row.scoring_starts_at,
    };
  }) as PlayerTeamRow[];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <Nav activePage="admin" />
        <AdminNav activePage="player-teams" />
        <AdminGameLinks />

        <h1 className="text-4xl font-bold mb-2">Admin: Player Teams</h1>
        <p className="mb-8 text-gray-600">
          Manually assign teams to players. Eliminated teams cannot be assigned.
          Later-round assignments copy the scoring start time from the draw
          round settings.
        </p>

        <form
          action={addPlayerTeam}
          className="mb-10 rounded-xl border bg-white shadow-sm p-6 grid gap-4"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <label className="grid gap-2">
              <span className="font-semibold">Player</span>
              <select
                name="player_id"
                required
                className="border rounded-lg p-3 bg-white"
              >
                <option value="">Choose player</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} — {player.game_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-semibold">Team</span>
              <select
                name="team_id"
                required
                className="border rounded-lg p-3 bg-white"
              >
                <option value="">Choose non-eliminated team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.code ? ` (${team.code})` : ""}
                    {team.is_eliminated ? " - eliminated" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="font-semibold">Draw round</span>
              <select
                name="draw_round"
                required
                defaultValue="initial"
                className="border rounded-lg p-3 bg-white"
              >
                {drawRounds.map((round) => (
                  <option key={round.draw_round} value={round.draw_round}>
                    {round.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="rounded-lg border px-4 py-3 font-semibold bg-gray-100 hover:bg-gray-200"
          >
            Assign team
          </button>
        </form>

        <h2 className="text-2xl font-bold mb-4">Current assignments</h2>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Player</th>
                <th className="p-4">Game</th>
                <th className="p-4">Team</th>
                <th className="p-4">Draw round</th>
                <th className="p-4">Scoring starts</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {playerTeams.map((assignment) => (
                <tr key={assignment.id} className="border-t">
                  <td className="p-4 font-semibold">
                    {assignment.player_name}
                  </td>
                  <td className="p-4">{assignment.game_name}</td>
                  <td className="p-4">
                    {assignment.team_id ? (
                      <TeamLink
                        teamId={assignment.team_id}
                        name={assignment.team_name}
                        code={assignment.team_code}
                        isEliminated={assignment.is_eliminated}
                        status={teamDisplayStatusById.get(assignment.team_id)}
                      />
                    ) : (
                      assignment.team_name
                    )}
                  </td>
                  <td className="p-4 text-gray-600">
                    {drawRoundLabels[assignment.draw_round] ??
                      assignment.draw_round}
                  </td>
                  <td className="p-4 text-gray-600">
                    {assignment.draw_round === "initial"
                      ? "Tournament start"
                      : assignment.scoring_starts_at
                        ? new Date(
                            assignment.scoring_starts_at
                          ).toLocaleString()
                        : "Not set"}
                  </td>
                  <td className="p-4">
                    <form action={deletePlayerTeam}>
                      <input
                        type="hidden"
                        name="player_team_id"
                        value={assignment.id}
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

              {playerTeams.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={6}>
                    No team assignments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Duplicates are allowed across different players, but a player should
          not have the same team twice. Eliminated teams cannot be assigned.
          Later-round teams only count goals scored after that draw round opens.
        </p>
      </div>
    </main>
  );
}
