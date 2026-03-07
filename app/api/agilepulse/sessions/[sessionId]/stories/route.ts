import { NextRequest, NextResponse } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

type AddStoryBody = {
  title: string;
  description: string;
  externalId?: string;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const view = agilePulseStore.getSessionView(params.sessionId);

  if (!view) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  return NextResponse.json({ stories: view.stories, activeStory: view.activeStory }, { status: 200 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = (await request.json()) as AddStoryBody;

    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'title and description are required.' }, { status: 400 });
    }

    const story = agilePulseStore.addStory(params.sessionId, {
      title: body.title,
      description: body.description,
      externalId: body.externalId,
    });

    if (!story) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    return NextResponse.json(story, { status: 201 });
  } catch (error) {
    console.error('Failed to add story', error);
    return NextResponse.json({ error: 'Unable to add story.' }, { status: 500 });
  }
}
