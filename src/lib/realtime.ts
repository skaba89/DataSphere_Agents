// Real-time Event System using SSE (Server-Sent Events)
// Provides live updates without polling

export interface RealtimeEvent {
  type: string; // notification, conversation_update, agent_status, presence, typing
  data: Record<string, any>;
  timestamp: number;
}

// In-memory event queues per user (server-side)
const userEventQueues = new Map<string, RealtimeEvent[]>();

// Maximum events to keep per user queue (prevent memory leaks)
const MAX_QUEUE_SIZE = 100;

// For client-side: connect to SSE stream
export function connectRealtime(token: string): EventSource | null {
  if (typeof window === 'undefined' || !token) return null;

  try {
    const es = new EventSource(`/api/realtime?token=${encodeURIComponent(token)}`);
    return es;
  } catch (_e) {
    console.warn('[DataSphere Realtime] Failed to connect to SSE');
    return null;
  }
}

// For server-side: send event to a user
export function pushEventToUser(userId: string, event: RealtimeEvent): void {
  const queue = userEventQueues.get(userId) || [];
  queue.push({
    ...event,
    timestamp: event.timestamp || Date.now(),
  });

  // Trim queue if too large
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  }

  userEventQueues.set(userId, queue);
}

// For server-side: get and clear pending events for a user
export function getPendingEvents(userId: string): RealtimeEvent[] {
  const events = userEventQueues.get(userId) || [];
  userEventQueues.set(userId, []);
  return events;
}

// Helper: push a notification event
export function pushNotification(userId: string, notification: { title: string; message: string; type: string }) {
  pushEventToUser(userId, {
    type: 'notification',
    data: notification,
    timestamp: Date.now(),
  });
}

// Helper: push a conversation update event
export function pushConversationUpdate(userId: string, data: { conversationId: string; action: string; agentId?: string }) {
  pushEventToUser(userId, {
    type: 'conversation_update',
    data,
    timestamp: Date.now(),
  });
}

// Helper: push agent status change
export function pushAgentStatus(userId: string, data: { agentId: string; status: string }) {
  pushEventToUser(userId, {
    type: 'agent_status',
    data,
    timestamp: Date.now(),
  });
}

// Helper: push typing indicator
export function pushTypingIndicator(userId: string, data: { agentId: string; isTyping: boolean }) {
  pushEventToUser(userId, {
    type: 'typing',
    data,
    timestamp: Date.now(),
  });
}

// Helper: push presence update
export function pushPresenceUpdate(userId: string, data: { userId: string; status: string }) {
  pushEventToUser(userId, {
    type: 'presence',
    data,
    timestamp: Date.now(),
  });
}
