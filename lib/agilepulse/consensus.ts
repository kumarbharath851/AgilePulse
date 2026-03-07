import { PLANNING_POKER_VALUES, PlanningPokerValue, VoteRecord, VoteSummary } from '@/lib/agilepulse/types';

const NUMERIC_ORDER: PlanningPokerValue[] = ['0', '1', '2', '3', '5', '8', '13', '21'];

const asNumeric = (value: PlanningPokerValue): number | null => {
  if (!NUMERIC_ORDER.includes(value)) {
    return null;
  }

  return Number(value);
};

export function summarizeVotes(votes: VoteRecord[]): VoteSummary {
  const distribution = Object.fromEntries(
    PLANNING_POKER_VALUES.map((value) => [value, 0])
  ) as Record<PlanningPokerValue, number>;

  votes.forEach((vote) => {
    distribution[vote.voteValue] += 1;
  });

  const numericVotes = votes
    .map((vote) => ({ userId: vote.userId, value: asNumeric(vote.voteValue), raw: vote.voteValue }))
    .filter((entry): entry is { userId: string; value: number; raw: PlanningPokerValue } => entry.value !== null);

  const sorted = numericVotes.map((entry) => entry.value).sort((a, b) => a - b);
  const mid = sorted.length > 0 ? Math.floor(sorted.length / 2) : -1;
  const numericMedian =
    sorted.length === 0
      ? null
      : sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

  const minValue = sorted.length ? sorted[0] : 0;
  const maxValue = sorted.length ? sorted[sorted.length - 1] : 0;
  const numericSpread = sorted.length ? maxValue - minValue : 0;

  const outlierUserIds =
    numericMedian === null
      ? []
      : numericVotes
          .filter((entry) => Math.abs(entry.value - numericMedian) >= 5)
          .map((entry) => entry.userId);

  const mostVotedEntry = Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])[0];

  const consensusReached =
    sorted.length >= 3 &&
    numericSpread <= 3 &&
    (mostVotedEntry?.[1] ?? 0) / Math.max(votes.length, 1) >= 0.6;

  const consensusValue = consensusReached
    ? (mostVotedEntry?.[0] as PlanningPokerValue | undefined)
    : undefined;

  const discussionPrompt = buildDiscussionPrompt({ numericSpread, outlierUserIds, votes });

  return {
    totalVotes: votes.length,
    distribution,
    numericMedian,
    numericSpread,
    consensusReached,
    consensusValue,
    outlierUserIds,
    discussionPrompt,
    breakdown: [],
  };
}

function buildDiscussionPrompt(input: {
  numericSpread: number;
  outlierUserIds: string[];
  votes: VoteRecord[];
}): string | undefined {
  if (input.votes.length === 0) {
    return undefined;
  }

  if (input.outlierUserIds.length > 0) {
    const sorted = input.votes
      .map((vote) => ({ value: asNumeric(vote.voteValue), raw: vote.voteValue }))
      .filter((item): item is { value: number; raw: PlanningPokerValue } => item.value !== null)
      .sort((a, b) => a.value - b.value);

    const lowest = sorted[0]?.raw;
    const highest = sorted[sorted.length - 1]?.raw;

    return `Major vote difference detected: ${lowest} vs ${highest}. Discuss complexity, dependencies, and unknown implementation paths.`;
  }

  if (input.numericSpread >= 3) {
    return 'Estimate gap is still moderate. Clarify assumptions around scope, testing effort, and edge-case handling before revoting.';
  }

  return 'Votes are converging. Confirm acceptance criteria and finalize estimate if no hidden risks remain.';
}
