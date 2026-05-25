import { revalidatePath } from "next/cache";
import Nav from "@/components/nav";
import AdminNav from "@/components/AdminNav";
import AdminGameLinks from "@/components/AdminGameLinks";
import { supabase } from "@/lib/supabase";

type DrawRoundSetting = {
  draw_round: string;
  label: string;
  is_open: boolean;
  sort_order: number;
  scoring_starts_at: string | null;
};

async function refreshPages() {
  revalidatePath("/draw");
  revalidatePath("/admin/draw-rounds");
  revalidatePath("/admin/player-teams");
}

async function toggleDrawRound(formData: FormData) {
  "use server";

  const drawRound = formData.get("draw_round")?.toString();
  const nextIsOpen = formData.get("next_is_open") === "true";

  if (!drawRound) {
    return;
  }

  const updateData: {
    is_open: boolean;
    scoring_starts_at?: string | null;
  } = {
    is_open: nextIsOpen,
  };

  // Group Stage always counts from the start, so its scoring start stays null.
  if (drawRound === "initial") {
    updateData.scoring_starts_at = null;
  }

  // When opening Round of 32 or Quarter Finals, set the scoring start time.
  // This means teams drawn in that round only count goals from this point onwards.
  if (nextIsOpen && drawRound !== "initial") {
    updateData.scoring_starts_at = new Date().toISOString();
  }

  // If locking a later round again, clear its scoring start time.
  if (!nextIsOpen && drawRound !== "initial") {
    updateData.scoring_starts_at = null;
  }

  await supabase
    .from("draw_round_settings")
    .update(updateData)
    .eq("draw_round", drawRound);

  await refreshPages();
}

export default async function AdminDrawRoundsPage() {
  const { data, error } = await supabase
    .from("draw_round_settings")
    .select("draw_round, label, is_open, sort_order, scoring_starts_at")
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-4">Admin: Draw Rounds</h1>
        <p className="text-red-600">Error loading draw rounds.</p>
        <pre className="mt-4 bg-gray-100 p-4 rounded">{error.message}</pre>
      </main>
    );
  }

  const drawRounds = (data ?? []) as DrawRoundSetting[];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Nav activePage="admin" />
        <AdminNav activePage="draw-rounds" />
        <AdminGameLinks />

        <h1 className="text-4xl font-bold mb-2">Admin: Draw Rounds</h1>
        <p className="mb-8 text-gray-600">
          Open or lock draw rounds. Players can only draw from open rounds.
          Later-round teams only count goals scored after that round opens.
        </p>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Draw round</th>
                <th className="p-4">Status</th>
                <th className="p-4">Scoring starts</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {drawRounds.map((round) => (
                <tr key={round.draw_round} className="border-t">
                  <td className="p-4 font-semibold">{round.label}</td>
                  <td className="p-4">
                    {round.is_open ? "Open" : "Locked"}
                  </td>
                  <td className="p-4 text-gray-600">
                    {round.scoring_starts_at
                      ? new Date(round.scoring_starts_at).toLocaleString()
                      : round.draw_round === "initial"
                        ? "Tournament start"
                        : "Not set yet"}
                  </td>
                  <td className="p-4">
                    <form action={toggleDrawRound}>
                      <input
                        type="hidden"
                        name="draw_round"
                        value={round.draw_round}
                      />
                      <input
                        type="hidden"
                        name="next_is_open"
                        value={round.is_open ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border px-3 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200"
                      >
                        {round.is_open ? "Lock" : "Open"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {drawRounds.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={4}>
                    No draw rounds found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Usual setup: Group Stage open at the start, then open Round of 32 and
          Quarter Finals later. Opening a later round sets its scoring start
          time.
        </p>
      </div>
    </main>
  );
}