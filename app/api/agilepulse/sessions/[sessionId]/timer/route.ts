import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

type TimerBody = {
  durationSeconds: number;
  userId: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = (await request.json()) as TimerBody;

    if (!body.userId) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
    }

    const duration = Number(body.durationSeconds);
    if (!duration || duration < 90 || duration > 180) {
      return NextResponse.json({ error: 'durationSeconds must be between 90 and 180.' }, { status: 400 });
    }

    const session = agilePulseStore.getSession(params.sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    const organizer = session.participants[0];
    if (!organizer || organizer.userId !== body.userId) {
      return NextResponse.json({ error: 'Only the session organizer can start the timer.' }, { status: 403 });
    }

    const timerState = agilePulseStore.startTimer(params.sessionId, duration);
    if (!timerState) {
      return NextResponse.json({ error: 'Failed to start timer.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, timerState }, { status: 200 });
  } catch (error) {
    console.error('Failed to start timer', error);
    return NextResponse.json({ error: 'Unable to start timer.' }, { status: 500 });
  }
}
