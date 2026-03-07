'use strict';

const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { randomUUID } = require('crypto');

const ddbClient = new DynamoDBClient({});
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;

const POKER_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '?', 'coffee'];
const NUMERIC_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21'];

// ── DynamoDB helpers ────────────────────────────────────────────────────────

async function getSessionFromDB(sessionId) {
  const result = await ddbClient.send(
    new GetItemCommand({
      TableName: SESSIONS_TABLE,
      Key: {
        sessionId: { S: sessionId },
        entityType: { S: 'SESSION' },
      },
    })
  );
  if (!result.Item) return undefined;
  return JSON.parse(result.Item.data.S);
}

async function saveSessionToDB(session) {
  await ddbClient.send(
    new PutItemCommand({
      TableName: SESSIONS_TABLE,
      Item: {
        sessionId: { S: session.sessionId },
        entityType: { S: 'SESSION' },
        data: { S: JSON.stringify(session) },
        teamName: { S: session.teamName },
        statusCreatedAt: { S: `${session.status}#${session.createdAt}` },
      },
    })
  );
}

// ── Room code generation ────────────────────────────────────────────────────

function generateRoomCode() {
  // Excludes visually ambiguous chars: 0, 1, I, O, L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part()}-${part()}`;
}

// ── Business logic ──────────────────────────────────────────────────────────

function createParticipant(displayName) {
  return {
    userId: `user-${randomUUID().slice(0, 8)}`,
    displayName,
    joinedAt: new Date().toISOString(),
  };
}

function numericValue(value) {
  if (!NUMERIC_VALUES.includes(value)) return null;
  return Number(value);
}

function summarizeVotes(votes, { anonymousVoting = false } = {}) {
  const distribution = {};
  POKER_VALUES.forEach((v) => { distribution[v] = 0; });
  votes.forEach((vote) => { distribution[vote.voteValue] += 1; });

  const numericVotes = votes
    .map((vote) => ({ userId: vote.userId, value: numericValue(vote.voteValue), raw: vote.voteValue }))
    .filter((entry) => entry.value !== null);

  const sorted = numericVotes.map((e) => e.value).sort((a, b) => a - b);
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
      : numericVotes.filter((e) => Math.abs(e.value - numericMedian) >= 5).map((e) => e.userId);

  const mostVoted = Object.entries(distribution)
    .filter((e) => e[1] > 0)
    .sort((a, b) => b[1] - a[1])[0];

  const consensusReached =
    sorted.length >= 3 &&
    numericSpread <= 3 &&
    ((mostVoted && mostVoted[1]) || 0) / Math.max(votes.length, 1) >= 0.6;

  const consensusValue = consensusReached && mostVoted ? mostVoted[0] : undefined;

  const breakdown = votes.map((vote, idx) => ({
    userId: vote.userId,
    displayName: anonymousVoting ? `Voter ${idx + 1}` : (vote.displayName || vote.userId),
    voteValue: vote.voteValue,
    isOutlier: outlierUserIds.includes(vote.userId),
  }));

  let discussionPrompt;
  if (outlierUserIds.length > 0) {
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    discussionPrompt = `Major vote difference detected: ${low} vs ${high}. Discuss complexity and unknown dependencies.`;
  } else if (numericSpread >= 3) {
    discussionPrompt = 'Estimate gap is moderate. Clarify assumptions and acceptance criteria before revote.';
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
    breakdown,
  };
}

// ── HTTP helpers ────────────────────────────────────────────────────────────

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
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function getPath(event) {
  const rawPath = event.rawPath || '/';
  return rawPath.replace(/\/+$/, '') || '/';
}

function getActiveStory(session) {
  return session.stories.find((story) => story.storyId === session.activeStoryId);
}

function getActiveVotes(session) {
  const activeStory = getActiveStory(session);
  if (!activeStory) return [];
  return session.votes.filter(
    (vote) => vote.storyId === activeStory.storyId && vote.roundNumber === session.currentRound
  );
}

// ── Route handler ───────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || 'GET';
  const path = getPath(event);
  const body = parseBody(event);

  if (method === 'OPTIONS') {
    return response(200, { ok: true });
  }

  // POST /agilepulse/sessions — create session
  if (method === 'POST' && path === '/agilepulse/sessions') {
    if (!body.teamName || !body.createdBy) {
      return response(400, { error: 'teamName and createdBy are required.' });
    }

    const sessionId = generateRoomCode();
    const owner = createParticipant(body.createdBy);

    const session = {
      sessionId,
      teamName: body.teamName,
      createdBy: body.createdBy,
      anonymousVoting: Boolean(body.anonymousVoting),
      status: 'lobby',
      createdAt: new Date().toISOString(),
      activeStoryId: undefined,
      timerState: undefined,
      participants: [owner],
      stories: [],
      votes: [],
      currentRound: 1,
      summaries: {},
    };

    await saveSessionToDB(session);

    return response(201, {
      sessionId: session.sessionId,
      teamName: session.teamName,
      createdBy: session.createdBy,
      status: session.status,
      createdAt: session.createdAt,
      participants: session.participants,
    });
  }

  // GET /agilepulse/sessions/:id — get session view
  const sessionMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)$/);
  if (method === 'GET' && sessionMatch) {
    const session = await getSessionFromDB(sessionMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    const userId = event.queryStringParameters?.userId;
    const activeStory = getActiveStory(session);
    const activeVotes = getActiveVotes(session);
    const summaryKey = activeStory ? `${activeStory.storyId}::${session.currentRound}` : undefined;
    const summary = summaryKey ? session.summaries[summaryKey] : undefined;
    const myVote = userId ? activeVotes.find((v) => v.userId === userId)?.voteValue : undefined;

    return response(200, {
      session: {
        sessionId: session.sessionId,
        teamName: session.teamName,
        createdBy: session.createdBy,
        anonymousVoting: Boolean(session.anonymousVoting),
        status: session.status,
        createdAt: session.createdAt,
        activeStoryId: session.activeStoryId,
        participants: session.participants,
        timerState: session.timerState,
      },
      stories: session.stories,
      activeStory,
      currentRound: session.currentRound,
      voteCount: activeVotes.length,
      myVote,
      summary,
      votedUserIds: activeVotes.map((v) => v.userId),
      participantCount: session.participants.length,
    });
  }

  // POST /agilepulse/sessions/:id/join
  const joinMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/join$/);
  if (method === 'POST' && joinMatch) {
    const session = await getSessionFromDB(joinMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }
    if (!body.displayName) {
      return response(400, { error: 'displayName is required.' });
    }

    const existing = session.participants.find(
      (p) => p.displayName.toLowerCase() === body.displayName.toLowerCase()
    );
    if (existing) {
      return response(200, existing);
    }

    const participant = createParticipant(body.displayName);
    session.participants.push(participant);
    await saveSessionToDB(session);
    return response(200, participant);
  }

  // POST /agilepulse/sessions/:id/stories
  const storiesMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/stories$/);
  if (method === 'POST' && storiesMatch) {
    const session = await getSessionFromDB(storiesMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }
    if (!body.title) {
      return response(400, { error: 'title is required.' });
    }

    const story = {
      storyId: `story-${randomUUID().slice(0, 8)}`,
      sessionId: session.sessionId,
      title: body.title,
      description: body.description || '',
      externalId: body.externalId,
      finalEstimate: undefined,
      orderIndex: session.stories.length,
    };

    session.stories.push(story);
    if (!session.activeStoryId) {
      session.activeStoryId = story.storyId;
      session.status = 'voting';
    }

    await saveSessionToDB(session);
    return response(201, story);
  }

  // POST /agilepulse/sessions/:id/stories/import-jira
  const importMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/stories\/import-jira$/);
  if (method === 'POST' && importMatch) {
    const session = await getSessionFromDB(importMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    const defaultIssues = [
      { key: 'CM-101', summary: 'Harden auth session controls', description: 'Add stricter token/session invalidation policies.' },
      { key: 'CM-102', summary: 'Threat model API surface', description: 'Document trust boundaries and abuse scenarios.' },
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

    await saveSessionToDB(session);
    return response(200, { importedCount: imported.length, stories: imported });
  }

  // POST /agilepulse/sessions/:id/votes
  const votesMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/votes$/);
  if (method === 'POST' && votesMatch) {
    const session = await getSessionFromDB(votesMatch[1]);
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
      (v) =>
        v.storyId === body.storyId &&
        v.userId === body.userId &&
        v.roundNumber === session.currentRound
    );

    const participant = session.participants.find((p) => p.userId === body.userId);
    const vote = {
      voteId: `vote-${randomUUID().slice(0, 8)}`,
      sessionId: session.sessionId,
      storyId: body.storyId,
      userId: body.userId,
      displayName: body.displayName || (participant ? participant.displayName : body.userId),
      voteValue: body.voteValue,
      roundNumber: session.currentRound,
      timestamp: new Date().toISOString(),
    };

    if (index >= 0) {
      session.votes[index] = vote;
    } else {
      session.votes.push(vote);
    }

    await saveSessionToDB(session);
    return response(201, vote);
  }

  // POST /agilepulse/sessions/:id/votes/reveal
  const revealMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/votes\/reveal$/);
  if (method === 'POST' && revealMatch) {
    const session = await getSessionFromDB(revealMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }
    if (!body.storyId) {
      return response(400, { error: 'storyId is required.' });
    }

    const votes = session.votes.filter(
      (v) => v.storyId === body.storyId && v.roundNumber === session.currentRound
    );

    const summary = summarizeVotes(votes, { anonymousVoting: Boolean(session.anonymousVoting) });
    session.status = 'revealed';
    session.timerState = undefined;
    session.summaries[`${body.storyId}::${session.currentRound}`] = summary;

    await saveSessionToDB(session);
    return response(200, { summary });
  }

  // POST /agilepulse/sessions/:id/round
  const roundMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/round$/);
  if (method === 'POST' && roundMatch) {
    const session = await getSessionFromDB(roundMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    session.currentRound += 1;
    session.status = 'voting';
    session.timerState = undefined;

    await saveSessionToDB(session);
    return response(200, { roundNumber: session.currentRound });
  }

  // POST /agilepulse/sessions/:id/finalize
  const finalizeMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/finalize$/);
  if (method === 'POST' && finalizeMatch) {
    const session = await getSessionFromDB(finalizeMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }
    if (!body.storyId || !body.finalEstimate) {
      return response(400, { error: 'storyId and finalEstimate are required.' });
    }

    const story = session.stories.find((s) => s.storyId === body.storyId);
    if (!story) {
      return response(404, { error: 'Story not found.' });
    }

    story.finalEstimate = body.finalEstimate;
    const next = session.stories.find((s) => !s.finalEstimate);
    if (next) {
      session.activeStoryId = next.storyId;
      session.currentRound = 1;
      session.status = 'voting';
    } else {
      session.activeStoryId = undefined;
      session.status = 'closed';
    }

    await saveSessionToDB(session);
    return response(200, { story });
  }

  // GET /agilepulse/sessions/:id/analytics
  const analyticsMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/analytics$/);
  if (method === 'GET' && analyticsMatch) {
    const session = await getSessionFromDB(analyticsMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    const summaries = Object.values(session.summaries);
    const consensusCount = summaries.filter((s) => s.consensusReached).length;
    const avgSpread = summaries.length
      ? Number((summaries.reduce((sum, s) => sum + s.numericSpread, 0) / summaries.length).toFixed(2))
      : 0;

    const estimateDistribution = POKER_VALUES.reduce((acc, v) => { acc[v] = 0; return acc; }, {});
    session.stories.forEach((story) => {
      if (story.finalEstimate) estimateDistribution[story.finalEstimate] += 1;
    });

    return response(200, {
      sessionId: session.sessionId,
      totalStories: session.stories.length,
      finalizedStories: session.stories.filter((s) => Boolean(s.finalEstimate)).length,
      consensusRate: summaries.length ? Number((consensusCount / summaries.length).toFixed(2)) : 0,
      avgSpread,
      estimateDistribution,
    });
  }

  // POST /agilepulse/sessions/:id/timer
  const timerMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/timer$/);
  if (method === 'POST' && timerMatch) {
    const session = await getSessionFromDB(timerMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }

    const durationSeconds = Number(body.durationSeconds);
    if (!durationSeconds || durationSeconds < 30 || durationSeconds > 600) {
      return response(400, { error: 'durationSeconds must be between 30 and 600.' });
    }

    const organizer = session.participants[0];
    if (!body.userId || !organizer || organizer.userId !== body.userId) {
      return response(403, { error: 'Only the session organizer can start the timer.' });
    }

    const now = new Date();
    const timerState = {
      startedAt: now.toISOString(),
      durationSeconds,
      expiresAt: new Date(now.getTime() + durationSeconds * 1000).toISOString(),
    };

    session.timerState = timerState;
    await saveSessionToDB(session);
    return response(200, { ok: true, timerState });
  }

  // POST /agilepulse/sessions/:id/active-story
  const activeStoryMatch = path.match(/^\/agilepulse\/sessions\/([^/]+)\/active-story$/);
  if (method === 'POST' && activeStoryMatch) {
    const session = await getSessionFromDB(activeStoryMatch[1]);
    if (!session) {
      return response(404, { error: 'Session not found.' });
    }
    if (!body.storyId) {
      return response(400, { error: 'storyId is required.' });
    }

    const story = session.stories.find((s) => s.storyId === body.storyId);
    if (!story) {
      return response(404, { error: 'Story not found.' });
    }

    session.activeStoryId = body.storyId;
    session.status = 'voting';
    session.currentRound = 1;

    await saveSessionToDB(session);
    return response(200, story);
  }

  // POST /agilepulse/ai/insights — proxy or heuristic
  if (method === 'POST' && path === '/agilepulse/ai/insights') {
    const { title, description, distribution, consensusReached, participantCount } = body;
    if (!distribution) {
      return response(400, { error: 'distribution is required.' });
    }

    // Heuristic fallback (Bedrock call omitted for simplicity — add if needed)
    const votes = Object.entries(distribution).flatMap(([val, count]) =>
      Array(Number(count)).fill(val)
    );
    const numericVotes = votes.map(Number).filter((v) => !isNaN(v) && isFinite(v));
    const spread = numericVotes.length
      ? Math.max(...numericVotes) - Math.min(...numericVotes)
      : 0;

    let riskLevel = 'low';
    let summary;
    let recommendation;
    const discussionPoints = [];

    if (consensusReached) {
      riskLevel = 'low';
      summary = `Strong consensus reached. The team aligned on an estimate, indicating shared understanding of the story.`;
      recommendation = 'Accept consensus and move forward. No further discussion needed.';
      discussionPoints.push('Are there any hidden risks the team may have overlooked?');
      discussionPoints.push('Does the acceptance criteria cover all edge cases?');
    } else if (spread >= 8) {
      riskLevel = 'high';
      summary = `High vote divergence detected (spread: ${spread}). The team has significantly different views on complexity or scope.`;
      recommendation = 'Do not finalize yet. Facilitate focused discussion to align on scope and unknowns.';
      discussionPoints.push('What assumptions are driving the high vs low estimates?');
      discussionPoints.push('Are there hidden dependencies or technical unknowns that need clarification?');
      discussionPoints.push('Should this story be broken down into smaller, more predictable pieces?');
    } else if (spread >= 3) {
      riskLevel = 'medium';
      summary = `Moderate vote divergence (spread: ${spread}). Some team members may have different interpretations of the story.`;
      recommendation = 'Discuss key assumptions before re-voting. A quick 5-minute discussion should align the team.';
      discussionPoints.push('What is the primary source of disagreement — scope, complexity, or risk?');
      discussionPoints.push('Are the acceptance criteria clear enough for everyone?');
    } else {
      riskLevel = 'low';
      summary = `Votes are converging (spread: ${spread}). The team has a shared understanding of the story.`;
      recommendation = 'Consider finalizing the estimate or taking one more vote to confirm consensus.';
      discussionPoints.push('Are there any remaining concerns before finalizing?');
    }

    return response(200, {
      summary,
      discussionPoints,
      riskLevel,
      recommendation,
      source: 'heuristic',
    });
  }

  return response(404, { error: 'Route not found.', method, path });
};
