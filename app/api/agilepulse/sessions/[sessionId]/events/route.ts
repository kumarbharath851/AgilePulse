import { NextRequest } from 'next/server';
import { agilePulseStore } from '@/lib/agilepulse/session-store';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const encoder = new TextEncoder();

  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        controller.enqueue(encoder.encode('event: connected\ndata: {"ok":true}\n\n'));
      } catch {
        return;
      }

      const unsubscribe = agilePulseStore.subscribe(params.sessionId, (event) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event.eventType}\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          unsubscribe();
        }
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      return cleanup;
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
