import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

type RevealBody = {
  storyId: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = (await request.json()) as RevealBody;

    if (!body.storyId) {
      return NextResponse.json({ error: 'storyId is required.' }, { status: 400 });
    }

    const summary = agilePulseStore.revealVotes(params.sessionId, body.storyId);

    if (!summary) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error('Failed to reveal votes', error);
    return NextResponse.json({ error: 'Unable to reveal votes.' }, { status: 500 });
  }
}
