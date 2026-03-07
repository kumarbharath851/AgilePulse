import { NextRequest, NextResponse } from 'next/server';
import { summarizeVotes } from '@/lib/agilepulse/consensus';
import { VoteRecord } from '@/lib/agilepulse/types';

type RevealVotesBody = {
  storyId: string;
  sessionId: string;
  roundNumber: number;
  votes: VoteRecord[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RevealVotesBody;

    if (!body.storyId || !body.sessionId || !Array.isArray(body.votes)) {
      return NextResponse.json(
        { error: 'storyId, sessionId, and votes are required.' },
        { status: 400 }
      );
    }

    const summary = summarizeVotes(body.votes);

    return NextResponse.json(
      {
        storyId: body.storyId,
        sessionId: body.sessionId,
        roundNumber: body.roundNumber,
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to reveal votes', error);
    return NextResponse.json({ error: 'Unable to reveal votes.' }, { status: 500 });
  }
}
