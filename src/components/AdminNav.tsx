import Link from "next/link";

type AdminNavProps = {
  activePage:
    | "games"
    | "matches"
    | "players"
    | "teams"
    | "player-teams"
    | "draw-rounds";
};

export default function AdminNav({ activePage }: AdminNavProps) {
  const linkClass = (page: AdminNavProps["activePage"]) =>
    page === activePage ? "font-semibold underline" : "underline";

  return (
    <nav className="mb-8 flex gap-4 rounded-xl border bg-white p-4 shadow-sm">
      <Link href="/admin/games" className={linkClass("games")}>
        Games
      </Link>
      <Link href="/admin/matches" className={linkClass("matches")}>
        Matches
      </Link>
      <Link href="/admin/players" className={linkClass("players")}>
        Players
      </Link>
      <Link href="/admin/teams" className={linkClass("teams")}>
        Teams
      </Link>
      <Link href="/admin/player-teams" className={linkClass("player-teams")}>
        Player Teams
      </Link>
      <Link href="/admin/draw-rounds" className={linkClass("draw-rounds")}>
        Draw Rounds
      </Link>
    </nav>
  );
}