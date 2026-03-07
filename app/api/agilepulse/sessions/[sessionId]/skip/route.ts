import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

export async function POST(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const activeStoryId = agilePulseStore.skipStory(params.sessionId);
    if (activeStoryId === undefined && !agilePulseStore.getSession(params.sessionId)) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, activeStoryId: activeStoryId ?? null }, { status: 200 });
  } catch (error) {
    console.error('Failed to skip story', error);
    return NextResponse.json({ error: 'Unable to skip story.' }, { status: 500 });
  }
}
