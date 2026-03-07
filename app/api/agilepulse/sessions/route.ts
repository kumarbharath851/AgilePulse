import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

type CreateSessionBody = {
  teamName: string;
  createdBy: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSessionBody;

    if (!body.teamName || !body.createdBy) {
      return NextResponse.json(
        { error: 'teamName and createdBy are required.' },
        { status: 400 }
      );
    }

    const session = agilePulseStore.createSession(body.teamName, body.createdBy);

    return NextResponse.json(
      {
        ...session,
        joinUrl: `/agilepulse?sessionId=${session.sessionId}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create AgilePulse session', error);
    return NextResponse.json({ error: 'Unable to create session.' }, { status: 500 });
  }
}
