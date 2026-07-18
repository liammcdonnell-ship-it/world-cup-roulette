import Nav from "@/components/nav";

const changes = [
  {
    title: "Dark mode",
    details:
      "Added a dark mode toggle at the top of the app, with the choice remembered for next time.",
  },
  {
    title: "Cleaner admin on mobile",
    details:
      "Improved the admin navigation so it wraps properly and is easier to use on smaller screens.",
  },
  {
    title: "Merged admin leaderboard",
    details:
      "Added an admin view that combines all game leaderboards, shows which game each player belongs to, sorts by goals, and includes each player's teams.",
  },
  {
    title: "Payment clutter removed",
    details:
      "Removed paid/unpaid labels, payment columns, and the old payment emojis from player names. The prize pot remains visible.",
  },
  {
    title: "Score syncing improved",
    details:
      "Added backup morning score refreshes and extra match-finish checks so knockout games can update after normal time, extra time, or penalties.",
  },
  {
    title: "Shootouts and eliminations fixed",
    details:
      "Score sync now ignores penalty shootout goals for player totals but still uses the knockout winner to mark the losing team as eliminated.",
  },
  {
    title: "Team fixture pages",
    details:
      "Team names now link to fixture pages showing that team's scheduled and completed matches, plus which players drew them.",
  },
  {
    title: "Cleaner team displays",
    details:
      "Removed country codes from the main leaderboard and match screens, and made eliminated teams show in red without blending into bust player rows.",
  },
  {
    title: "Player match pages",
    details:
      "Personal match pages now show the player's current goal total as well as the fixtures for their drawn teams.",
  },
  {
    title: "Round of 32 announcement",
    details:
      "When the Round of 32 draw opens, leaderboard pages will clearly explain that players may optionally draw a fourth team and should think carefully before doing so.",
  },
  {
    title: "Share leaderboard image",
    details:
      "Added a Share leaderboard button that creates an image of the current leaderboard, ready to download or share into WhatsApp.",
  },
  {
    title: "Goals now show games played",
    details:
      "Country goal totals now show how many games they came from, for example 7 in 4. This appears on leaderboards, admin leaderboards, team totals, and the share image.",
  },
  {
    title: "Share image made more compact",
    details:
      "The leaderboard share image now uses each country's flag, country code, goals, and games played instead of long country names. The country area has been widened so this information is easier to read in WhatsApp.",
  },
  {
    title: "Player standings across games",
    details:
      "Player names now open a standings page showing every game that player appears in, including their current goals and drawn teams for each game.",
  },
  {
    title: "Later draw protection",
    details:
      "Tightened manual team assignment so eliminated teams cannot be added to later-round draws by mistake.",
  },
  {
    title: "Third-place playoff teams highlighted",
    details:
      "Semi-final losers who still have the third-place playoff to play now show in purple instead of red, including on shared leaderboard images, because their remaining goals still count.",
  },
  {
    title: "Live provisional leaderboard scoring",
    details:
      "During match windows, leaderboards can include clearly marked provisional live goals after each scheduled score sync until the final score is confirmed.",
  },
];

export default function PatchNotesPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Nav activePage="patch-notes" />

        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Patch Notes</h1>
        <p className="mb-8 text-gray-600">
          A quick summary of the latest app changes.
        </p>

        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b bg-gray-100 p-4">
            <h2 className="text-xl font-bold">Today&apos;s updates</h2>
          </div>

          <div className="divide-y">
            {changes.map((change) => (
              <section key={change.title} className="p-4 sm:p-5">
                <h3 className="mb-1 font-bold text-gray-950">
                  {change.title}
                </h3>
                <p className="text-gray-600">{change.details}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
