import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const userId = request.nextUrl.searchParams.get('userId') ?? undefined;
  const view = agilePulseStore.getSessionView(params.sessionId, userId);

  if (!view) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  return NextResponse.json(view, { status: 200 });
}
