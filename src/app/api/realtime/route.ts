import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getPendingEvents } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new Response('Missing token', { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return new Response('Invalid token', { status: 401 });
  }

  const userId = payload.userId;

  // Set up SSE response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectEvent = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Heartbeat interval (every 30 seconds)
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (_e) {
          clearInterval(heartbeatInterval);
          clearInterval(pollInterval);
        }
      }, 30000);

      // Poll for pending events every 2 seconds
      const pollInterval = setInterval(() => {
        try {
          const events = getPendingEvents(userId);
          for (const event of events) {
            const sseEvent = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseEvent));
          }
        } catch (_e) {
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
        }
      }, 2000);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        clearInterval(pollInterval);
        try {
          controller.close();
        } catch (_e) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
