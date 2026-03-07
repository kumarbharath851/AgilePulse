import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

type JoinSessionBody = {
  displayName: string;
  avatarUrl?: string;
  isObserver?: boolean;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = (await request.json()) as JoinSessionBody;

    if (!body.displayName) {
      return NextResponse.json({ error: 'displayName is required.' }, { status: 400 });
    }

    const participant = agilePulseStore.joinSession(
      params.sessionId,
      body.displayName,
      body.avatarUrl,
      Boolean(body.isObserver)
    );

    if (!participant) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json(participant, { status: 200 });
  } catch (error) {
    console.error('Failed to join session', error);
    return NextResponse.json({ error: 'Unable to join session.' }, { status: 500 });
  }
}
