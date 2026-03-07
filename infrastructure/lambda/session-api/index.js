const { randomUUID } = require('crypto');

const POKER_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '?', 'coffee'];
const NUMERIC_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21'];

const store = global.__agilePulseStore || {
  sessions: new Map(),
};

global.__agilePulseStore = store;

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    },
    body: JSON.stringify(payload),
  };
}

function parseBody(event) {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function createParticipant(displayName) {
  return {
    userId: `user-${randomUUID().slice(0, 8)}`,
    displayName,
    joinedAt: new Date().toISOString(),
  };
}

function createSession(teamName, createdBy) {
  const sessionId = `session-${randomUUID().slice(0, 8)}`;
  const owner = createParticipant(createdBy);

  const session = {
    sessionId,
    teamName,
    createdBy,
    status: 'lobby',
    createdAt: new Date().toISOString(),
    activeStoryId: undefined,
    participants: [owner],
    stories: [],
    votes: [],
    currentRound: 1,
    summaries: {},
  };

  store.sessions.set(sessionId, session);
  return session;
}

function numericValue(value) {
  if (!NUMERIC_VALUES.includes(value)) {
    return null;
  }
  return Number(value);
}

function summarizeVotes(votes) {
  const distribution = {};
  POKER_VALUES.forEach((value) => {
    distribution[value] = 0;
  });

  votes.forEach((vote) => {
    distribution[vote.voteValue] += 1;
  });

  const numericVotes = votes
    .map((vote) => ({ userId: vote.userId, value: numericValue(vote.voteValue), raw: vote.voteValue }))
    .filter((entry) => entry.value !== null);

  const sorted = numericVotes.map((entry) => entry.value).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const numericMedian =
    sorted.length === 0
      ? null
      : sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];

  const minValue = sorted.length ? sorted[0] : 0;
  const maxValue = sorted.length ? sorted[sorted.length - 1] : 0;
  const numericSpread = sorted.length ? maxValue - minValue : 0;

  const outlierUserIds =
    numericMedian === null
      ? []
      : numericVotes
          .filter((entry) => Math.abs(entry.value - numericMedian) >= 5)
          .map((entry) => entry.userId);

  const mostVoted = Object.entries(distribution)
    .filter((entry) => entry[1] > 0)
    .sort((a, b) => b[1] - a[1])[0];

  const consensusReached =
    sorted.length >= 3 &&
    numericSpread <= 3 &&
    ((mostVoted && mostVoted[1]) || 0) / Math.max(votes.length, 1) >= 0.6;

  const consensusValue = consensusReached && mostVoted ? mostVoted[0] : undefined;

  let discussionPrompt;
  if (outlierUserIds.length > 0) {
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    discussionPrompt = `Major vote difference detected: ${low} vs ${high}. Discuss complexity and unknown dependencies.`;
  } else if (numericSpread >= 3) {
    discussionPrompt =
      'Estimate gap is moderate. Clarify assumptions and acceptance criteria before revote.';
  } else if (votes.length > 0) {
    discussionPrompt = 'Votes are converging. Confirm scope and finalize if risks are addressed.';
  }

  return {
    totalVotes: votes.length,
    distribution,
    numericMedian,
    numericSpread,
    consensusReached,
    consensusValue,
    outlierUserIds,
    discussionPrompt,
  };
}

function getSession(sessionId) {
  return store.sessions.get(sessionId);
}

function getPath(event) {
  const rawPath = event.rawPath || '/';
  return rawPath.replace(/\/+$/, '') || '/';
}

function getActiveStory(session) {
  return session.stories.find((story) => story.storyId === session.activeStoryId);
}

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || 'GET';
  const path = getPath(event);
  const body = parseBody(event);

  if (method === 'OPTIONS') {
    return response(200, { ok: true });
  }

  if (method === 'POST' && path === '/agilepulse/sessions') {
    if (!body.teamName || !body.createdBy) {
      return response(400, { error: 'teamName and createdBy are required.' });
    }

    const session = createSession(body.teamName, body.createdBy);
    return response(201, {
      sessionId: session.sessionId,
      teamName: session.teamName,
      createdBy: session.createdBy,
      status: session.status,
      createdAt: session.createdAt,
      participants: session.participants,
      joinUrl: `/agilepulse?sessionId=${session.sessionId}`,
    });
  }

  const sessionMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)$/);
  if (method === 'GET' && sessionMatch) {
    const session = getSession(sessionMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    const userId = event.queryStringParameters?.userId;
    const activeStory = getActiveStory(session);
    const activeVotes = activeStory
      ? session.votes.filter(
          (vote) => vote.storyId === activeStory.storyId && vote.roundNumber === session.currentRound
        )
      : [];

    const summary = activeStory
      ? session.summaries[`${activeStory.storyId}::${session.currentRound}`]
      : undefined;

    const myVote = userId
      ? activeVotes.find((vote) => vote.userId === userId)?.voteValue
      : undefined;

    return response(200, {
      session: {
        sessionId: session.sessionId,
        teamName: session.teamName,
        createdBy: session.createdBy,
        status: session.status,
        createdAt: session.createdAt,
        activeStoryId: session.activeStoryId,
        participants: session.participants,
      },
      stories: session.stories,
      activeStory,
      currentRound: session.currentRound,
      voteCount: activeVotes.length,
      myVote,
      summary,
    });
  }

  const joinMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/join$/);
  if (method === 'POST' && joinMatch) {
    const session = getSession(joinMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    if (!body.displayName) {
      return response(400, { error: 'displayName is required.' });
    }

    const existing = session.participants.find(
      (entry) => entry.displayName.toLowerCase() === body.displayName.toLowerCase()
    );
    if (existing) {
      return response(200, existing);
    }

    const participant = createParticipant(body.displayName);
    session.participants.push(participant);
    return response(200, participant);
  }

  const storiesMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/stories$/);
  if (method === 'POST' && storiesMatch) {
    const session = getSession(storiesMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    if (!body.title || !body.description) {
      return response(400, { error: 'title and description are required.' });
    }

    const story = {
      storyId: `story-${randomUUID().slice(0, 8)}`,
      sessionId: session.sessionId,
      title: body.title,
      description: body.description,
      externalId: body.externalId,
      finalEstimate: undefined,
      orderIndex: session.stories.length,
    };

    session.stories.push(story);
    if (!session.activeStoryId) {
      session.activeStoryId = story.storyId;
      session.status = 'voting';
    }

    return response(201, story);
  }

  const importMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/stories\/import-jira$/);
  if (method === 'POST' && importMatch) {
    const session = getSession(importMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    const defaultIssues = [
      {
        key: 'CM-101',
        summary: 'Harden auth session controls',
        description: 'Add stricter token/session invalidation policies.',
      },
      {
        key: 'CM-102',
        summary: 'Threat model API surface',
        description: 'Document trust boundaries and abuse scenarios.',
      },
    ];

    const issues = Array.isArray(body.issues) && body.issues.length > 0 ? body.issues : defaultIssues;
    const imported = issues.map((issue, index) => ({
      storyId: `story-${randomUUID().slice(0, 8)}`,
      sessionId: session.sessionId,
      title: issue.summary || `Imported story ${index + 1}`,
      description: issue.description || 'Imported from Jira.',
      externalId: issue.key,
      finalEstimate: undefined,
      orderIndex: session.stories.length + index,
    }));

    imported.forEach((story) => session.stories.push(story));
    if (!session.activeStoryId && imported[0]) {
      session.activeStoryId = imported[0].storyId;
      session.status = 'voting';
    }

    return response(200, { importedCount: imported.length, stories: imported });
  }

  const votesMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/votes$/);
  if (method === 'POST' && votesMatch) {
    const session = getSession(votesMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    if (!body.storyId || !body.userId || !body.voteValue) {
      return response(400, { error: 'storyId, userId and voteValue are required.' });
    }

    if (!POKER_VALUES.includes(body.voteValue)) {
      return response(400, { error: 'Invalid planning poker value.' });
    }

    const index = session.votes.findIndex(
      (vote) =>
        vote.storyId === body.storyId &&
        vote.userId === body.userId &&
        vote.roundNumber === session.currentRound
    );

    const vote = {
      voteId: `vote-${randomUUID().slice(0, 8)}`,
      sessionId: session.sessionId,
      storyId: body.storyId,
      userId: body.userId,
      voteValue: body.voteValue,
      roundNumber: session.currentRound,
      timestamp: new Date().toISOString(),
    };

    if (index >= 0) {
      session.votes[index] = vote;
    } else {
      session.votes.push(vote);
    }

    return response(201, vote);
  }

  const revealMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/votes\/reveal$/);
  if (method === 'POST' && revealMatch) {
    const session = getSession(revealMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    if (!body.storyId) {
      return response(400, { error: 'storyId is required.' });
    }

    const votes = session.votes.filter(
      (vote) => vote.storyId === body.storyId && vote.roundNumber === session.currentRound
    );

    const summary = summarizeVotes(votes);
    session.status = 'revealed';
    session.summaries[`${body.storyId}::${session.currentRound}`] = summary;

    return response(200, { summary });
  }

  const roundMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/round$/);
  if (method === 'POST' && roundMatch) {
    const session = getSession(roundMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    session.currentRound += 1;
    session.status = 'voting';
    return response(200, { roundNumber: session.currentRound });
  }

  const finalizeMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/finalize$/);
  if (method === 'POST' && finalizeMatch) {
    const session = getSession(finalizeMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    if (!body.storyId || !body.finalEstimate) {
      return response(400, { error: 'storyId and finalEstimate are required.' });
    }

    const story = session.stories.find((entry) => entry.storyId === body.storyId);
    if (!story) {
      return response(404, { error: 'Story not found.' });
    }

    story.finalEstimate = body.finalEstimate;
    const next = session.stories.find((entry) => !entry.finalEstimate);
    if (next) {
      session.activeStoryId = next.storyId;
      session.currentRound = 1;
      session.status = 'voting';
    } else {
      session.activeStoryId = undefined;
      session.status = 'closed';
    }

    return response(200, { story });
  }

  const analyticsMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/analytics$/);
  if (method === 'GET' && analyticsMatch) {
    const session = getSession(analyticsMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    const summaries = Object.values(session.summaries);
    const consensusCount = summaries.filter((entry) => entry.consensusReached).length;
    const avgSpread = summaries.length
      ? Number((summaries.reduce((sum, entry) => sum + entry.numericSpread, 0) / summaries.length).toFixed(2))
      : 0;

    const estimateDistribution = POKER_VALUES.reduce((acc, value) => {
      acc[value] = 0;
      return acc;
    }, {});

    session.stories.forEach((story) => {
      if (story.finalEstimate) {
        estimateDistribution[story.finalEstimate] += 1;
      }
    });

    const analytics = {
      sessionId: session.sessionId,
      totalStories: session.stories.length,
      finalizedStories: session.stories.filter((story) => Boolean(story.finalEstimate)).length,
      consensusRate: summaries.length ? Number((consensusCount / summaries.length).toFixed(2)) : 0,
      avgSpread,
      estimateDistribution,
    };

    return response(200, analytics);
  }

  return response(404, {
    error: 'Route not found.',
    method,
    path,
  });
};
