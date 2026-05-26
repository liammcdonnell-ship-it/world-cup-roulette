import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import GameNav from "@/components/GameNav";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type GameRow = {
  id: number;
  name: string;
  slug: string;
};

type PlayerRow = {
  id: number;
  name: string;
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
  sort_order: number;
  scoring_starts_at: string | null;
};

type AssignmentRow = {
  id: number;
  player_id: number;
  player_name: string;
  team_id: number;
  team_name: string;
  team_code: string | null;
  flag_image_url: string | null;
  draw_round: string;
};

const drawLimits: Record<string, number> = {
  initial: 3,
  second: 1,
  third: 1,
};

const fallbackPickRoundLabels: Record<string, string> = {
  initial: "Group Stage",
  second: "Round of 32",
  third: "Quarter Finals",
};

async function pickTeam(formData: FormData) {
  "use server";

  const gameSlug = formData.get("game_slug")?.toString();
  const playerId = Number(formData.get("player_id"));
  const drawRound = formData.get("draw_round")?.toString() || "initial";

  if (!gameSlug) {
    redirect("/games");
  }

  if (!playerId) {
    redirect(`/games/${gameSlug}/draw?error=Choose a player first`);
  }

  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id, name, slug")
    .eq("slug", gameSlug)
    .single();

  if (!game) {
    redirect("/games");
  }

  const { data: player } = await supabaseAdmin
    .from("players")
    .select("id, game_id")
    .eq("id", playerId)
    .single();

  if (!player || player.game_id !== game.id) {
    redirect(`/games/${gameSlug}/draw?error=Invalid player for this game`);
  }

  const { data: drawRoundSetting } = await supabaseAdmin
    .from("draw_round_settings")
    .select("draw_round, label, is_open, scoring_starts_at")
    .eq("draw_round", drawRound)
    .single();

  if (!drawRoundSetting?.is_open) {
    redirect(
      `/games/${gameSlug}/draw?player=${playerId}&error=That pick round is currently locked`
    );
  }

  const limit = drawLimits[drawRound] ?? 1;

  const { data: existingAssignments } = await supabaseAdmin
    .from("player_teams")
    .select("team_id, draw_round")
    .eq("player_id", playerId);

  const assignments = existingAssignments ?? [];

  const alreadyInThisRound = assignments.filter(
    (assignment) => assignment.draw_round === drawRound
  ).length;

  if (alreadyInThisRound >= limit) {
    redirect(
      `/games/${gameSlug}/draw?player=${playerId}&error=You have already completed this pick round`
    );
  }

  const alreadyOwnedTeamIds = new Set(
    assignments.map((assignment) => assignment.team_id)
  );

  const { data: teamsData } = await supabaseAdmin
    .from("teams")
    .select("id, name, code")
    .order("name", { ascending: true });

  const teams = (teamsData ?? []) as TeamRow[];

  const availableTeams = teams.filter(
    (team) => !alreadyOwnedTeamIds.has(team.id)
  );

  if (availableTeams.length === 0) {
    redirect(
      `/games/${gameSlug}/draw?player=${playerId}&error=No available teams left`
    );
  }

  const randomIndex = Math.floor(Math.random() * availableTeams.length);
  const pickedTeam = availableTeams[randomIndex];

  await supabaseAdmin.from("player_teams").insert({
    player_id: playerId,
    team_id: pickedTeam.id,
    draw_round: drawRound,
    scoring_starts_at:
      drawRound === "initial" ? null : drawRoundSetting.scoring_starts_at,
  });

  revalidatePath(`/games/${gameSlug}`);
  revalidatePath(`/games/${gameSlug}/draw`);
  revalidatePath(`/games/${gameSlug}/team-totals`);
  revalidatePath(`/games/${gameSlug}/matches`);
  revalidatePath("/admin/player-teams");

  redirect(
    `/games/${gameSlug}/draw?player=${playerId}&message=You picked ${encodeURIComponent(
      pickedTeam.name
    )}`
  );
}

export default async function GameDrawPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    player?: string;
    message?: string;
    error?: string;
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const selectedPlayerId = query?.player ? Number(query.player) : null;

  const { data: gameData } = await supabase
    .from("games")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!gameData) {
    notFound();
  }

  const game = gameData as GameRow;

  const { data: playersData } = await supabase
    .from("players")
    .select("id, name")
    .eq("game_id", game.id)
    .order("name", { ascending: true });

  const players = (playersData ?? []) as PlayerRow[];
  const playerIds = players.map((player) => player.id);

  const { data: drawSettingsData } = await supabase
    .from("draw_round_settings")
    .select("draw_round, label, is_open, sort_order, scoring_starts_at")
    .order("sort_order", { ascending: true });

  const drawSettings = (drawSettingsData ?? []) as DrawRoundSetting[];

  const pickRoundLabels = drawSettings.reduce<Record<string, string>>(
    (labels, setting) => {
      labels[setting.draw_round] = setting.label;
      return labels;
    },
    { ...fallbackPickRoundLabels }
  );

  const { data: playerTeamsData } =
    playerIds.length > 0
      ? await supabase
          .from("player_teams")
          .select(
            `
            id,
            player_id,
            team_id,
            draw_round,
            teams(id, name, code, flag_image_url)
          `
          )
          .in("player_id", playerIds)
          .order("id", { ascending: true })
      : { data: [] };

  const playerNameById = new Map(
    players.map((player) => [player.id, player.name])
  );

  const assignments = (playerTeamsData ?? []).map((row: any) => ({
    id: row.id,
    player_id: row.player_id,
    player_name: playerNameById.get(row.player_id) ?? "Unknown player",
    team_id: row.team_id,
    team_name: row.teams?.name ?? "Unknown team",
    team_code: row.teams?.code ?? null,
    flag_image_url: row.teams?.flag_image_url ?? null,
    draw_round: row.draw_round,
  })) as AssignmentRow[];

  const selectedPlayer = selectedPlayerId
    ? players.find((player) => player.id === selectedPlayerId)
    : null;

  const selectedPlayerAssignments = selectedPlayerId
    ? assignments.filter((assignment) => assignment.player_id === selectedPlayerId)
    : [];

  const usedByRound: Record<string, number> = {
    initial: selectedPlayerAssignments.filter(
      (assignment) => assignment.draw_round === "initial"
    ).length,
    second: selectedPlayerAssignments.filter(
      (assignment) => assignment.draw_round === "second"
    ).length,
    third: selectedPlayerAssignments.filter(
      (assignment) => assignment.draw_round === "third"
    ).length,
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <GameNav slug={slug} activePage="draw" />

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Pick Your Teams
        </h1>
        <p className="mb-2 text-gray-600">
          Game: <span className="font-semibold">{game.name}</span>
        </p>
        <p className="mb-8 text-gray-600">
          Choose your name, choose an open pick round, then pick one random
          team. You cannot pick the same team twice.
        </p>

        <div className="mb-8 rounded-xl border bg-white shadow-sm p-4 sm:p-6">
          <h2 className="text-2xl font-bold mb-4">Pick rounds</h2>

          <div className="grid md:grid-cols-3 gap-4">
            {drawSettings.map((setting) => (
              <div key={setting.draw_round} className="rounded-lg border p-4">
                <p className="font-semibold">{setting.label}</p>
                <p className="text-sm text-gray-600">
                  {setting.is_open ? "Open" : "Locked"}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {setting.draw_round === "initial"
                    ? "Counts from tournament start"
                    : setting.scoring_starts_at
                      ? `Counts from ${new Date(
                          setting.scoring_starts_at
                        ).toLocaleString()}`
                      : "Scoring start not set yet"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {query?.message && (
          <div className="mb-6 rounded-xl border bg-green-50 p-4 font-semibold">
            {query.message}
          </div>
        )}

        {query?.error && (
          <div className="mb-6 rounded-xl border bg-red-50 p-4 font-semibold">
            {query.error}
          </div>
        )}

        {selectedPlayer && (
          <div className="mb-8 rounded-xl border bg-white shadow-sm p-4 sm:p-6">
            <h2 className="text-2xl font-bold mb-4">
              {selectedPlayer.name}&apos;s pick status
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
          action={pickTeam}
          className="mb-10 rounded-xl border bg-white shadow-sm p-4 sm:p-6 grid gap-4"
        >
          <input type="hidden" name="game_slug" value={game.slug} />

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
            <span className="font-semibold">Pick round</span>
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
                  {setting.draw_round === "initial"
                    ? " — up to 3 teams"
                    : " — 1 team"}
                  {!setting.is_open ? " (locked)" : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="rounded-lg border px-4 py-3 font-semibold bg-gray-100 hover:bg-gray-200"
          >
            Pick team
          </button>
        </form>

        {selectedPlayerId && (
          <>
            <h2 className="text-2xl font-bold mb-4">Your current teams</h2>

            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm mb-10">
              <table className="w-full min-w-[560px] text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4">Pick round</th>
                    <th className="p-4">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPlayerAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-t">
                      <td className="p-4 text-gray-600">
                        {pickRoundLabels[assignment.draw_round] ??
                          assignment.draw_round}
                      </td>
                      <td className="p-4 font-semibold">
                        <span className="inline-flex items-center gap-2">
                          {assignment.flag_image_url && (
                            <img
                              src={assignment.flag_image_url}
                              alt={`${assignment.team_name} flag`}
                              className="h-4 w-6 rounded-sm object-cover"
                            />
                          )}
                          <span>
                            {assignment.team_name}
                            {assignment.team_code
                              ? ` (${assignment.team_code})`
                              : ""}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}

                  {selectedPlayerAssignments.length === 0 && (
                    <tr>
                      <td className="p-4 text-gray-600" colSpan={2}>
                        No teams picked yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2 className="text-2xl font-bold mb-4">All current assignments</h2>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Player</th>
                <th className="p-4">Team</th>
                <th className="p-4">Pick round</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-t">
                  <td className="p-4 font-semibold">
                    {assignment.player_name}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-2">
                      {assignment.flag_image_url && (
                        <img
                          src={assignment.flag_image_url}
                          alt={`${assignment.team_name} flag`}
                          className="h-4 w-6 rounded-sm object-cover"
                        />
                      )}
                      <span>
                        {assignment.team_name}
                        {assignment.team_code ? ` (${assignment.team_code})` : ""}
                      </span>
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">
                    {pickRoundLabels[assignment.draw_round] ??
                      assignment.draw_round}
                  </td>
                </tr>
              ))}

              {assignments.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={3}>
                    No teams have been picked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Duplicates are allowed between different players, but not for the same
          player. Later-round teams only count goals scored after that pick round
          opens.
        </p>
      </div>
    </main>
  );
}