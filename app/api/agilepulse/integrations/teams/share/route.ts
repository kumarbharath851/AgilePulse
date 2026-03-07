import { NextRequest, NextResponse } from 'next/server';

type TeamsShareBody = {
  teamName: string;
  sessionId: string;
  storyTitle: string;
  finalEstimate: string;
  consensusReached: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TeamsShareBody;

    if (!body.sessionId || !body.storyTitle || !body.finalEstimate) {
      return NextResponse.json(
        { error: 'sessionId, storyTitle and finalEstimate are required.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        status: 'queued',
        message: 'Prepared Teams Adaptive Card payload for channel share.',
        adaptiveCard: {
          type: 'AdaptiveCard',
          version: '1.5',
          body: [
            {
              type: 'TextBlock',
              weight: 'Bolder',
              text: `AgilePulse Estimate • ${body.teamName ?? 'Team'}`,
            },
            {
              type: 'TextBlock',
              text: `Story: ${body.storyTitle}`,
              wrap: true,
            },
            {
              type: 'TextBlock',
              text: `Final Point: ${body.finalEstimate} (${body.consensusReached ? 'consensus' : 'majority'})`,
              wrap: true,
            },
          ],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to prepare Teams share payload', error);
    return NextResponse.json({ error: 'Unable to share to Teams.' }, { status: 500 });
  }
}
