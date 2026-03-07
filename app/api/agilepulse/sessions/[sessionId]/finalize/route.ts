import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';
import { PlanningPokerValue } from '@/lib/agilepulse/types';
import { syncEstimateToJira } from '@/lib/agilepulse/jira-integration';

type FinalizeBody = {
  storyId: string;
  finalEstimate: PlanningPokerValue;
  jira?: {
    baseUrl: string;
    email: string;
    apiToken: string;
    issueKey: string;
    storyPointsFieldId: string;
  };
};

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = (await request.json()) as FinalizeBody;

    if (!body.storyId || !body.finalEstimate) {
      return NextResponse.json({ error: 'storyId and finalEstimate are required.' }, { status: 400 });
    }

    const story = agilePulseStore.finalizeStory(params.sessionId, body.storyId, body.finalEstimate);

    if (!story) {
      return NextResponse.json({ error: 'Session not found or story missing.' }, { status: 404 });
    }

    if (body.jira && story.externalId && Number.isFinite(Number(body.finalEstimate))) {
      await syncEstimateToJira({
        ...body.jira,
        storyPoints: Number(body.finalEstimate),
        estimationComment: `AgilePulse finalized estimate: ${body.finalEstimate}`,
      });
    }

    return NextResponse.json({ story }, { status: 200 });
  } catch (error) {
    console.error('Failed to finalize estimate', error);
    return NextResponse.json({ error: 'Unable to finalize estimate.' }, { status: 500 });
  }
}
