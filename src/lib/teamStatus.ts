import { supabase } from "@/lib/supabase";

type TeamStatusRow = {
  id: number;
  is_eliminated: boolean;
};

export async function getTeamEliminationMap() {
  const { data } = await supabase.from("teams").select("id, is_eliminated");

  return new Map(
    ((data ?? []) as TeamStatusRow[]).map((team) => [
      team.id,
      team.is_eliminated,
    ])
  );
}
