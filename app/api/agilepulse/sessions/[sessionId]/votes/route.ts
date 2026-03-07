import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';
import { PlanningPokerValue } from '@/lib/agilepulse/types';

type SubmitVoteBody = {
  storyId: string;
  userId: string;
  voteValue: PlanningPokerValue;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = (await request.json()) as SubmitVoteBody;

    if (!body.storyId || !body.userId || !body.voteValue) {
      return NextResponse.json(
        { error: 'storyId, userId and voteValue are required.' },
        { status: 400 }
      );
    }

    const vote = agilePulseStore.submitVote(
      params.sessionId,
      body.storyId,
      body.userId,
      body.voteValue
    );

    if (!vote) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json(vote, { status: 201 });
  } catch (error) {
    console.error('Failed to submit vote', error);
    return NextResponse.json({ error: 'Unable to submit vote.' }, { status: 500 });
  }
}
