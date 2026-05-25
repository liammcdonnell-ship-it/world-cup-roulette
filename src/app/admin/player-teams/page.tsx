import { revalidatePath } from "next/cache";
import Nav from "@/components/nav";
import AdminNav from "@/components/AdminNav";
import AdminGameLinks from "@/components/AdminGameLinks";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PlayerRow = {
  id: number;
  name: string;
  game_name: string;
};

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
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
  team_name: string;
  draw_round: string;
  scoring_starts_at: string | null;
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
    .select("id, name, code")
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
      teams(name)
    `
    )
    .order("id", { ascending: true });

  const players = (playersData ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    game_name: row.games?.name ?? "Unknown game",
  })) as PlayerRow[];

  const teams = (teamsData ?? []) as TeamRow[];
  const drawRounds = (drawRoundsData ?? []) as DrawRoundSetting[];

  const drawRoundLabels = drawRounds.reduce<Record<string, string>>(
    (labels, setting) => {
      labels[setting.draw_round] = setting.label;
      return labels;
    },
    { ...fallbackDrawRoundLabels }
  );

  const playerTeams = (playerTeamsData ?? []).map((row: any) => ({
    id: row.id,
    player_name: row.players?.name ?? "Unknown player",
    game_name: row.players?.games?.name ?? "Unknown game",
    team_name: row.teams?.name ?? "Unknown team",
    draw_round: row.draw_round,
    scoring_starts_at: row.scoring_starts_at,
  })) as PlayerTeamRow[];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <Nav activePage="admin" />
        <AdminNav activePage="player-teams" />
        <AdminGameLinks />

        <h1 className="text-4xl font-bold mb-2">Admin: Player Teams</h1>
        <p className="mb-8 text-gray-600">
          Manually assign teams to players. Later-round assignments copy the
          scoring start time from the draw round settings.
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
                <option value="">Choose team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.code ? ` (${team.code})` : ""}
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
                  <td className="p-4">{assignment.team_name}</td>
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
          not have the same team twice. Later-round teams only count goals scored
          after that draw round opens.
        </p>
      </div>
    </main>
  );
}