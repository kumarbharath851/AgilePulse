import { v4 as uuidv4 } from 'uuid';
import { summarizeVotes } from '@/lib/agilepulse/consensus';
import {
  Participant,
  PlanningPokerValue,
  Session,
  SessionAnalytics,
  SessionEvent,
  SessionStatus,
  SessionView,
  StoryItem,
  TimerState,
  VoteBreakdown,
  VoteRecord,
  VoteSummary,
} from '@/lib/agilepulse/types';

type SessionState = {
  session: Session;
  stories: StoryItem[];
  votes: VoteRecord[];
  currentRound: number;
  summaryByStoryRound: Map<string, VoteSummary>;
  events: SessionEvent[];
};

type StoreState = {
  sessions: Map<string, SessionState>;
  subscribers: Map<string, Set<(event: SessionEvent) => void>>;
};

const storeKey = '__agilepulse_store__';

function getStore(): StoreState {
  const globalRef = globalThis as typeof globalThis & {
    [storeKey]?: StoreState;
  };

  if (!globalRef[storeKey]) {
    globalRef[storeKey] = {
      sessions: new Map(),
      subscribers: new Map(),
    };
  }

  return globalRef[storeKey]!;
}

function emitEvent(sessionId: string, eventType: SessionEvent['eventType'], payload: Record<string, unknown>) {
  const store = getStore();
  const state = store.sessions.get(sessionId);

  if (!state) {
    return;
  }

  const event: SessionEvent = {
    eventId: `evt-${uuidv4().slice(0, 8)}`,
    sessionId,
    eventType,
    payload,
    timestamp: new Date().toISOString(),
  };

  state.events.push(event);

  const listeners = store.subscribers.get(sessionId);
  listeners?.forEach((listener) => listener(event));
}

function createParticipant(displayName: string, avatarUrl?: string): Participant {
  return {
    userId: `user-${uuidv4().slice(0, 8)}`,
    displayName,
    avatarUrl,
    joinedAt: new Date().toISOString(),
  };
}

function voteSummaryKey(storyId: string, round: number): string {
  return `${storyId}::${round}`;
}

function getCurrentStory(state: SessionState): StoryItem | undefined {
  return state.stories.find((story) => story.storyId === state.session.activeStoryId);
}

function getVotesForActiveStory(state: SessionState): VoteRecord[] {
  const activeStory = getCurrentStory(state);

  if (!activeStory) {
    return [];
  }

  return state.votes.filter(
    (vote) =>
      vote.storyId === activeStory.storyId &&
      vote.roundNumber === state.currentRound
  );
}

function generateRoomCode(): string {
  // Excludes visually ambiguous characters: 0, 1, I, O, L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}`;
}

function createSession(teamName: string, createdBy: string): Session {
  const store = getStore();
  const sessionId = generateRoomCode();
  const scrumMaster = createParticipant(createdBy);

  const session: Session = {
    sessionId,
    teamName,
    createdBy,
    status: 'lobby',
    createdAt: new Date().toISOString(),
    participants: [scrumMaster],
  };

  const state: SessionState = {
    session,
    stories: [],
    votes: [],
    currentRound: 1,
    summaryByStoryRound: new Map(),
    events: [],
  };

  store.sessions.set(sessionId, state);

  return session;
}

function getSessionState(sessionId: string): SessionState | undefined {
  return getStore().sessions.get(sessionId);
}

function getSession(sessionId: string): Session | undefined {
  return getSessionState(sessionId)?.session;
}

function joinSession(sessionId: string, displayName: string, avatarUrl?: string): Participant | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  const existing = state.session.participants.find(
    (participant) => participant.displayName.toLowerCase() === displayName.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  const participant = createParticipant(displayName, avatarUrl);
  state.session.participants.push(participant);

  emitEvent(sessionId, 'participant.joined', {
    userId: participant.userId,
    displayName: participant.displayName,
    avatarUrl: participant.avatarUrl,
  });

  return participant;
}

function addStory(
  sessionId: string,
  input: Pick<StoryItem, 'title' | 'description' | 'externalId'>
): StoryItem | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  const story: StoryItem = {
    storyId: `story-${uuidv4().slice(0, 8)}`,
    sessionId,
    title: input.title,
    description: input.description,
    externalId: input.externalId,
    orderIndex: state.stories.length,
  };

  state.stories.push(story);

  if (!state.session.activeStoryId) {
    state.session.activeStoryId = story.storyId;
    state.session.status = 'voting';
  }

  emitEvent(sessionId, 'story.added', {
    storyId: story.storyId,
    title: story.title,
  });

  return story;
}

function importJiraStories(
  sessionId: string,
  stories: Array<Pick<StoryItem, 'title' | 'description' | 'externalId'>>
): StoryItem[] {
  return stories
    .map((story) => addStory(sessionId, story))
    .filter((story): story is StoryItem => Boolean(story));
}

function setActiveStory(sessionId: string, storyId: string): StoryItem | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  const story = state.stories.find((entry) => entry.storyId === storyId);

  if (!story) {
    return undefined;
  }

  state.session.activeStoryId = storyId;
  state.session.status = 'voting';
  state.currentRound = 1;

  return story;
}

function submitVote(
  sessionId: string,
  storyId: string,
  userId: string,
  voteValue: PlanningPokerValue
): VoteRecord | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  const existingIndex = state.votes.findIndex(
    (vote) =>
      vote.sessionId === sessionId &&
      vote.storyId === storyId &&
      vote.userId === userId &&
      vote.roundNumber === state.currentRound
  );

  const vote: VoteRecord = {
    voteId: `vote-${uuidv4().slice(0, 8)}`,
    sessionId,
    storyId,
    userId,
    voteValue,
    roundNumber: state.currentRound,
    timestamp: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    state.votes[existingIndex] = vote;
  } else {
    state.votes.push(vote);
  }

  emitEvent(sessionId, 'vote.submitted', {
    storyId,
    userId,
    roundNumber: state.currentRound,
  });

  // Check if all participants have voted for this story/round
  const currentVotes = state.votes.filter(
    (v) => v.storyId === storyId && v.roundNumber === state.currentRound
  );
  const allVoted = state.session.participants.length > 0 &&
    currentVotes.length >= state.session.participants.length;

  if (allVoted) {
    emitEvent(sessionId, 'all.voted', {
      storyId,
      roundNumber: state.currentRound,
      voteCount: currentVotes.length,
    });
  }

  return vote;
}

function revealVotes(sessionId: string, storyId: string): VoteSummary | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  const votes = state.votes.filter(
    (vote) => vote.storyId === storyId && vote.roundNumber === state.currentRound
  );

  const summary = summarizeVotes(votes);

  const breakdown: VoteBreakdown[] = votes.map((vote) => {
    const participant = state.session.participants.find((p) => p.userId === vote.userId);
    return {
      userId: vote.userId,
      displayName: participant?.displayName ?? vote.userId,
      voteValue: vote.voteValue,
      isOutlier: summary.outlierUserIds.includes(vote.userId),
    };
  });

  const summaryWithBreakdown: VoteSummary = { ...summary, breakdown };

  state.session.status = 'revealed';
  state.session.timerState = undefined;
  state.summaryByStoryRound.set(voteSummaryKey(storyId, state.currentRound), summaryWithBreakdown);

  emitEvent(sessionId, 'votes.revealed', {
    storyId,
    roundNumber: state.currentRound,
    consensusReached: summaryWithBreakdown.consensusReached,
    outlierUserIds: summaryWithBreakdown.outlierUserIds,
  });

  return summaryWithBreakdown;
}

function advanceRound(sessionId: string): number | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  state.currentRound += 1;
  state.session.status = 'voting';
  state.session.timerState = undefined;

  emitEvent(sessionId, 'round.advanced', {
    roundNumber: state.currentRound,
  });

  return state.currentRound;
}

function finalizeStory(sessionId: string, storyId: string, finalEstimate: PlanningPokerValue): StoryItem | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  const story = state.stories.find((entry) => entry.storyId === storyId);

  if (!story) {
    return undefined;
  }

  story.finalEstimate = finalEstimate;

  const nextStory = state.stories.find((entry) => !entry.finalEstimate);
  if (nextStory) {
    state.session.activeStoryId = nextStory.storyId;
    state.currentRound = 1;
    state.session.status = 'voting';
  } else {
    state.session.activeStoryId = undefined;
    state.session.status = 'closed';
  }

  emitEvent(sessionId, 'story.finalized', {
    storyId,
    finalEstimate,
  });

  return story;
}

function getSessionView(sessionId: string, userId?: string): SessionView | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  const activeStory = getCurrentStory(state);
  const activeVotes = getVotesForActiveStory(state);
  const summary = activeStory
    ? state.summaryByStoryRound.get(voteSummaryKey(activeStory.storyId, state.currentRound))
    : undefined;

  const myVote = userId
    ? activeVotes.find((vote) => vote.userId === userId)?.voteValue
    : undefined;

  return {
    session: state.session,
    stories: state.stories,
    activeStory,
    currentRound: state.currentRound,
    voteCount: activeVotes.length,
    myVote,
    summary,
    votedUserIds: activeVotes.map((vote) => vote.userId),
    participantCount: state.session.participants.length,
  };
}

function getAnalytics(sessionId: string): SessionAnalytics | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  const finalized = state.stories.filter((story) => Boolean(story.finalEstimate));
  const summaries = Array.from(state.summaryByStoryRound.values());
  const consensusCount = summaries.filter((entry) => entry.consensusReached).length;
  const avgSpread = summaries.length
    ? Number((summaries.reduce((sum, entry) => sum + entry.numericSpread, 0) / summaries.length).toFixed(2))
    : 0;

  const estimateDistribution = state.stories.reduce(
    (acc, story) => {
      if (story.finalEstimate) {
        acc[story.finalEstimate] += 1;
      }
      return acc;
    },
    {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '5': 0,
      '8': 0,
      '13': 0,
      '21': 0,
      '?': 0,
      coffee: 0,
    } as SessionAnalytics['estimateDistribution']
  );

  return {
    sessionId,
    totalStories: state.stories.length,
    finalizedStories: finalized.length,
    consensusRate: summaries.length ? Number((consensusCount / summaries.length).toFixed(2)) : 0,
    avgSpread,
    estimateDistribution,
  };
}

function startTimer(sessionId: string, durationSeconds: number): TimerState | undefined {
  const state = getSessionState(sessionId);

  if (!state) {
    return undefined;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationSeconds * 1000);

  const timerState: TimerState = {
    startedAt: now.toISOString(),
    durationSeconds,
    expiresAt: expiresAt.toISOString(),
  };

  state.session.timerState = timerState;

  emitEvent(sessionId, 'timer.started', {
    startedAt: timerState.startedAt,
    durationSeconds,
    expiresAt: timerState.expiresAt,
  });

  return timerState;
}

function subscribe(sessionId: string, callback: (event: SessionEvent) => void): () => void {
  const store = getStore();
  const listeners = store.subscribers.get(sessionId) ?? new Set<(event: SessionEvent) => void>();

  listeners.add(callback);
  store.subscribers.set(sessionId, listeners);

  return () => {
    const activeListeners = store.subscribers.get(sessionId);
    activeListeners?.delete(callback);

    if (activeListeners && activeListeners.size === 0) {
      store.subscribers.delete(sessionId);
    }
  };
}

export const agilePulseStore = {
  createSession,
  getSession,
  getSessionView,
  joinSession,
  addStory,
  importJiraStories,
  setActiveStory,
  submitVote,
  revealVotes,
  advanceRound,
  finalizeStory,
  getAnalytics,
  startTimer,
  subscribe,
};
