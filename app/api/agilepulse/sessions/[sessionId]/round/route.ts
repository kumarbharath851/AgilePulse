import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

export async function POST(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const round = agilePulseStore.advanceRound(params.sessionId);

  if (!round) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  return NextResponse.json({ roundNumber: round }, { status: 200 });
}
