import Link from "next/link";

type AdminNavProps = {
  activePage:
    | "games"
    | "leaderboards"
    | "matches"
    | "players"
    | "teams"
    | "player-teams"
    | "draw-rounds";
};

export default function AdminNav({ activePage }: AdminNavProps) {
  const linkClass = (page: AdminNavProps["activePage"]) =>
    page === activePage
      ? "rounded-lg bg-gray-100 px-3 py-2 font-semibold underline"
      : "rounded-lg px-3 py-2 underline hover:bg-gray-100";

  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 text-sm shadow-sm sm:gap-4 sm:p-4 sm:text-base">
      <Link href="/admin/games" className={linkClass("games")}>
        Games
      </Link>
      <Link href="/admin/leaderboards" className={linkClass("leaderboards")}>
        Leaderboards
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
