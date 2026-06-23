export type TeamMatchRow = {
  home_team_id: number;
  away_team_id: number;
  status: string;
  kickoff_time: string | null;
};

export function countPlayedMatchesForTeam(
  matches: TeamMatchRow[],
  teamId: number,
  scoringStartsAt?: string | null
) {
  const scoringStartTime = scoringStartsAt
    ? new Date(scoringStartsAt).getTime()
    : null;

  return matches.filter((match) => {
    if (match.status !== "finished") {
      return false;
    }

    if (match.home_team_id !== teamId && match.away_team_id !== teamId) {
      return false;
    }

    if (!scoringStartTime) {
      return true;
    }

    if (!match.kickoff_time) {
      return false;
    }

    return new Date(match.kickoff_time).getTime() >= scoringStartTime;
  }).length;
}

export function formatGoalsInGames(goals: number, games: number) {
  return `${goals} in ${games}`;
}
