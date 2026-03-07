import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const analytics = agilePulseStore.getAnalytics(params.sessionId);

  if (!analytics) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  return NextResponse.json(analytics, { status: 200 });
}
