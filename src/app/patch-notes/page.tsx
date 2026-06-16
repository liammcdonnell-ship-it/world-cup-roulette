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
];

export default function PatchNotesPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Nav activePage="patch-notes" />

        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Patch Notes</h1>
        <p className="mb-8 text-gray-600">
          A quick summary of what changed today, 16 June 2026.
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
