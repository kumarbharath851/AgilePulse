export const PLANNING_POKER_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '?', 'coffee'] as const;

export type PlanningPokerValue = (typeof PLANNING_POKER_VALUES)[number];

export type SessionStatus = 'lobby' | 'voting' | 'revealed' | 'closed';

export type SessionEventType =
  | 'participant.joined'
  | 'story.added'
  | 'vote.submitted'
  | 'votes.revealed'
  | 'round.advanced'
  | 'story.finalized'
  | 'story.skipped'
  | 'session.ended'
  | 'timer.started'
  | 'all.voted';

export type TimerState = {
  startedAt: string;
  durationSeconds: number;
  expiresAt: string;
};

export type Participant = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
  isObserver?: boolean;
};

export type StoryItem = {
  storyId: string;
  sessionId: string;
  title: string;
  description: string;
  externalId?: string;
  finalEstimate?: PlanningPokerValue;
  orderIndex: number;
};

export type VoteRecord = {
  voteId: string;
  sessionId: string;
  storyId: string;
  userId: string;
  voteValue: PlanningPokerValue;
  roundNumber: number;
  timestamp: string;
};

export type Session = {
  sessionId: string;
  teamName: string;
  createdBy: string;
  status: SessionStatus;
  createdAt: string;
  activeStoryId?: string;
  participants: Participant[];
  timerState?: TimerState;
  anonymousVoting?: boolean;
};

export type VoteBreakdown = {
  userId: string;
  displayName: string;
  voteValue: PlanningPokerValue;
  isOutlier: boolean;
};

export type VoteSummary = {
  totalVotes: number;
  distribution: Record<PlanningPokerValue, number>;
  numericMedian: number | null;
  numericSpread: number;
  consensusReached: boolean;
  consensusValue?: PlanningPokerValue;
  outlierUserIds: string[];
  discussionPrompt?: string;
  breakdown: VoteBreakdown[];
};

export type SessionEvent = {
  eventId: string;
  sessionId: string;
  eventType: SessionEventType;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type SessionAnalytics = {
  sessionId: string;
  totalStories: number;
  finalizedStories: number;
  consensusRate: number;
  avgSpread: number;
  estimateDistribution: Record<PlanningPokerValue, number>;
};

export type SessionView = {
  session: Session;
  stories: StoryItem[];
  activeStory?: StoryItem;
  currentRound: number;
  voteCount: number;
  myVote?: PlanningPokerValue;
  summary?: VoteSummary;
  votedUserIds: string[];
  participantCount: number;
};
