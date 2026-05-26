import Link from "next/link";

type NavProps = {
  activePage:
    | "leaderboard"
    | "games"
    | "team-totals"
    | "matches"
    | "rules"
    | "draw"
    | "admin";
};

export default function Nav({ activePage }: NavProps) {
  const linkClass = (page: NavProps["activePage"]) =>
    page === activePage ? "font-semibold underline" : "underline";

  return (
    <nav className="mb-8 flex flex-wrap gap-4">
      <Link href="/games" className={linkClass("games")}>
        Games
      </Link>
      <Link href="/team-totals" className={linkClass("team-totals")}>
        Team Totals
      </Link>
      <Link href="/matches" className={linkClass("matches")}>
        Matches
      </Link>
      <Link href="/rules" className={linkClass("rules")}>
        Rules
      </Link>
      <Link href="/admin/games" className={linkClass("admin")}>
        Admin
      </Link>
    </nav>
  );
}
