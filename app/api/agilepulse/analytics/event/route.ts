import { NextResponse } from 'next/server';
import {
  PinpointClient,
  PutEventsCommand,
  type Event,
} from '@aws-sdk/client-pinpoint';

const pinpoint = new PinpointClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const APP_ID = process.env.PINPOINT_APP_ID ?? '';

export async function POST(request: Request) {
  if (!APP_ID) {
    // Pinpoint not configured — silently succeed so the client never errors out.
    return NextResponse.json({ ok: true });
  }

  try {
    const body = (await request.json()) as {
      eventType: string;
      endpointId: string;
      attributes?: Record<string, string>;
      metrics?: Record<string, number>;
    };

    const { eventType, endpointId, attributes = {}, metrics = {} } = body;
    if (!eventType || !endpointId) {
      return NextResponse.json({ error: 'eventType and endpointId are required' }, { status: 400 });
    }

    const event: Event = {
      EventType: eventType,
      Timestamp: new Date().toISOString(),
      ...(Object.keys(attributes).length > 0 && { Attributes: attributes }),
      ...(Object.keys(metrics).length > 0 && { Metrics: metrics }),
    };

    await pinpoint.send(
      new PutEventsCommand({
        ApplicationId: APP_ID,
        EventsRequest: {
          BatchItem: {
            [endpointId]: {
              Endpoint: {},
              Events: { [eventType]: event },
            },
          },
        },
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Pinpoint] PutEvents failed', err);
    // Return 200 so the client-side fire-and-forget never surfaces errors to users.
    return NextResponse.json({ ok: false });
  }
}
