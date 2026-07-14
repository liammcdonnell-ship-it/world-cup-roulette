export type TeamMatchRow = {
  home_team_id: number;
  away_team_id: number;
  home_goals?: number | null;
  away_goals?: number | null;
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

function isAfterScoringStart(
  kickoffTime: string | null,
  scoringStartsAt?: string | null
) {
  if (!scoringStartsAt) {
    return true;
  }

  if (!kickoffTime) {
    return false;
  }

  return new Date(kickoffTime).getTime() >= new Date(scoringStartsAt).getTime();
}

export function getLiveGoalsForTeam(
  matches: TeamMatchRow[],
  teamId: number,
  scoringStartsAt?: string | null
) {
  return matches.reduce((total, match) => {
    if (match.status !== "live") {
      return total;
    }

    if (!isAfterScoringStart(match.kickoff_time, scoringStartsAt)) {
      return total;
    }

    if (match.home_team_id === teamId) {
      return total + (match.home_goals ?? 0);
    }

    if (match.away_team_id === teamId) {
      return total + (match.away_goals ?? 0);
    }

    return total;
  }, 0);
}
