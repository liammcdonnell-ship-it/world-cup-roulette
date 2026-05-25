import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Nav from "@/components/nav";
import { supabase } from "@/lib/supabase";

type PlayerRow = {
  id: number;
  name: string;
};

type TeamRow = {
  id: number;
  name: string;
  code: string | null;
};

type AssignmentRow = {
  id: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  team_code: string | null;
  draw_round: string;
};

type DrawRoundSetting = {
  draw_round: string;
  label: string;
  is_open: boolean;
  sort_order: number;
};

const drawLimits: Record<string, number> = {
  initial: 3,
  second: 1,
  third: 1,
};

const fallbackDrawRoundLabels: Record<string, string> = {
  initial: "Group Stage",
  second: "Round of 32",
  third: "Quarter Finals",
};

async function drawTeam(formData: FormData) {
  "use server";

  const playerId = Number(formData.get("player_id"));
  const drawRound = formData.get("draw_round")?.toString() || "initial";

  if (!playerId) {
    redirect("/draw?error=Choose a player first");
  }

  const { data: drawRoundSetting } = await supabase
    .from("draw_round_settings")
    .select("draw_round, label, is_open")
    .eq("draw_round", drawRound)
    .single();

  if (!drawRoundSetting?.is_open) {
    redirect(`/draw?player=${playerId}&error=That draw round is currently locked`);
  }

  const limit = drawLimits[drawRound] ?? 1;

  const { data: existingAssignments } = await supabase
    .from("player_teams")
    .select("team_id, draw_round")
    .eq("player_id", playerId);

  const assignments = existingAssignments ?? [];

  const alreadyInThisRound = assignments.filter(
    (assignment) => assignment.draw_round === drawRound
  ).length;

  if (alreadyInThisRound >= limit) {
    redirect(
      `/draw?player=${playerId}&error=You have already completed this draw round`
    );
  }

  const alreadyOwnedTeamIds = new Set(
    assignments.map((assignment) => assignment.team_id)
  );

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, code")
    .order("name", { ascending: true });

  const teams = (teamsData ?? []) as TeamRow[];

  const availableTeams = teams.filter(
    (team) => !alreadyOwnedTeamIds.has(team.id)
  );

  if (availableTeams.length === 0) {
    redirect(`/draw?player=${playerId}&error=No available teams left`);
  }

  const randomIndex = Math.floor(Math.random() * availableTeams.length);
  const drawnTeam = availableTeams[randomIndex];

  await supabase.from("player_teams").insert({
    player_id: playerId,
    team_id: drawnTeam.id,
    draw_round: drawRound,
  });

  revalidatePath("/");
  revalidatePath("/draw");
  revalidatePath("/admin/player-teams");

  redirect(
    `/draw?player=${playerId}&message=You drew ${encodeURIComponent(
      drawnTeam.name
    )}`
  );
}

export default async function DrawPage({
  searchParams,
}: {
  searchParams?: Promise<{
    player?: string;
    message?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedPlayerId = params?.player ? Number(params.player) : null;

  const { data: playersData } = await supabase
    .from("players")
    .select("id, name")
    .order("name", { ascending: true });

  const { data: drawSettingsData } = await supabase
    .from("draw_round_settings")
    .select("draw_round, label, is_open, sort_order")
    .order("sort_order", { ascending: true });

  const { data: assignmentsData } = await supabase
    .from("player_teams")
    .select(
      `
      id,
      draw_round,
      players(id, name),
      teams(id, name, code)
    `
    )
    .order("id", { ascending: true });

  const players = (playersData ?? []) as PlayerRow[];
  const drawSettings = (drawSettingsData ?? []) as DrawRoundSetting[];

  const drawRoundLabels = drawSettings.reduce<Record<string, string>>(
    (labels, setting) => {
      labels[setting.draw_round] = setting.label;
      return labels;
    },
    { ...fallbackDrawRoundLabels }
  );

  const assignments = (assignmentsData ?? []).map((row: any) => ({
    id: row.id,
    player_id: row.players?.id,
    player_name: row.players?.name ?? "Unknown player",
    team_id: row.teams?.id,
    team_name: row.teams?.name ?? "Unknown team",
    team_code: row.teams?.code ?? null,
    draw_round: row.draw_round,
  })) as AssignmentRow[];

  const selectedPlayer = selectedPlayerId
    ? players.find((player) => player.id === selectedPlayerId)
    : null;

  const selectedPlayerAssignments = selectedPlayerId
    ? assignments.filter((assignment) => assignment.player_id === selectedPlayerId)
    : [];

  const initialUsed = selectedPlayerAssignments.filter(
    (assignment) => assignment.draw_round === "initial"
  ).length;

  const secondUsed = selectedPlayerAssignments.filter(
    (assignment) => assignment.draw_round === "second"
  ).length;

  const thirdUsed = selectedPlayerAssignments.filter(
    (assignment) => assignment.draw_round === "third"
  ).length;

  const usedByRound: Record<string, number> = {
    initial: initialUsed,
    second: secondUsed,
    third: thirdUsed,
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
       <Nav activePage="games" />

        <h1 className="text-4xl font-bold mb-2">Draw Your Team</h1>
        <p className="mb-8 text-gray-600">
          Choose your name, choose an open draw round, then draw one random team.
          You cannot draw the same team twice.
        </p>

        <div className="mb-8 rounded-xl border bg-white shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-4">How the draw works</h2>

          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>Choose your own name from the dropdown.</li>
            <li>For the Group Stage draw, you can draw up to three teams.</li>
            <li>For the Round of 32 draw, you can draw one extra team.</li>
            <li>For the Quarter Finals draw, you can draw one final team.</li>
            <li>Locked draw rounds cannot be selected yet.</li>
            <li>You cannot draw the same team twice.</li>
            <li>Different players can still draw the same team.</li>
            <li>Any team you draw brings all of its previous tournament goals with it.</li>
          </ul>
        </div>

        <div className="mb-8 rounded-xl border bg-white shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-4">Draw rounds</h2>

          <div className="grid md:grid-cols-3 gap-4">
            {drawSettings.map((setting) => (
              <div key={setting.draw_round} className="rounded-lg border p-4">
                <p className="font-semibold">{setting.label}</p>
                <p className="text-sm text-gray-600">
                  {setting.is_open ? "Open" : "Locked"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {params?.message && (
          <div className="mb-6 rounded-xl border bg-green-50 p-4 font-semibold">
            {params.message}
          </div>
        )}

        {params?.error && (
          <div className="mb-6 rounded-xl border bg-red-50 p-4 font-semibold">
            {params.error}
          </div>
        )}

        {selectedPlayer && (
          <div className="mb-8 rounded-xl border bg-white shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-4">
              {selectedPlayer.name}&apos;s draw status
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              {drawSettings.map((setting) => {
                const used = usedByRound[setting.draw_round] ?? 0;
                const limit = drawLimits[setting.draw_round] ?? 1;
                const remaining = Math.max(limit - used, 0);

                return (
                  <div key={setting.draw_round} className="rounded-lg border p-4">
                    <p className="font-semibold">{setting.label}</p>
                    <p className="text-2xl font-bold">
                      {used} / {limit}
                    </p>
                    <p className="text-sm text-gray-600">
                      {remaining} remaining
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <form
          action={drawTeam}
          className="mb-10 rounded-xl border bg-white shadow-sm p-6 grid gap-4"
        >
          <label className="grid gap-2">
            <span className="font-semibold">Player</span>
            <select
              name="player_id"
              required
              defaultValue={selectedPlayerId ?? ""}
              className="border rounded-lg p-3 bg-white"
            >
              <option value="">Choose player</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
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
              {drawSettings.map((setting) => (
                <option
                  key={setting.draw_round}
                  value={setting.draw_round}
                  disabled={!setting.is_open}
                >
                  {setting.label}
                  {setting.draw_round === "initial" ? " — up to 3 teams" : " — 1 team"}
                  {!setting.is_open ? " (locked)" : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="rounded-lg border px-4 py-3 font-semibold bg-gray-100 hover:bg-gray-200"
          >
            Draw team
          </button>
        </form>

        {selectedPlayerId && (
          <>
            <h2 className="text-2xl font-bold mb-4">Your current teams</h2>

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm mb-10">
              <table className="w-full text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4">Draw round</th>
                    <th className="p-4">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPlayerAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t">
                      <td className="p-4 text-gray-600">
                        {drawRoundLabels[assignment.draw_round] ??
                          assignment.draw_round}
                      </td>
                      <td className="p-4 font-semibold">
                        {assignment.team_name}
                        {assignment.team_code
                          ? ` (${assignment.team_code})`
                          : ""}
                      </td>
                    </tr>
                  ))}

                  {selectedPlayerAssignments.length === 0 && (
                    <tr>
                      <td className="p-4 text-gray-600" colSpan={2}>
                        No teams drawn yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2 className="text-2xl font-bold mb-4">All current assignments</h2>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Player</th>
                <th className="p-4">Team</th>
                <th className="p-4">Draw round</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-t">
                  <td className="p-4 font-semibold">
                    {assignment.player_name}
                  </td>
                  <td className="p-4">
                    {assignment.team_name}
                    {assignment.team_code ? ` (${assignment.team_code})` : ""}
                  </td>
                  <td className="p-4 text-gray-600">
                    {drawRoundLabels[assignment.draw_round] ??
                      assignment.draw_round}
                  </td>
                </tr>
              ))}

              {assignments.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={3}>
                    No teams have been drawn yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Duplicates are allowed between different players, but not for the same
          player.
        </p>
      </div>
    </main>
  );
}