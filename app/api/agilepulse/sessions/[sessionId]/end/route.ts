import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

export async function POST(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const ok = agilePulseStore.endSession(params.sessionId);
    if (!ok) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status: 'closed' }, { status: 200 });
  } catch (error) {
    console.error('Failed to end session', error);
    return NextResponse.json({ error: 'Unable to end session.' }, { status: 500 });
  }
}
